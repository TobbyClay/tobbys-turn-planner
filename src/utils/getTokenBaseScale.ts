import { AerisToken } from "../token/aerisToken";

export function getTokenRenderScale(token: AerisToken, fit = "fill") {
	const tex = token.mesh?.texture;
	if (!tex) return { scaleX: 1, scaleY: 1 };
	const gridSize = canvas!.grid?.size ?? 100;

	const textureWidth = tex.width;
	const textureHeight = tex.height;
	const baseWidth = gridSize * (token.document.width ?? 1);
	const baseHeight = gridSize * (token.document.height ?? 1);

	let sx = 1,
		sy = 1;
	switch (fit) {
		case "fill":
			sx = baseWidth / textureWidth;
			sy = baseHeight / textureHeight;
			break;
		case "cover":
			sx = sy = Math.max(baseWidth / textureWidth, baseHeight / textureHeight);
			break;
		case "contain":
			sx = sy = Math.min(baseWidth / textureWidth, baseHeight / textureHeight);
			break;
		case "width":
			sx = sy = baseWidth / textureWidth;
			break;
		case "height":
			sx = sy = baseHeight / textureHeight;
			break;
		default:
			throw new Error(`Invalid fit: ${fit}`);
	}

	const doc = token.document.texture;
	sx *= doc.scaleX ?? 1;
	sy *= doc.scaleY ?? 1;

	return { scaleX: sx, scaleY: sy };
}
