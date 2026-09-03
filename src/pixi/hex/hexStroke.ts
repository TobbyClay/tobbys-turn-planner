import { HexagonalGrid, Offset } from "../../types/canvas";
import { CUBE_NEIGHBORS } from "../../utils/directions";

export function drawHexStroke(
	paintedTiles: Offset[],
	paintedSet: Set<string>,
	_gridSize: number,
	color: number,
	alpha: number,
	g: PIXI.Graphics
): PIXI.Graphics {
	g.clear();
	g.lineStyle(3, color, alpha);

	const grid = canvas!.grid as HexagonalGrid;

	const r = 0.1;
	const p = 0.1;

	const flatTop = !!grid?.columns;
	const size = flatTop ? grid.sizeX : grid.sizeY;

	const hasTile = (x: number, y: number) => paintedSet.has(`${x},${y}`);
	const getAngle = (a: number) =>
		(Math.PI / 180) * (60 * a + (flatTop ? 0 : -30));

	const outerRadius = ((1 + p) * size) / 2;
	const innerRadius = ((1 - p) * size) / 2;

	function corner(k: number, cx: number, cy: number, radius: number) {
		const θ = getAngle(k);
		return { x: cx + radius * Math.cos(θ), y: cy + radius * Math.sin(θ) };
	}

	const getAdjacents = (cx: number, cy: number, a: number, radius: number) => {
		const c = corner(a, cx, cy, radius);
		const cPrev = corner((a + 5) % 6, cx, cy, radius);
		const cNext = corner((a + 1) % 6, cx, cy, radius);

		const pCenter = {
			x: c.x + (cPrev.x - c.x) * 0.5,
			y: c.y + (cPrev.y - c.y) * 0.5,
		};

		const pPrev = {
			x: c.x + (cPrev.x - c.x) * r,
			y: c.y + (cPrev.y - c.y) * r,
		};
		const pNext = {
			x: c.x + (cNext.x - c.x) * r,
			y: c.y + (cNext.y - c.y) * r,
		};

		const nextCenter = {
			x: c.x + (cNext.x - c.x) * 0.5,
			y: c.y + (cNext.y - c.y) * 0.5,
		};

		return [c, pPrev, pNext, pCenter, nextCenter];
	};

	for (const { i, j } of paintedTiles) {
		const dirs = relDirs(j, i);
		const { x: cx, y: cy } = canvas!.grid!.getCenterPoint({ i, j });

		for (let a = 0; a < 6; a++) {
			const { j: dj0, i: di0 } = dirs[a];

			const { j: dj1, i: di1 } = dirs[(a + 1) % 6];

			// there are no tiles at the corner - we can draw
			if (!hasTile(j + dj0, i + di0) && !hasTile(j + dj1, i + di1)) {
				const [c, prev, next, pCenter, nextCenter] = getAdjacents(
					cx,
					cy,
					a,
					outerRadius
				);
				g.moveTo(pCenter.x, pCenter.y);
				g.lineTo(prev.x, prev.y);
				g.quadraticCurveTo(c.x, c.y, next.x, next.y);
				g.lineTo(nextCenter.x, nextCenter.y);
			} else if (!hasTile(j + dj0, i + di0) && hasTile(j + dj1, i + di1)) {
				const { x: ncx, y: ncy } = canvas!.grid!.getCenterPoint({
					i: i + di0,
					j: j + dj0,
				});

				const [c, prev, next, pCenter, nextCenter] = getAdjacents(
					ncx,
					ncy,
					(a + 2) % 6,
					innerRadius
				);
				g.moveTo(pCenter.x, pCenter.y);
				g.lineTo(prev.x, prev.y);
				g.quadraticCurveTo(c.x, c.y, next.x, next.y);
				g.lineTo(nextCenter.x, nextCenter.y);
			}
		}
	}

	return g;
}

export function relDirs(j: number, i: number): Offset[] {
	const hexGrid = canvas!.grid as HexagonalGrid;
	const baseCube = hexGrid.offsetToCube({ j, i });
	return CUBE_NEIGHBORS.map(({ dq, dr, ds }) => {
		const nbCube = {
			q: baseCube.q + dq,
			r: baseCube.r + dr,
			s: baseCube.s + ds,
		};
		const abs = hexGrid.cubeToOffset(nbCube);
		return { j: abs.j - j, i: abs.i - i };
	});
}
