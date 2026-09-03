import { Offset } from "../types/canvas";

// Returns which tiles a token occupies. Useful for hex tokens.
export function getOccupiedTiles(
	token: Token,
	pos?: { x?: number; y?: number }
): Offset[] {
	const grid = canvas?.grid!;
	const sizeX = grid.sizeX;
	const sizeY = grid.sizeY;

	const { x: baseX, y: baseY } = token.layer.getSnappedPoint({
		x: pos?.x ?? token.x,
		y: pos?.y ?? token.y,
	});

	let { width, height } = token.bounds;
	width = Math.max(width, sizeX);
	height = Math.max(height, sizeY);

	const minX = baseX - 1,
		minY = baseY - 1;
	const maxX = baseX + width + 1,
		maxY = baseY + height + 1;

	const start = grid.getOffset({ x: minX, y: minY });
	const end = grid.getOffset({ x: maxX, y: maxY });

	const out: Offset[] = [];
	for (let j = start.j; j <= end.j; j++) {
		for (let i = start.i; i <= end.i; i++) {
			const { x, y } = grid.getTopLeftPoint({ j, i });
			if (x >= minX && x + sizeX <= maxX && y >= minY && y + sizeY <= maxY) {
				out.push({ j, i });
			}
		}
	}

	return out;
}

// // getOccupiedTokens requires us to be snapped, so lets offset if it's not
// function getSnappedPixelOffset(token: Token, pos?: { x?: number; y?: number }) {
//     const candidate = { x: pos?.x ?? token.x, y: pos?.y ?? token.y };

//     const { x: snappedX, y: snappedY } = token.getSnappedPosition(candidate);
//     return { x: snappedX - candidate.x, y: snappedY - candidate.y };
// }

export function getTopLeftTile(offsets: Offset[]): Offset {
	const minRow = Math.min(...offsets.map((o) => o.i));
	const topRow = offsets.filter((o) => o.i === minRow);
	const minCol = Math.min(...topRow.map((o) => o.j));
	const offset = topRow.find((o) => o.j === minCol);
	if (!offset) throw new Error("Could not find offset");
	return offset;
}

export function getTopLeftTileFromToken(
	token: Token,
	pos?: { x?: number; y?: number }
): Offset {
	const offsets = getOccupiedTiles(token, pos);
	if (!offsets.length)
		throw new Error(
			`getTopLeftTileFromToken - offsets.length === 0. Used pos: x:${pos?.x} y${pos?.y}`
		);

	return getTopLeftTile(offsets);
}

function getTopLeftTileRelativeCoords(token: Token): { x: number; y: number } {
	const testPos = {
		x: canvas?.grid?.size ?? 200,
		y: canvas?.grid?.size ?? 200,
	};
	const topLeftOffset = getTopLeftTileFromToken(token, testPos);

	const tileTopLeft = canvas?.grid!.getTopLeftPoint(topLeftOffset)!;

	const { x: sDx, y: sDy } = token.getSnappedPosition(testPos);

	return {
		x: (tileTopLeft.x ?? 0) - sDx,
		y: (tileTopLeft.y ?? 0) - sDy,
	};
}

export function getTokenTopLeftFromAnchorOffset(
	token: Token,
	newAnchor: Offset
): { x: number; y: number } {
	const rel = getTopLeftTileRelativeCoords(token);

	const tileTL = canvas?.grid!.getTopLeftPoint(newAnchor)!;

	return {
		x: tileTL.x - rel.x,
		y: tileTL.y - rel.y,
	};
}

export function getTokenCenterFromAnchorOffset(
	token: Token,
	newAnchor: Offset
): { x: number; y: number } {
	const { x: rdx, y: rdy } = getTopLeftTileRelativeCoords(token);
	const { x: ax, y: ay } = canvas!.grid!.getTopLeftPoint(newAnchor);

	const sizeX = canvas!.grid?.sizeX ?? 100;
	const sizeY = canvas!.grid?.sizeY ?? 100;
	const w = Math.max(sizeX, token.w);
	const h = Math.max(sizeY, token.h);

	return {
		x: ax - rdx + w / 2,
		y: ay - rdy + h / 2,
	};
}
