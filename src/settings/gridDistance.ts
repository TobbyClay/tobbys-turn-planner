import { MODULE_ID } from "../constants";

export const ENABLE_DISTANCE_LABEL_TOKEN = "enableDistanceLabelToken";

export function registerEnableDistanceLabelSettings() {
    game.settings?.register(MODULE_ID, ENABLE_DISTANCE_LABEL_TOKEN, {
        name: "Show Distance Labels Above Tokens During Movement",
        hint: "If enabled, a distance indicator will appear above tokens when dragging.",
        scope: "world",
        config: true,
        default: true,
        type: Boolean,
    });
}

export function isDistanceLabelAboveTokenEnabled(): boolean {
    return game.settings?.get(MODULE_ID, ENABLE_DISTANCE_LABEL_TOKEN) ?? true;
}
