import { LocalSweepPolygon } from "../../localSweepPolygon";
import { AerisToken } from "../../token/aerisToken";
import { log } from "../../utils/logging";

export function benchmarkPerceptionPolygon(token: AerisToken, count = 50) {
    const original = CONFIG.Canvas.polygonBackends.sight;

    function timeBackend(
        name: string,
        backend: typeof LocalSweepPolygon | typeof ClockwiseSweepPolygon
    ) {
        //@ts-expect-error untyped
        CONFIG.Canvas.polygonBackends.sight = backend;
        //@ts-expect-error untyped
        CONFIG.Canvas.polygonBackends.light = backend;

        const start = performance.now();

        for (let i = 0; i < count; i++) {
            token.initializeSources();
        }

        const end = performance.now();
        log(`${name} (initializeSources): ${(end - start).toFixed(2)}ms`);
    }

    const Fast = LocalSweepPolygon;
    const Clockwise = ClockwiseSweepPolygon;

    timeBackend("LocalSweepPolygon", Fast);
    timeBackend("ClockwiseSweepPolygon", Clockwise);

    CONFIG.Canvas.polygonBackends.sight = original;
    CONFIG.Canvas.polygonBackends.light = original;
}
