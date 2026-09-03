import { ColorConfig } from "../../settings/gridColor";
import { CostOffset } from "../../token/trail/costPath";
import { HexagonalGrid } from "../../types/canvas";
import { LocalPaintData } from "../../types/paint";
import { getFillColorAlpha } from "../../utils/color";
import { getOccupiedTiles, getTopLeftTile } from "../../utils/tiles";
import { relDirs } from "./hexStroke";

export function drawHexTilesLarge(
    _gridSize: number,
    token: Token,
    colorConfig: ColorConfig,
    g: PIXI.Graphics,
    _size: number,
    path: CostOffset[],
    _pathSet: Set<string>,
    ranges: MovementRange[],
    maxRange: number,
    localData?: LocalPaintData
): PIXI.Graphics {
    g.clear();

    const grid = canvas!.grid as HexagonalGrid;

    const shapeCubes = computeShapeCubes(token);
    const { costMap, tileSet } = buildHexCostMap(path, shapeCubes);

    const padding = 0.1;

    const flatTop = !!grid?.columns;

    const size = flatTop ? grid.sizeX : grid.sizeY;

    const fullRadius = size / 2;
    const paddedRadius = ((1 - padding) * size) / 2;

    const hasTile = (x: number, y: number) => tileSet.has(`${x},${y}`);
    const getAngle = (a: number) =>
        (Math.PI / 180) * (60 * a + (flatTop ? 0 : -30));

    function corner(k: number, cx: number, cy: number, radius: number) {
        const θ = getAngle(k);
        return { x: cx + radius * Math.cos(θ), y: cy + radius * Math.sin(θ) };
    }

    const getAdjacents = (
        cx: number,
        cy: number,
        a: number,
        radius: number
    ) => {
        const c = corner(a, cx, cy, radius);
        const cPrev = corner((a + 5) % 6, cx, cy, radius);
        const cNext = corner((a + 1) % 6, cx, cy, radius);
        const cNext2 = corner((a + 2) % 6, cx, cy, radius);

        const cNextOuter = corner((a + 1) % 6, cx, cy, fullRadius);
        const cNext2Outer = corner((a + 2) % 6, cx, cy, fullRadius);
        const cNextEdge = extendAlong(c, cNext, cNextOuter, cNext2Outer)!;

        const cOuter = corner(a, cx, cy, fullRadius);
        const cPrevOuter = corner((a + 5) % 6, cx, cy, fullRadius);

        const cCenterOuterL = extendAlong(c, cNext, cOuter, cPrevOuter)!;
        const cCenterOuterR = extendAlong(cPrev, c, cOuter, cNextOuter)!;

        const cNextOuterL = extendAlong(cNext2, cNext, cOuter, cNextOuter)!;

        return [
            c,
            cPrev,
            cNext,
            cNextEdge,
            cCenterOuterL,
            cCenterOuterR,
            cOuter,
            cNextOuter,
            cNextOuterL,
        ];
    };

    const combinedTiles = localData ? localData.basePaintedTiles : path;
    for (const { j, i } of combinedTiles) {
        const inTrail = hasTile(j, i);
        const key = `${j},${i}`;
        const dist = localData?.previewDistMap?.get(`${j},${i}`) ?? 0;
        const cost = costMap.get(key)?.cost ?? null;
        const validRange = costMap.get(key)?.validRange ?? false;
        const uncapped = localData?.uncapped ?? false;

        const fill = getFillColorAlpha(
            dist,
            cost,
            ranges,
            maxRange,
            colorConfig,
            validRange,
            uncapped
        );

        g.beginFill(fill.rgb, fill.alpha);
        g.lineStyle(0);

        const dirs = relDirs(j, i);

        const { x: cx, y: cy } = canvas!.grid!.getCenterPoint({ i, j });

        for (let a = 0; a < 6; a++) {
            const { j: dj0, i: di0 } = dirs[a];
            const { j: dj1, i: di1 } = dirs[(a + 1) % 6];
            const { j: dj2, i: di2 } = dirs[(a + 2) % 6];

            const hasPrev = hasTile(j + dj0, i + di0);
            const hasNext = hasTile(j + dj1, i + di1);
            const hasSecond = hasTile(j + dj2, i + di2);

            const [
                c,
                _prev,
                next,
                nextEdge,
                cCenterOuterL,
                cCenterOuterR,
                cOuter,
                cNextOuter,
                cNextOuterL,
            ] = getAdjacents(cx, cy, a, paddedRadius);

            if (a === 0) {
                if (!inTrail || (!hasPrev && !hasNext)) g.moveTo(c.x, c.y);
                else if (hasPrev && hasNext) g.moveTo(cOuter.x, cOuter.y);
                else if (!hasPrev && hasNext)
                    g.moveTo(cCenterOuterR.x, cCenterOuterR.y);
                else if (hasPrev && !hasNext)
                    g.moveTo(cCenterOuterL.x, cCenterOuterL.y);
            }

            if (hasPrev && hasNext) {
                if (inTrail && hasSecond) g.lineTo(cNextOuter.x, cNextOuter.y);
                else if (inTrail && !hasSecond)
                    g.lineTo(cNextOuterL.x, cNextOuterL.y);
                else g.lineTo(next.x, next.y);
            } else if (!hasPrev && !hasNext) {
                if (inTrail && hasSecond) g.lineTo(nextEdge.x, nextEdge.y);
                else g.lineTo(next.x, next.y);
            } else if (hasPrev && !hasNext) {
                if (inTrail && hasSecond) g.lineTo(nextEdge.x, nextEdge.y);
                else g.lineTo(next.x, next.y);
            } else if (!hasPrev && hasNext) {
                if (inTrail && hasSecond) g.lineTo(cNextOuter.x, cNextOuter.y);
                else g.lineTo(next.x, next.y);
            }
        }

        g.closePath();
        g.endFill();
    }

    return g;
}

function computeShapeCubes(
    token: Token
): { dq: number; dr: number; ds: number }[] {
    const hexGrid = canvas!.grid as HexagonalGrid;

    const baseOffsets = getOccupiedTiles(token);
    const anchorOffset = getTopLeftTile(baseOffsets)!;
    const anchorCube = hexGrid.offsetToCube(anchorOffset);
    return baseOffsets.map((o) => {
        const c = hexGrid.offsetToCube(o);
        return {
            dq: c.q - anchorCube.q,
            dr: c.r - anchorCube.r,
            ds: c.s - anchorCube.s,
        };
    });
}

function buildHexCostMap(
    trail: CostOffset[],
    shapeCubes: { dq: number; dr: number; ds: number }[]
): { costMap: Map<string, CostOffset>; tileSet: Set<string> } {
    const hexGrid = canvas!.grid as HexagonalGrid;
    const costMap = new Map<string, CostOffset>();

    for (const base of trail) {
        // Walk each cube‐offset of your token’s footprint
        const baseCube = hexGrid.offsetToCube({ j: base.j, i: base.i });
        for (const { dq, dr, ds } of shapeCubes) {
            const cube = {
                q: baseCube.q + dq,
                r: baseCube.r + dr,
                s: baseCube.s + ds,
            };
            const ofs = hexGrid.cubeToOffset(cube);
            const key = `${ofs.j},${ofs.i}`;
            // Store the CostOffset (last write wins)
            costMap.set(key, {
                j: ofs.j,
                i: ofs.i,
                cost: base.cost,
                parity: base.parity,
                mode: base.mode,
                validRange: base.validRange,
            });
        }
    }

    return { costMap, tileSet: new Set(costMap.keys()) };
}

function extendAlong(
    C: { x: number; y: number },
    Cnext: { x: number; y: number },
    CnextOuter: { x: number; y: number },
    Cnext2Outer: { x: number; y: number }
): { x: number; y: number } | null {
    const dx1 = Cnext.x - C.x;
    const dy1 = Cnext.y - C.y;
    const dx2 = Cnext2Outer.x - CnextOuter.x;
    const dy2 = Cnext2Outer.y - CnextOuter.y;

    const denom = dx1 * dy2 - dy1 * dx2;
    if (Math.abs(denom) < 1e-6) return null;

    const rx = CnextOuter.x - C.x;
    const ry = CnextOuter.y - C.y;
    const t = (rx * dy2 - ry * dx2) / denom;
    return {
        x: C.x + t * dx1,
        y: C.y + t * dy1,
    };
}
