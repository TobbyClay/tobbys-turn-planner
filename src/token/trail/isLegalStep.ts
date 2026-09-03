import { navGrid } from "../../navGrid/navGrid";
import { HexagonalGrid, Offset } from "../../types/canvas";
import { getEdgeTiles } from "./edgeTiles";

/**
 * Determines whether a token can legally move from one grid position to another.
 *
 * Only the newly entered edge tiles are tested for collision, reducing checks
 * from O(width × height) to O(width + height) for efficiency.
 *
 * Return values:
 * - `true` → the move is legal and unblocked.
 * - `false` → the destination is in bounds but movement is blocked (e.g., by a wall).
 * - `undefined` → the destination is invalid or out of bounds.
 *
 * Optimized to minimize memory allocation:
 * - Reuses shared point objects internally to reduce garbage collection pressure.
 *
 * @param {Object} from - The starting tile offset ({i, j}).
 * @param {Object} to - The target tile offset ({i, j}).
 * @param {number} width - Token width in grid tiles.
 * @param {number} height - Token height in grid tiles.
 * @returns {boolean|undefined} `true` if move is legal, `false` if blocked, `undefined` if out-of-bounds.
 */
export function isLegalStep(
	from: Offset,
	to: Offset,
	width: number,
	height: number
): boolean | undefined {
	const edgeTiles = getEdgeTiles(from, to, Math.ceil(width), Math.ceil(height));

	if (canvas!.grid?.isHexagonal) return isLegalStepHex(from, to, edgeTiles);

	const dx = to.j - from.j;
	const dy = to.i - from.i;

	for (const tile of edgeTiles) {
		const navCell = navGrid.getNavCell(tile);
		if (!navCell) return undefined;
		if (
			!navCell.connections.find((c) => c.i == tile.i + dy && c.j == tile.j + dx)
		) {
			return false;
		}
	}

	return true;
}

export function isLegalStepHex(
	from: Offset,
	to: Offset,
	edgeTiles: Offset[]
): boolean | undefined {
	const grid = canvas!.grid as HexagonalGrid;

	const cubeFrom = grid.offsetToCube({ j: from.j, i: from.i });
	const cubeTo = grid.offsetToCube({ j: to.j, i: to.i });
	const deltaCube = {
		q: cubeTo.q - cubeFrom.q,
		r: cubeTo.r - cubeFrom.r,
		s: cubeTo.s - cubeFrom.s,
	};

	for (const tile of edgeTiles) {
		const navCell = navGrid.getNavCell(tile);
		if (!navCell) return undefined;

		const cubeTile = grid.offsetToCube({ j: tile.j, i: tile.i });
		const neighborCube = {
			q: cubeTile.q + deltaCube.q,
			r: cubeTile.r + deltaCube.r,
			s: cubeTile.s + deltaCube.s,
		};
		const neighborOffset = grid.cubeToOffset(neighborCube);

		const found = navCell.connections.some(
			(c) => c.j === neighborOffset.j && c.i === neighborOffset.i
		);
		if (!found) return false;
	}

	return true;
}
