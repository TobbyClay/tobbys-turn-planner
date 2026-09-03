import { Offset } from "../../types/canvas";

/**
 * Computes the set of tile coordinates representing the **edge cells of the token's current footprint**
 * that are "stepping into" new space when moving from `from` to `to`.
 *
 * This is used when casting rays from the existing footprint into adjacent tiles to test for collisions.
 *
 * For example:
 * - A 2x2 token moving one tile up only casts from its top row.
 * - A 2x2 token moving diagonally casts from the top row and left column.
 *
 * @param from - The token's top-left tile before moving.
 * @param to - The token's top-left tile after moving.
 * @param width - The token's width in grid tiles.
 * @param height - The token's height in grid tiles.
 * @returns An array of TileCoords to cast rays *from*.
 *
 * Time complexity: O(w + h)
 */
export function getEdgeTiles(
    from: Offset,
    to: Offset,
    width: number,
    height: number
): Offset[] {
    if (width === height && width === 1) return [from];

    const dx = to.j - from.j;
    const dy = to.i - from.i;

    const tiles: Offset[] = [];

    const isDiagonal = dx !== 0 && dy !== 0;

    if (dx !== 0) {
        const edgeX = dx > 0 ? from.j + width - 1 : from.j;
        for (let y = from.i; y < from.i + height; y++) {
            tiles.push({ j: edgeX, i: y });
        }
    }

    if (dy !== 0) {
        const edgeY = dy > 0 ? from.i + height - 1 : from.i;
        for (let x = from.j; x < from.j + width; x++) {
            const skipCorner =
                isDiagonal &&
                ((dx > 0 && x === from.j + width - 1) ||
                    (dx < 0 && x === from.j));
            if (!skipCorner) {
                tiles.push({ j: x, i: edgeY });
            }
        }
    }

    return tiles;
}
