import { HexagonalGrid, Offset } from "../types/canvas";
import { CUBE_NEIGHBORS, SQ_DIRS } from "./directions";

export function getNeighborOffsets(j: number, i: number, isHexagonal: boolean) {
	let neighbors: Offset[];

	if (isHexagonal) {
		const hexGrid = canvas!.grid as HexagonalGrid;
		const cube = hexGrid.offsetToCube({
			j,
			i,
		});
		neighbors = CUBE_NEIGHBORS.map(({ dq, dr, ds }) => {
			const nbCube = {
				q: cube.q + dq,
				r: cube.r + dr,
				s: cube.s + ds,
			};
			const tile = hexGrid.cubeToOffset(nbCube);
			return { j: tile.j - j, i: tile.i - i };
		});
	} else {
		neighbors = SQ_DIRS;
	}

	return neighbors;
}
