import { AerisToken } from "../../token/aerisToken";
import { log } from "../../utils/logging";

export async function quickBenchmarkReachableTiles(
    token: AerisToken,
    testCount = 100
) {
    if (!token) {
        log("quickBenchmarkReachableTiles: no token provided");
        return;
    }

    // Warm up JIT compiler
    log("Warming up JIT...");
    for (let i = 0; i < 5; i++) {
        token.pathStateManager.initBaseReach({ force: true });
    }

    // Run the actual benchmark
    log(`Running ${testCount} iterations...`);
    const startTime = performance.now();

    for (let i = 0; i < testCount; i++) {
        token.pathStateManager.initBaseReach({ force: true });
    }

    const endTime = performance.now();
    const totalTime = endTime - startTime;
    const avgTime = totalTime / testCount;

    // Count tiles for reference
    const tiles = token.pathStateManager.basePaintedTiles;

    log(`Generated ${tiles?.length || 0} reachable tiles`);
    log(
        `Performance: ${totalTime.toFixed(2)}ms total, ${avgTime.toFixed(
            4
        )}ms average per call`
    );

    return {
        totalTime,
        avgTime,
        tileCount: tiles?.length || 0,
    };
}
