import { LocalSweepPolygon } from "../../localSweepPolygon";
import { AerisToken } from "../../token/aerisToken";
import { log } from "../../utils/logging";

export function benchmarkVisionPolygon(token: AerisToken, count = 50) {
    const original = CONFIG.Canvas.polygonBackends.sight;

    // Helper to time a backend
    function timeBackend(
        name: string,
        backend: typeof LocalSweepPolygon | typeof ClockwiseSweepPolygon
    ) {
        //@ts-expect-error untyped
        CONFIG.Canvas.polygonBackends.sight = backend;
        const start = performance.now();

        for (let i = 0; i < count; i++) {
            token.initializeVisionSource();
        }

        const end = performance.now();
        log(`${name}: ${(end - start).toFixed(2)}ms`);
    }

    const Fast = LocalSweepPolygon;
    const Clockwise = ClockwiseSweepPolygon;

    timeBackend("LocalSweepPolygon", Fast);
    timeBackend("ClockwiseSweepPolygon", Clockwise);

    // Restore original
    CONFIG.Canvas.polygonBackends.sight = original;
}
