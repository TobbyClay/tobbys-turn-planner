import { wallIndexManager } from "./wallIndexManager";

// TODO FIX LAZY SOLUTION WHERE WALL INDEX ALWAYS BUILT
export function setupCanvasWallBuild() {
    Hooks.on("canvasReady", () => {
        wallIndexManager.rebuild();
    });

    Hooks.on("createWall", (wallDocument: WallDocument) => {
        const wall = wallDocument.object;
        if (wall?.edge) wallIndexManager.updateWall(wall.edge);
    });

    Hooks.on("updateWall", (wallDocument: WallDocument) => {
        const wall = wallDocument.object;
        if (wall?.edge) wallIndexManager.updateWall(wall.edge);
    });

    Hooks.on("deleteWall", (wallDocument: WallDocument) => {
        wallIndexManager.removeWall(wallDocument);
    });
}
