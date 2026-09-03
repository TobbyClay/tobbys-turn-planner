import { MODULE_ID } from "../constants";

export const ENABLE_MOVEMENT_ENGINE = "enableMovementEngine";

export function registerMovementEngineSetting() {
    game.settings?.register(MODULE_ID, ENABLE_MOVEMENT_ENGINE as any, {
        name: "Enable Tactical Movement Outside Turn Planner",
        hint: "If enabled, tokens can use the Aeris-style movement overlay, path preview, animation, and sounds during normal dragging. Turn planning remains available either way.",
        scope: "world",
        config: true,
        default: true,
        type: Boolean,
    });
}

export function isMovementEngineEnabled(): boolean {
    return (game.settings?.get(MODULE_ID, ENABLE_MOVEMENT_ENGINE as any) as boolean) ?? true;
}
