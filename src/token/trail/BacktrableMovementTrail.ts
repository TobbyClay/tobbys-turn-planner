import { navGrid } from "../../navGrid/navGrid";
import { regionIndexManager } from "../../regionIndex/regionIndexManager";
import { isAutoPathEnabled } from "../../settings/autoPath";
import { HexagonalGrid, Offset } from "../../types/canvas";
import { centerPointInto } from "../../utils/centerPointInto";
import { useAlternateDiagonalCost } from "../../utils/diagonals";
import { maxMovementRange } from "../../utils/movement";
import { getTopLeftTileFromToken } from "../../utils/tiles";
import { AerisToken } from "../aerisToken";
import { CostOffset, costPath } from "./costPath";
import { isLegalStep } from "./isLegalStep";

export type TileCoord = { x: number; y: number };

export type MovementPathContext = {
    getCurrentAction: () => MovementMode;
    getRangesForMode: (mode: MovementMode) => MovementRange[];
    getPriorTurnCost: () => number;
};

export class MovementPathTracker {
    public _path: CostOffset[] = [];
    private _recentTileIndexMap = new Map<string, number>();
    private _token: AerisToken;
    private uncapped: boolean | null = null;

    get first() {
        return this._path[0];
    }
    get last() {
        return this._path.at(-1);
    }

    constructor(token: AerisToken, private readonly context?: MovementPathContext) {
        this._token = token;
    }

    public update(
        target: Offset,
        mode: MovementMode
    ): CostOffset | false | undefined {
        let last = this._path.at(-1);

        if (!last) return false;
        last = { ...last };

        if (last.j === target.j && last.i === target.i) return false;
        if (!navGrid.getNavCell(target)) return false;

        const path = costPath(
            isAutoPathEnabled() ? this.first : last,
            target,
            this._token,
            mode,
            this.uncapped ?? false,
            this.getRangesForMode(mode)
        );

        if (isAutoPathEnabled()) {
            if (path.length) this._path = path;
        } else {
            for (const step of path) this._update(step);
        }
        if (last.j === this.last?.j && last.i === this.last?.i) return false;
        return this.last;
    }

    private _update(step: CostOffset) {
        const key = `${step.j},${step.i}`;
        const last = this._path.at(-1);
        if (last && last.j === step.j && last.i === step.i) return;

        // backtrack to existing trail if revisiting
        const back = this._recentTileIndexMap.get(key);
        if (back !== undefined && back < this._path.length - 1) {
            this._trailSplice(back + 1);
            return;
        }

        if (canvas!.grid?.type === CONST.GRID_TYPES.SQUARE) {
            // collapse any intermediate tiles that can be merged in one legal move
            const width = this._token.document.width ?? 1;
            const height = this._token.document.height ?? 1;

            while (this._path.length >= 2) {
                const prev = this._path.at(-2)!;
                const dx = step.j - prev.j;
                const dy = step.i - prev.i;
                // only collapse if adjacent
                if (Math.abs(dx) > 1 || Math.abs(dy) > 1) break;

                if (!isLegalStep(prev, { ...step }, width, height)) {
                    break;
                }

                // if legal, drop the last tile
                this._trailPop();
            }
        }

        if (canvas!.grid?.isHexagonal) {
            const width = this._token.document.width ?? 1;
            const height = this._token.document.height ?? 1;
            const worldFrom = { x: 0, y: 0 },
                worldTo = { x: 0, y: 0 };

            const hexGrid = canvas!.grid as HexagonalGrid;
            while (this._path.length >= 2) {
                const prev = this._path.at(-2)!;

                const a = hexGrid.offsetToCube(prev);
                const b = hexGrid.offsetToCube(step);
                const dist = Math.max(
                    Math.abs(a.q - b.q),
                    Math.abs(a.r - b.r),
                    Math.abs(a.s - b.s)
                );
                if (dist !== 1) break;

                centerPointInto(prev, worldFrom, hexGrid);
                centerPointInto(step, worldTo, hexGrid);
                if (!isLegalStep(prev, { ...step }, width, height)) {
                    break;
                }

                this._trailPop();
            }
        }

        // push the single corrected step
        this._trailPush(step);
    }

    private _trailPush(step: CostOffset) {
        const idx = this._path.length;
        this._path.push(step);
        this._touchMap(step, idx);
        if (this._path.length >= 2)
            this._recalcTrail(step.mode, this._path.length - 1);
    }

    private _trailPop(): CostOffset | undefined {
        const removed = this._path.pop();
        if (removed) this._touchMap(removed); // deletes
        const newLast = this._path.at(-1);
        if (newLast) this._touchMap(newLast, this._path.length - 1);
        return removed;
    }

    private _trailSplice(start: number): CostOffset[] {
        const removed = this._path.splice(start);
        for (const r of removed) this._touchMap(r); // deletes
        this._reindexMapFrom(start);
        return removed;
    }

    private _touchMap(tile: Offset, idx?: number) {
        const key = `${tile.j},${tile.i}`;
        if (idx === undefined) this._recentTileIndexMap.delete(key);
        else this._recentTileIndexMap.set(key, idx);
    }

    private _reindexMapFrom(start: number) {
        for (let i = start; i < this._path.length; i++) {
            this._touchMap(this._path[i], i);
        }
    }

    private _recalcTrail(mode: MovementMode, start = 0) {
        const altDiag = useAlternateDiagonalCost();
        const ranges = this.getRangesForMode(mode);
        const max = Math.floor(
            maxMovementRange(ranges) / (canvas!.grid?.distance ?? 1)
        );

        for (let k = start; k < this._path.length; k++) {
            const prev = k
                ? this._path[k - 1]
                : { cost: 0, parity: 0, j: 0, i: 0 };
            const cur = this._path[k];

            const diag =
                Math.abs(cur.j - prev.j) === 1 &&
                Math.abs(cur.i - prev.i) === 1;
            const parity = prev.parity ^ (diag ? 1 : 0);
            let moveCost = 1;
            if (altDiag && diag && parity === 0) moveCost = 2;
            moveCost *= regionIndexManager.getMultiplier(0, cur.i, cur.j, mode);

            cur.parity = parity as 0 | 1;
            cur.cost = prev.cost + moveCost;
            cur.validRange = this.uncapped ? true : cur.cost <= max;
        }
    }

    public reset(context?: { start?: Offset; uncap?: boolean }) {
        const { start, uncap = false } = context ?? {};
        this.uncapped = uncap;

        const origin = start ??
            getTopLeftTileFromToken(this._token) ?? { i: 0, j: 0 };

        this._path = [
            {
                ...origin,
                cost: this.getPriorTurnCost(),
                parity: 0,
                mode: this.getCurrentAction(),
                validRange: true,
            },
        ];
        this._recentTileIndexMap.clear();
        this._recentTileIndexMap.set(`${origin.j},${origin.i}`, 0);
    }

    public getPaintedTiles(): CostOffset[] {
        const seen = new Set<string>();
        return this._path.filter((t) => {
            const k = `${t.j},${t.i}`;
            if (seen.has(k)) return false;
            seen.add(k);
            return true;
        });
    }

    static tileset(tiles: CostOffset[]): Set<string> {
        return new Set(tiles.map((t) => `${t.j},${t.i}`));
    }

    private getCurrentAction(): MovementMode {
        return this.context?.getCurrentAction() ?? this._token.dragActionHandler.currentAction;
    }

    private getRangesForMode(mode: MovementMode): MovementRange[] {
        return this.context?.getRangesForMode(mode) ?? this._token.dragActionHandler.getRangesForMode(mode);
    }

    private getPriorTurnCost(): number {
        return this.context?.getPriorTurnCost() ?? this._token.movementBudgetHandler.priorTurnCost;
    }
}
