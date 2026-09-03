import { MODULE_ID } from "../constants";

const UNCAP_EXPLORATION = "uncapExploration";

export function registerUncapExplorationSetting() {
    game.settings?.register(MODULE_ID, UNCAP_EXPLORATION, {
        name: "Uncapped Movement in Exploration Mode",
        hint: "Allows tokens to move unlimited distances while dragging in Exploration mode (ignores movement ranges). This has no effect in Tactics mode or during combat if combat mode is not set to Exploration.",
        scope: "world",
        config: true,
        default: true,
        type: Boolean,
    });
}

export function isExplorationUncapped(): boolean {
    return game.settings?.get(MODULE_ID, UNCAP_EXPLORATION) ?? true;
}
