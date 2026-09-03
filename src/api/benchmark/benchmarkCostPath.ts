import { AerisToken } from "../../token/aerisToken";
import { costPath } from "../../token/trail/costPath";
import { log } from "../../utils/logging";

export function benchmarkCostPath(token: AerisToken, testCount = 1000) {
    const targets = token.pathStateManager.basePaintedTiles;
    if (!targets.length) {
        log("benchmarkCostPath: no reachable tiles to test");
        return;
    }

    const originTile = token.movementPath.first;

    const picks: typeof targets = [];
    for (let i = 0; i < testCount; i++) {
        picks.push(targets[Math.floor(Math.random() * targets.length)]);
    }

    // Warm up JIT
    for (let i = 0; i < 50; i++) {
        costPath(originTile, picks[i % picks.length], token, "walk", false);
    }

    const t0 = performance.now();
    for (const tgt of picks) {
        costPath(originTile, tgt, token, "walk", false);
    }
    const t1 = performance.now();

    const total = (t1 - t0).toFixed(2);
    const avg = ((t1 - t0) / picks.length).toFixed(4);
    log(`costPath ${testCount} runs: ${total}ms total, ${avg}ms avg`);
}
