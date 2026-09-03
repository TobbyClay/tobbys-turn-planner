import { MODULE_ID } from "../constants";
import { AerisToken } from "../token/aerisToken";

export const ENABLE_COMBAT_MOVEMENT_HISTORY = "enableCombatMovementHistory";

export function registerEnableCombatMovementHistorySetting() {
    game.settings?.register(MODULE_ID, ENABLE_COMBAT_MOVEMENT_HISTORY, {
        name: "Enable Movement History in Combat",
        hint: "If enabled, total movement during a combat turn is tracked and accumulated across multiple drags. Movement resets at the start of the token's turn or when manually reset with the Token HUD.",
        scope: "world",
        config: true,
        default: false,
        type: Boolean,
    });
}

export function isCombatMovementHistoryEnabled(): boolean {
    return (
        !!game.combat?.active &&
        (game.settings?.get(MODULE_ID, "enableCombatMovementHistory") ?? false)
    );
}

export function isCombatMovementHistoryForTokenEnabled(
    token: AerisToken
): boolean {
    const currentActor = game.combat?.combatant?.actor;
    return token.actor === currentActor && isCombatMovementHistoryEnabled();
}
