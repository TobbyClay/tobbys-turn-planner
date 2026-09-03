import { log } from "../../utils/logging";

export function benchmarkLightPolygonComputation(origin: PIXI.Point) {
    const testCount = 100;
    const config = {
        type: "light",
        radius: Number.MAX_SAFE_INTEGER,
        density: 4,
        rotation: 0,
        angle: 360,
        useThreshold: false,
        debug: false,
    };

    const fastStart = performance.now();
    for (let i = 0; i < testCount; i++) {
        //@ts-expect-error globalthis
        const poly = new LocalSweepPolygon();
        poly.initialize(origin, config);
        poly.compute();
    }
    const fastEnd = performance.now();
    log(`LocalSweepPolygon (light): ${fastEnd - fastStart}ms`);

    const clockStart = performance.now();
    for (let i = 0; i < testCount; i++) {
        //@ts-expect-error unprotected
        const poly = new ClockwiseSweepPolygon();
        poly.initialize(origin, config);
        poly.compute();
    }
    const clockEnd = performance.now();
    log(`ClockwiseSweepPolygon (light): ${clockEnd - clockStart}ms`);
}
