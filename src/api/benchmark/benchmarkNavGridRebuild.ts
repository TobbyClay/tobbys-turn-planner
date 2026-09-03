import { navGrid } from "../../navGrid/navGrid";
import { log } from "../../utils/logging";

export async function quickBenchmarkNavGridRebuild(testCount = 100) {
    if (!navGrid) {
        log("quickBenchmarkNavGridRebuild: no nav‐grid manager provided");
        return;
    }

    // Warm up JIT & cache any internal state
    log("Warming up JIT and initial grid build...");
    for (let i = 0; i < 5; i++) {
        await navGrid.rebuildNavGrid();
    }

    // Run the actual benchmark
    log(`Running ${testCount} iterations of _rebuildNavGrid()…`);
    const start = performance.now();
    for (let i = 0; i < testCount; i++) {
        await navGrid.rebuildNavGrid();
    }
    const end = performance.now();
    const totalTime = end - start;
    const avgTime = totalTime / testCount;

    log(
        `Performance: ${totalTime.toFixed(2)}ms total, ` +
            `${avgTime.toFixed(4)}ms average per rebuild`
    );

    return {
        totalTime,
        avgTime,
    };
}
