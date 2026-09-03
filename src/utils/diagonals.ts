export function useAlternateDiagonalCost(): boolean {
	return (
		(canvas!.grid! as any).diagonals === CONST.GRID_DIAGONALS.ALTERNATING_1 &&
		canvas!.grid!.type === CONST.GRID_TYPES.SQUARE
	);
}
