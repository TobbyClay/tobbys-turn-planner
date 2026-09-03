import {
	expandSegmentEndpointsInPlace,
	LocalSweepPolygon,
} from "../localSweepPolygon";
import { AerisToken } from "../token/aerisToken";
import { Offset } from "../types/canvas";
import { centerPointInto } from "../utils/centerPointInto";
import { getNeighborOffsets } from "../utils/getNeighbours";
import { getRowsCol } from "../utils/rowsCols";
import { CellRef } from "../wallIndex/wallIndexManager";

export type NavCell = { offset: Offset; connections: Offset[] };

export class NavGrid {
	private _navGrid: NavCell[][] = [];

	getNavGrid(): NavCell[][] {
		return this._navGrid;
	}

	getNavCell(coords: Offset): NavCell | undefined {
		return this._navGrid[coords.i]?.[coords.j];
	}

	private _buildId = 0;

	rebuildNavGrid() {
		const buildId = ++this._buildId;

		const grid = canvas?.grid!;
		const isHexagonal = !!grid.isHexagonal;
		const worldFrom = { x: 0, y: 0 };
		const worldTo = { x: 0, y: 0 };

		const { ROWS, COLS } = getRowsCol();

		const newNavGrid: NavCell[][] = Array.from(
			Array(ROWS),
			() => new Array(COLS)
		);

		for (let i = 0; i < ROWS; ++i) {
			for (let j = 0; j < COLS; ++j) {
				// Early bailout for newer rebuild requests
				if (buildId !== this._buildId) return;

				const current = { i: i, j: j };
				newNavGrid[i][j] = { offset: current, connections: [] };

				const neighbors = getNeighborOffsets(j, i, isHexagonal);

				for (const dir of neighbors) {
					const nx = current.j + dir.j;
					const ny = current.i + dir.i;
					if (nx < 0 || ny < 0 || nx >= COLS || ny >= ROWS) continue;

					centerPointInto(current, worldFrom, grid);

					centerPointInto({ j: nx, i: ny }, worldTo, grid);

					expandSegmentEndpointsInPlace(worldFrom, worldTo, 10);

					const collision = LocalSweepPolygon.testCollision(
						worldFrom,
						worldTo,
						{
							type: "move",
							mode: "any",
							edgeTypes: {
								//@ts-expect-error ts lib error
								wall: { mode: 1, priority: -Infinity },
								//@ts-expect-error ts lib error
								innerBounds: { mode: 2, priority: -Infinity }, // include inner scene bounds
							},
						}
					);

					if (collision) continue;

					newNavGrid[i][j].connections.push({ i: ny, j: nx });
				}
			}
		}

		if (buildId === this._buildId) {
			this._navGrid = newNavGrid;
			this._notify();
		}
	}

	updateNavGridForCells(cells: CellRef[]) {
		// Ensure we have a baseline grid
		if (!this._navGrid.length) this.rebuildNavGrid();

		const grid = canvas!.grid!;
		const isHex = !!grid.isHexagonal;
		const worldFrom = { x: 0, y: 0 };
		const worldTo = { x: 0, y: 0 };

		for (const { row: i, col: j } of cells) {
			const cell = this._navGrid[i]?.[j];
			if (!cell) continue;

			// For each neighbor direction
			for (const d of getNeighborOffsets(j, i, isHex)) {
				const ni = i + d.i,
					nj = j + d.j;

				if (
					ni < 0 ||
					nj < 0 ||
					ni >= this._navGrid.length ||
					nj >= this._navGrid[0].length
				)
					continue;

				centerPointInto(cell.offset, worldFrom, grid);

				centerPointInto({ i: ni, j: nj }, worldTo, grid);

				expandSegmentEndpointsInPlace(worldFrom, worldTo, 10);

				const blocked = LocalSweepPolygon.testCollision(worldFrom, worldTo, {
					type: "move",
					mode: "any",
					edgeTypes: {
						//@ts-expect-error ts lib error
						wall: { mode: 1, priority: -Infinity },
						//@ts-expect-error ts lib error
						innerBounds: { mode: 2, priority: -Infinity }, // include inner scene bounds
					},
				});

				// current cell’s list
				const hasConn = cell.connections.some((o) => o.i === ni && o.j === nj);

				if (!blocked && !hasConn) {
					cell.connections.push({ i: ni, j: nj });
				} else if (blocked && hasConn) {
					cell.connections = cell.connections.filter(
						(o) => o.i !== ni || o.j !== nj
					);
				}

				// mirror on neighbor cell
				const peer = this._navGrid[ni][nj];
				if (!peer) continue;
				const peerHas = peer.connections.some((o) => o.i === i && o.j === j);
				if (!blocked && !peerHas) {
					peer.connections.push({ i, j });
				} else if (blocked && peerHas) {
					peer.connections = peer.connections.filter(
						(o) => o.i !== i || o.j !== j
					);
				}
			}
		}

		this._notify();
	}

	private _notify() {
		canvas?.tokens?.placeables.forEach((t: AerisToken) => {
			t.pathStateManager.initBaseReach();
		});
	}
}

export const navGrid = new NavGrid();
