import { benchmarkCollisionTest } from "./api/benchmark/benchmarkCollisionTest";
import { benchmarkCostPath } from "./api/benchmark/benchmarkCostPath";
import { quickBenchmarkIsLegalStep } from "./api/benchmark/benchmarkLegalStep";
import { quickBenchmarkNavGridRebuild } from "./api/benchmark/benchmarkNavGridRebuild";
import { benchmarkPerceptionPolygon } from "./api/benchmark/benchmarkPerceptionPolygon";
import { benchmarkLightPolygonComputation } from "./api/benchmark/benchmarkPolygonCreate";
import { quickBenchmarkReachableTiles } from "./api/benchmark/benchmarkReachables";
import { benchmarkVisionPolygon } from "./api/benchmark/benchmarkVisionPolygon";
import { compatibilityCheck } from "./compatibility";
import { LocalSweepPolygon } from "./localSweepPolygon";
import { navGrid } from "./navGrid/navGrid";
import { setupNavGridBuild } from "./navGrid/setup";
import { patchTokenLayer } from "./patches/tokenLayer";
import { openCombatSnapshots, setupCombatSnapshots } from "./planner/combatSnapshots";
import { setupTargetCoverWarnings } from "./planner/targetCoverWarnings";
import { setupTurnPlanner } from "./planner/turnPlanner";
import { regionIndexManager } from "./regionIndex/regionIndexManager";
import { setupRegionIndexBuild } from "./regionIndex/setup";
import { registerSettings } from "./settings/_registerSettings";
import {
    setupWarmGridTravelCacheOnLogin,
    warmGridTravelCache,
} from "./settings/gridSound";
import { bakeFont } from "./settings/worldFont";
import { setupSocket } from "./socket/_socket";
import { MinHeap } from "./structures/minHeap";
import {
    setupTobbysTurnPlannerTokens,
    setupBuildReachablesOnCreateToken,
    setupBuildReachablesOnMovementUpdate,
    setupMovementHistory,
    setupSupressCanvasPanWhileDragging,
    setupTokenHUDResetMovementBtn,
} from "./token/setup";
import { isLegalStep } from "./token/trail/isLegalStep";
import { getRowsCol } from "./utils/rowsCols";
import { getOccupiedTiles } from "./utils/tiles";
import { setupCanvasWallBuild } from "./wallIndex/setup";
import { wallIndexManager } from "./wallIndex/wallIndexManager";

Hooks.once("init", () => {
    patchTokenLayer();
    registerSettings();
    setupTobbysTurnPlannerTokens();
    setupTurnPlanner();
    setupCombatSnapshots();
    setupTargetCoverWarnings();
    setupBuildReachablesOnMovementUpdate();
    setupBuildReachablesOnCreateToken();
    setupCanvasWallBuild();
    setupRegionIndexBuild();
    setupNavGridBuild();
    setupSupressCanvasPanWhileDragging();
    setupTokenHUDResetMovementBtn();
    setupMovementHistory();
    bakeFont();
});

Hooks.on("socketlib.ready", () => {
    setupSocket();
});

Hooks.on("ready", () => {
    // @ts-expect-error untyped
    globalThis.LocalSweepPolygon = LocalSweepPolygon;

    // @ts-expect-error untyped
    globalThis.tobbysTurnPlanner = {
        MinHeap,
        quickBenchmarkIsLegalStep,
        quickBenchmarkReachableTiles,
        benchmarkCollisionTest,
        benchmarkLightPolygonComputation,
        benchmarkVisionPolygon,
        benchmarkPerceptionPolygon,
        benchmarkCostPath,
        quickBenchmarkNavGridRebuild,
        isLegalStep,
        getOccupiedTiles,
        wallIndexManager,
        regionIndexManager,
        navGrid,
        getRowsCol,
        openCombatSnapshots,
    };
});

Hooks.on("ready", () => {
    warmGridTravelCache();
    setupWarmGridTravelCacheOnLogin();
    compatibilityCheck();
});
