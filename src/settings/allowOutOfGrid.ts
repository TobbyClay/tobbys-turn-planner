import { MODULE_ID } from "../constants";

export const ALLOW_PATH_BEYOND_RANGE = "allowPathBeyondRange";

export function registerAllowPathBeyondRangeSetting() {
    game.settings?.register(MODULE_ID, ALLOW_PATH_BEYOND_RANGE, {
        name: "Allow Pathing Beyond Movement Range",
        hint: "If enabled, players can drag tokens past their movement range when pathing.",
        scope: "world",
        config: true,
        default: false,
        type: Boolean,
    });
}

export function isPathBeyondRangeAllowed(): boolean {
    return game.settings?.get(MODULE_ID, "allowPathBeyondRange") ?? false;
}
