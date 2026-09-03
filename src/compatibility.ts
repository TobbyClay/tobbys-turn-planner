export function compatibilityCheck() {
    if (game.modules?.get("terrainmapper")?.active) {
        ui.notifications?.warn(
            "Tobby's Turn Planner is currently incompatible with Terrain Mapper. Using them together will cause issues."
        );
    }
}
