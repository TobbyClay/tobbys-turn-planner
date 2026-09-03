import { BaseGrid, HexagonalGrid, SquareGrid } from "../types/canvas";

/**
 * Offset → pixel‑centre using an output object to avoid garbage.
 * @param coords  {i:number, j:number} – offset column/row
 * @param out     {x:number, y:number} – will be overwritten
 * @param grid    HexagonalGrid (defaults to canvas.grid)
 */
export function centerPointInto(
    coords: { i: number; j: number },
    out: { x: number; y: number },
    grid: HexagonalGrid | SquareGrid | BaseGrid
) {
    const { i, j } = coords;
    const { size } = grid;
    let x: number, y: number;

    if ("columns" in grid) {
        if (grid.columns) {
            x = 2 * Math.SQRT1_3 * (0.75 * j + 0.5);
            const even = (j + 1) % 2 === 0;
            y = i + (grid.even === even ? 0 : 0.5);
        } else {
            y = 2 * Math.SQRT1_3 * (0.75 * i + 0.5);
            const even = (i + 1) % 2 === 0;
            x = j + (grid.even === even ? 0 : 0.5);
        }
    } else {
        x = j + 0.5;
        y = i + 0.5;
    }

    out.x = x * size;
    out.y = y * size;
    return out;
}
