import { PIXI } from "fvtt-types/configuration";
import { HexagonalGrid, Offset } from "../types/canvas";

export function hexLineOffsets(
    a: PIXI.Point,
    b: PIXI.Point,
    grid: HexagonalGrid
): Offset[] {
    const offA = grid.getOffset(a);
    const offB = grid.getOffset(b);

    const cubeA = grid.offsetToCube(offA);
    const cubeB = grid.offsetToCube(offB);

    const N = Math.max(
        Math.abs(cubeA.q - cubeB.q),
        Math.abs(cubeA.r - cubeB.r),
        Math.abs(cubeA.s - cubeB.s)
    );

    const results: Offset[] = [];
    for (let step = 0; step <= N; step++) {
        const t = N === 0 ? 0 : step / N;
        const interp = {
            q: cubeA.q + (cubeB.q - cubeA.q) * t,
            r: cubeA.r + (cubeB.r - cubeA.r) * t,
            s: cubeA.s + (cubeB.s - cubeA.s) * t,
        };
        const rounded = foundry.grid.HexagonalGrid.cubeRound(interp);
        results.push(grid.cubeToOffset(rounded));
    }

    return Array.from(new Set(results.map(({ i, j }) => `${i},${j}`))).map(
        (s) => {
            const [i, j] = s.split(",").map(Number);
            return { i, j };
        }
    );
}

export function getGridIntersections(
    A: PIXI.Point,
    B: PIXI.Point,
    cellSize: number
) {
    const e = 1e-9;

    const dx = B.x - A.x;
    const dy = B.y - A.y;
    const sx = Math.sign(dx) || 1;
    const sy = Math.sign(dy) || 1;

    const x0 = (A.x % cellSize === 0 ? A.x + e * sx : A.x) / cellSize;
    const y0 = (A.y % cellSize === 0 ? A.y + e * sy : A.y) / cellSize;
    const x1 = (B.x % cellSize === 0 ? B.x + e * sx : B.x) / cellSize;
    const y1 = (B.y % cellSize === 0 ? B.y + e * sy : B.y) / cellSize;

    let ix = Math.floor(x0),
        iy = Math.floor(y0);
    const ix1 = Math.floor(x1),
        iy1 = Math.floor(y1);
    const cells = [{ j: ix, i: iy }];

    const stepX = Math.sign(dx) || 1,
        stepY = Math.sign(dy) || 1;
    const tDeltaX = Math.abs(1 / dx),
        tDeltaY = Math.abs(1 / dy);

    let tMaxX =
        (stepX > 0 ? Math.floor(x0) + 1 - x0 : x0 - Math.floor(x0)) * tDeltaX;
    let tMaxY =
        (stepY > 0 ? Math.floor(y0) + 1 - y0 : y0 - Math.floor(y0)) * tDeltaY;

    while (ix !== ix1 || iy !== iy1) {
        if (tMaxX < tMaxY) {
            tMaxX += tDeltaX;
            ix += stepX;
        } else {
            tMaxY += tDeltaY;
            iy += stepY;
        }
        cells.push({ j: ix, i: iy });
    }
    return cells;
}
