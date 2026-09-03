import { CellRef } from "../wallIndex/wallIndexManager";
import { navGrid } from "./navGrid";

export function setupNavGridBuild() {
    Hooks.on("wallIndexBuilt", () => {
        navGrid.rebuildNavGrid();
    });

    Hooks.on("wallIndexUpdated", (cells: CellRef[]) => {
        navGrid.updateNavGridForCells(cells);
    });
}
