import { wallIndexManager } from "./wallIndex/wallIndexManager";

export class LocalSweepPolygon extends foundry.canvas.geometry
	.ClockwiseSweepPolygon {
	protected _identifyEdges(): void {
		const bounds = this.config.boundingBox;
		const edgeTypes = this.config.edgeTypes;

		const grid = canvas!.grid!;
		const isHexagonal = !!grid.isHexagonal;

		let i0: number, i1: number, j0: number, j1: number;
		if (isHexagonal) {
			const topLeft = grid.getOffset({ x: bounds.left, y: bounds.top });
			const bottomRight = grid.getOffset({
				x: bounds.right,
				y: bounds.bottom,
			});
			i0 = Math.min(topLeft.i, bottomRight.i);
			i1 = Math.max(topLeft.i, bottomRight.i);
			j0 = Math.min(topLeft.j, bottomRight.j);
			j1 = Math.max(topLeft.j, bottomRight.j);
		} else {
			const size = grid.size;
			j0 = Math.floor(bounds.left / size);
			j1 = Math.floor(bounds.right / size);
			i0 = Math.floor(bounds.top / size);
			i1 = Math.floor(bounds.bottom / size);
		}

		const wallIndex = wallIndexManager.getIndex();
		const visited = new Set<string>();

		for (let i = i0; i <= i1; i++) {
			const row = wallIndex[i];
			if (!row) continue;
			for (let j = j0; j <= j1; j++) {
				const cell = row[j];
				if (!cell) continue;
				for (const seg of cell) {
					const edge = seg.edge;
					const id = edge.id;
					if (!id || visited.has(id)) continue;
					visited.add(id);
					// We use foundry’s wall logic to filter as normal
					if (this._testEdgeInclusion(edge, edgeTypes)) this.edges.add(edge);
				}
			}
		}
	}
}

export function expandSegmentEndpointsInPlace(
	from: { x: number; y: number },
	to: { x: number; y: number },
	epsilon: number
): void {
	const dx = to.x - from.x;
	const dy = to.y - from.y;
	const length = Math.hypot(dx, dy);

	if (length === 0) return;

	const ux = dx / length;
	const uy = dy / length;

	from.x -= ux * epsilon;
	from.y -= uy * epsilon;
	to.x += ux * epsilon;
	to.y += uy * epsilon;
}
