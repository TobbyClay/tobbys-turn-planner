import { MODULE_ID } from "../constants";

export const ENABLE_GRID_PAINTING = "enableGridPainting";

export function registerEnableGridPaintingSetting() {
    game.settings?.register(MODULE_ID, ENABLE_GRID_PAINTING, {
        name: "Enable Grid Painting",
        hint: "If enabled, uses PIXI to paint grids and paths. Disabling may improve performance in complex scenes.",
        scope: "client",
        config: true,
        default: true,
        type: Boolean,
    });
}

export function isGridPaintingEnabled(): boolean {
    return game.settings?.get(MODULE_ID, ENABLE_GRID_PAINTING) === true;
}
