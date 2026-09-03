import { VerticalOffset } from "../types/canvas";

export function regionCellOffsets(
	regionDoc: RegionDocument,
	region: Region
): VerticalOffset[] {
	const grid = canvas!.grid;
	if (!grid || grid.isHexagonal) return [];

	const size = grid.size;
	const stepZ = grid.distance;
	const { bottom, top } = regionDoc.elevation as {
		bottom: number;
		top: number;
	};

	const { x: minX, y: minY, width, height } = region.bounds;
	const maxX = minX + width;
	const maxY = minY + height;

	const i0 = Math.floor(minY / size) - 1;
	const i1 = Math.ceil(maxY / size) + 1;
	const j0 = Math.floor(minX / size) - 1;
	const j1 = Math.ceil(maxX / size) + 1;

	const zSlices: number[] = [];
	if (Number.isFinite(bottom) && Number.isFinite(top)) {
		for (let z = bottom; z < top; z += stepZ) zSlices.push(z + stepZ / 2);
	} else {
		zSlices.push(0);
	}

	const hits: VerticalOffset[] = [];

	for (let j = j0; j <= j1; j++) {
		for (let i = i0; i <= i1; i++) {
			for (const k of zSlices) {
				const { x, y } = grid.getCenterPoint({ i, j });
				if ((regionDoc as any).testPoint({ x, y, elevation: k * stepZ })) {
					hits.push({ i, j, k });
				}
			}
		}
	}

	return hits;
}
