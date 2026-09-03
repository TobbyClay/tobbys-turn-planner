import { regionIndexManager } from "./regionIndexManager";

export function setupRegionIndexBuild() {
    Hooks.on("canvasReady", () => {
        regionIndexManager.rebuild();
    });
}
