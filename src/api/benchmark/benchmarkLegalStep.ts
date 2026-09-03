import { AerisToken } from "../../token/aerisToken";
import { isLegalStep } from "../../token/trail/isLegalStep";
import { SQ_DIRS } from "../../utils/directions";
import { log } from "../../utils/logging";

export async function quickBenchmarkIsLegalStep(
	token: AerisToken,
	testCount = 10_000
) {
	if (!token) {
		log("quickBenchmarkIsLegalStep: no token provided");
		return;
	}

	const gridSize = canvas!.grid?.size ?? 100;
	const w = token.document.width ?? 1;
	const h = token.document.height ?? 1;

	const from = {
		j: Math.floor(token.document.x / gridSize),
		i: Math.floor(token.document.y / gridSize),
	};

	// Warm‑up JIT
	for (let i = 0; i < SQ_DIRS.length; i++) {
		const d = SQ_DIRS[i];
		isLegalStep(from, { j: from.j + d.j, i: from.i + d.i }, w, h);
	}

	log(`Running ${testCount} isLegalStep calls…`);
	const t0 = performance.now();

	for (let i = 0; i < testCount; i++) {
		const d = SQ_DIRS[i & 7];
		isLegalStep(from, { j: from.j + d.j, i: from.i + d.i }, w, h);
	}

	const total = performance.now() - t0;
	const average = total / testCount;

	log(
		`isLegalStep: ${total.toFixed(2)} ms total, ${average.toFixed(
			4
		)} ms per call`
	);
	return { totalTime: total, avgTime: average };
}
