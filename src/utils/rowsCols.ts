import { HexagonalGrid } from "../types/canvas";

export function getRowsCol() {
	const isHexagonal = !!canvas?.grid?.isHexagonal;
	const gridWidth = canvas?.grid?.sizeX ?? 100;
	const gridHeight = canvas?.grid?.sizeY ?? 100;

	const sceneWpx = canvas?.dimensions?.width ?? 3000;
	const sceneHpx = canvas?.dimensions?.height ?? 3000;

	const { columns: hasColumns } = canvas?.grid as HexagonalGrid;
	const SQUEEZE = 0.75;

	const xFactor = isHexagonal && hasColumns ? SQUEEZE : 1;
	const yFactor = isHexagonal && !hasColumns ? SQUEEZE : 1;

	const COLS = Math.ceil(sceneWpx / (gridWidth * xFactor));
	const ROWS = Math.ceil(sceneHpx / (gridHeight * yFactor));

	return { COLS, ROWS };
}
