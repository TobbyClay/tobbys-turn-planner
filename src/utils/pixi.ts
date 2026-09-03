export function getDeltaSeconds(): number {
	return (canvas?.app?.ticker.deltaMS ?? 16.666) * 0.001;
}
