import { LocalSweepPolygon } from "../../localSweepPolygon";
import { AerisToken } from "../../token/aerisToken";
import { log } from "../../utils/logging";

export function benchmarkCollisionTest(
	_token: AerisToken,
	testCount = 10000,
	distance = Number.MAX_SAFE_INTEGER
) {
	const sourcePoint = _token.center;

	// Use shared random rays
	const rays: { to: PIXI.Point }[] = [];
	for (let i = 0; i < testCount; i++) {
		const angle = Math.random() * Math.PI * 2;
		const dx = Math.cos(angle) * distance;
		const dy = Math.sin(angle) * distance;
		const to = new PIXI.Point(sourcePoint.x + dx, sourcePoint.y + dy);
		rays.push({ to });
	}

	function runTest(
		name: string,
		PolygonClass: typeof LocalSweepPolygon | typeof ClockwiseSweepPolygon
	) {
		const start = performance.now();
		let hits = 0;

		for (const { to } of rays) {
			if (
				PolygonClass.testCollision(sourcePoint, to, {
					type: "move",
					mode: "any",
					edgeTypes: {
						//@ts-expect-error ts lib error
						wall: { mode: 1, priority: -Infinity },
						//@ts-expect-error ts lib error
						innerBounds: { mode: 2, priority: -Infinity }, // include inner scene bounds
					},
				})
			) {
				hits++;
			}
		}

		const end = performance.now();
		log(`${name}: ${(end - start).toFixed(2)}ms, hits: ${hits}`);
	}

	function runTokenCheck() {
		const start = performance.now();
		let hits = 0;

		for (const { to } of rays) {
			if (
				_token.checkCollision(to, {
					type: "move",
					mode: "any",
					origin: sourcePoint,
				})
			) {
				hits++;
			}
		}

		const end = performance.now();
		log(`_token.checkCollision: ${(end - start).toFixed(2)}ms, hits: ${hits}`);
	}

	runTest("LocalSweepPolygon", LocalSweepPolygon);
	runTest("ClockwiseSweepPolygon", ClockwiseSweepPolygon);
	runTokenCheck();
}
