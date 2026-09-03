import { regionIndexManager } from "../../regionIndex/regionIndexManager";
import {
    getMovementBehaviour,
    ValidMovementBehaviour,
} from "../../settings/enableGrid";
import { isExplorationUncapped } from "../../settings/uncapExploration";
import { MinHeap } from "../../structures/minHeap";
import { HexagonalGrid, Offset } from "../../types/canvas";
import { useAlternateDiagonalCost } from "../../utils/diagonals";
import { getNeighborOffsets } from "../../utils/getNeighbours";
import { movementRangesEqual } from "../../utils/movement";
import { getRowsCol } from "../../utils/rowsCols";
import {
    getOccupiedTiles,
    getTopLeftTile,
    getTopLeftTileFromToken,
} from "../../utils/tiles";
import { AerisToken } from "../aerisToken";
import { CostOffset } from "../trail/costPath";
import { isLegalStep } from "../trail/isLegalStep";

let maxDistanceWarned = false;

class ReachData {
    anchor?: Offset;

    /** Raw Dijkstra results: top-left token positions */
    tiles: Offset[] = [];
    tileKeys = new Set<string>();
    distances = new Map<string, number>();

    /** Token footprint */
    paintedTiles: Offset[] = [];
    paintedKeys = new Set<string>();
    usedMovement: number = 0;

    clear() {
        this.tiles.length = 0;
        this.tileKeys.clear();
        this.distances.clear();
        this.paintedTiles.length = 0;
        this.paintedKeys.clear();
        this.usedMovement = 0;
    }

    isAnchorValid(newAnchor: Offset): boolean {
        return this.anchor?.j === newAnchor.j && this.anchor.i === newAnchor?.i;
    }
}

type TokenPathContext = {
    getCurrentAction: () => MovementMode;
    getRangesForMode: (mode: MovementMode) => MovementRange[];
    getMaxMovementData: () => MovementData | null;
};

export class TokenPathStateManager {
    constructor(private token: AerisToken, private readonly context?: TokenPathContext) {}

    private _baseReach: ReachData = new ReachData();
    private _pathPreview: ReachData = new ReachData();
    cachedMovementData: MovementData | null = null;
    cachedUncapped: boolean | null = null;

    public get basePaintedTiles(): Offset[] {
        return this._baseReach.paintedTiles;
    }

    public get basePaintedKeys(): Set<string> {
        return this._baseReach.paintedKeys;
    }

    public get baseReachableTiles(): Offset[] {
        return this._baseReach.tiles;
    }

    public get baseReachableKeys(): Set<string> {
        return this._baseReach.tileKeys;
    }

    public get pathPaintedTiles(): Offset[] {
        return this._pathPreview.tiles;
    }

    public get PathPaintedKeys(): Set<string> {
        return this._pathPreview.tileKeys;
    }

    public get pathDistanceMap(): Map<string, number> {
        return this._pathPreview.distances;
    }

    private movementDataHasChanged(data: MovementData): boolean {
        return (
            !this.cachedMovementData ||
            data.mode !== this.cachedMovementData.mode ||
            !movementRangesEqual(data.ranges, this.cachedMovementData.ranges)
        );
    }

    private cappedHasChanged(uncapped: boolean): boolean {
        return uncapped !== this.cachedUncapped;
    }

    private getCurrentMovementData(): MovementData {
        const mode = this.context?.getCurrentAction() ?? this.token.dragActionHandler.currentAction ?? "walk";
        const ranges = this.context?.getRangesForMode(mode) ?? this.token.dragActionHandler.getRangesForMode(mode);
        return { mode, ranges };
    }

    public async initBaseReach(context?: {
        currentTile?: Offset;
        force?: boolean;
        behaviour?: ValidMovementBehaviour;
        uncap?: boolean;
        mode?: MovementMode;
    }) {
        let { currentTile, force, behaviour, uncap, mode } = context ?? {};
        currentTile ??=
            this.token.queuedPositionOffset ??
            getTopLeftTileFromToken(this.token);

        const movementData: MovementData =
            this.context?.getMaxMovementData() ??
            this.token.dragActionHandler.getMaxMovementData() ??
            this.getCurrentMovementData();

        behaviour ??= getMovementBehaviour() as ValidMovementBehaviour;
        uncap ??= behaviour === "Exploration" && isExplorationUncapped();
        mode ??= movementData.mode;

        const cacheIsValid =
            !this.movementDataHasChanged(movementData) &&
            this._baseReach.isAnchorValid(currentTile) &&
            !this.cappedHasChanged(uncap) &&
            !force;

        if (cacheIsValid) return;

        await this.buildTileCache(this._baseReach, {
            currentTile,
            movementData,
            uncap,
            mode,
        });
    }

    public async updatePathReach(context: {
        currentTile: CostOffset;
        usedMovement: number;
        behaviour?: ValidMovementBehaviour;
        uncap?: boolean;
        mode?: MovementMode;
    }) {
        let { currentTile, usedMovement, behaviour, uncap, mode } = context;
        const movementData = this.getCurrentMovementData();

        behaviour ??= getMovementBehaviour() as ValidMovementBehaviour;
        uncap ??= behaviour === "Exploration" && isExplorationUncapped();
        mode ??= this.context?.getCurrentAction() ?? this.token.dragActionHandler.currentAction;

        const cacheIsValid =
            !this.movementDataHasChanged(movementData) &&
            this._pathPreview.isAnchorValid(currentTile) &&
            this.cappedHasChanged(uncap);

        if (cacheIsValid) return;

        await this.buildTileCache(this._pathPreview, {
            currentTile,
            usedMovement,
            parity: currentTile.parity,
            movementData,
            uncap,
            mode,
        });
    }

    private async buildTileCache(
        cache: ReachData,
        options: {
            usedMovement?: number;
            currentTile: Offset | CostOffset;
            parity?: number;
            considerPreviousMovement?: boolean;
            movementData: MovementData;
            uncap: boolean;
            mode: MovementMode;
        }
    ) {
        if (!this.token.isOwner) return;

        cache.clear();

        this.cachedMovementData = options.movementData;
        this.cachedUncapped = options.uncap;

        this._computeReach(cache, this.cachedMovementData.ranges, options);

        this.expandForPainting(
            cache.tiles,
            cache.paintedKeys,
            cache.paintedTiles
        );
    }

    private expandForPainting(
        tiles: Offset[],
        paintedKeys: Set<string>,
        paintedTiles: Offset[],
        changes?: { x?: number; y?: number }
    ) {
        const baseOffsets = getOccupiedTiles(this.token, changes);
        const anchorOffset = getTopLeftTile(baseOffsets);

        if (canvas!.grid?.isSquare) {
            const shape = baseOffsets.map((o) => ({
                j: o.j - anchorOffset.j,
                i: o.i - anchorOffset.i,
            }));
            for (const { j, i } of tiles) {
                for (const rel of shape) {
                    const px = j + rel.j;
                    const py = i + rel.i;
                    const key = `${px},${py}`;
                    if (!paintedKeys.has(key)) {
                        paintedKeys.add(key);
                        paintedTiles.push({ j: px, i: py });
                    }
                }
            }
        } else if (canvas!.grid?.isHexagonal) {
            const hexGrid = canvas!.grid as HexagonalGrid;
            const anchorCube = hexGrid.offsetToCube(anchorOffset);
            const shapeCubes = baseOffsets.map((o) => {
                const cube = hexGrid.offsetToCube(o);
                return {
                    dq: cube.q - anchorCube.q,
                    dr: cube.r - anchorCube.r,
                    ds: cube.s - anchorCube.s,
                };
            });

            for (const { j, i } of tiles) {
                const testCube = hexGrid.offsetToCube({ j, i });
                for (const { dq, dr, ds } of shapeCubes) {
                    const cube = {
                        q: testCube.q + dq,
                        r: testCube.r + dr,
                        s: testCube.s + ds,
                    };
                    const tile = hexGrid.cubeToOffset(cube);
                    const key = `${tile.j},${tile.i}`;

                    if (!paintedKeys.has(key)) {
                        paintedKeys.add(key);
                        paintedTiles.push(tile);
                    }
                }
            }
        }
    }

    _reached: Uint8Array | undefined;
    _cols = 0;
    _rows = 0;

    ensureReached(rows: number, cols: number) {
        const needed = rows * cols;
        if (!this._reached || this._reached.length < needed) {
            this._reached = new Uint8Array(needed);
            this._rows = rows;
            this._cols = cols;
        } else if (rows !== this._rows || cols !== this._cols) {
            this._rows = rows;
            this._cols = cols;
        }
        this._reached.fill(0);
        return this._reached;
    }

    _cost: Float32Array | undefined;
    _costRows = 0;
    _costCols = 0;

    ensureCost(rows: number, cols: number) {
        const needed = rows * cols * 2; // even / odd parity
        if (!this._cost || this._cost.length < needed) {
            this._cost = new Float32Array(needed);
        }
        const INF = Number.POSITIVE_INFINITY;
        this._cost.fill(INF);
        this._costRows = rows;
        this._costCols = cols;
        return this._cost;
    }

    _computeReach(
        cache: ReachData,
        movementRanges: MovementRange[],
        options: {
            changes?: { x?: number; y?: number };
            usedMovement?: number;
            currentTile: Offset;
            parity?: number;
            considerPreviousMovement?: boolean;
            movementData: MovementData;
            uncap: boolean;
            mode: MovementMode;
        }
    ): void {
        if (!this.token.actor) return;

        const isHexagonal = !!canvas!.grid?.isHexagonal;

        const { ROWS, COLS } = getRowsCol();

        const baseIdx = (x: number, y: number) => y * COLS + x;

        const reached = this.ensureReached(ROWS, COLS);
        const cost = this.ensureCost(ROWS, COLS);

        const costIdx = (x: number, y: number, parity: number) =>
            (baseIdx(x, y) << 1) | parity;

        let maxRange: number;

        if (options.uncap) {
            maxRange = 24;
        } else {
            maxRange = movementRanges.length
                ? Math.max(...movementRanges.map((r) => r.value))
                : 0;

            maxRange = Math.floor(maxRange / (canvas!.grid?.distance ?? 1));

            if (options?.usedMovement) maxRange -= options.usedMovement;

            if (maxRange > 24 && !maxDistanceWarned) {
                ui.notifications?.warn(
                    `Path‑preview limited to 24 tiles to avoid a very large grid (` +
                        `${maxRange.toFixed(1)} tiles requested).`
                );
                maxDistanceWarned = true;
            }

            maxRange = Math.min(24, maxRange);
        }

        cache.anchor = options.currentTile;
        const { j: originX, i: originY } = cache.anchor;

        const width = this.token.document.width ?? 1;
        const height = this.token.document.height ?? 1;

        type Node = { j: number; i: number; cost: number; diag: number };

        const open = new MinHeap<Node>((a, b) => {
            if (a.cost !== b.cost) return a.cost - b.cost; // primary key
            return a.diag - b.diag; // cheap tie‑break
        });

        open.push({
            j: originX,
            i: originY,
            cost: 0,
            diag: options.parity ?? 0,
        });
        cost[costIdx(originX, originY, 0)] = 0;

        const useAlternateDiagCost = useAlternateDiagonalCost();

        while (!open.isEmpty()) {
            const current = open.pop()!;

            if (current.cost > maxRange) continue;

            const parity = isHexagonal ? 0 : current.diag & 1;

            if (current.cost > cost[costIdx(current.j, current.i, parity)])
                continue;

            const tileI = baseIdx(current.j, current.i);
            if (!reached[tileI]) {
                reached[tileI] = 1;
                cache.tiles.push({ j: current.j, i: current.i });
                cache.distances.set(`${current.j},${current.i}`, current.cost);
            }

            const neighbors = getNeighborOffsets(
                current.j,
                current.i,
                isHexagonal
            );

            for (const dir of neighbors) {
                const nx = current.j + dir.j;
                const ny = current.i + dir.i;
                if (nx < 0 || ny < 0 || nx >= COLS || ny >= ROWS) continue;

                const isDiagonal = !isHexagonal && dir.j !== 0 && dir.i !== 0;
                const newDiagCount = current.diag + (isDiagonal ? 1 : 0);

                const terrainMult = regionIndexManager.getMultiplier(
                    0,
                    ny,
                    nx,
                    options.mode
                );

                let moveCost = 1;
                if (
                    isDiagonal &&
                    useAlternateDiagCost &&
                    newDiagCount % 2 === 0
                ) {
                    moveCost = 2;
                }

                moveCost *= terrainMult;

                const totalCost = current.cost + moveCost;
                if (totalCost > maxRange) continue;

                const newParity = newDiagCount & 1;
                const nIdx = costIdx(nx, ny, newParity);
                if (totalCost >= cost[nIdx]) continue;

                const legal = isLegalStep(
                    current,
                    { j: nx, i: ny },
                    width,
                    height
                );
                if (!legal) continue;

                cost[nIdx] = totalCost;

                open.push({
                    j: nx,
                    i: ny,
                    cost: totalCost,
                    diag: newDiagCount,
                });
            }
        }

        cache.tiles.forEach((t) => {
            if (!cache.tileKeys.has(`${t.j},${t.i}`))
                cache.tileKeys.add(`${t.j},${t.i}`);
        });
    }
}
