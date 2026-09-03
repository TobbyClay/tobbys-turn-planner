import { MODULE_ID } from "../constants";

export const SCOPE_OUT_OF_COMBAT = "moduleFunctionalityScopeOutOfCombat";
export const SCOPE_IN_COMBAT = "moduleFunctionalityScopeInCombat";

export type MovementBehaviour = "Tactics" | "Exploration" | "Disabled";
export type ValidMovementBehaviour = Exclude<MovementBehaviour, "Disabled">;

export function registerMovementBehaviourSetting() {
    game.settings!.register(MODULE_ID, SCOPE_OUT_OF_COMBAT, {
        name: "Out-of-Combat Movement Mode",
        hint: "Choose how token movement behaves outside of combat: 'Tactics' (preview path then move), 'Exploration' (move immediately), or disable entirely.",
        scope: "world",
        config: true,
        default: "Tactics",
        type: String,
        choices: {
            Tactics: "Tactics",
            Exploration: "Exploration",
            Disabled: "Disabled",
        },
    });

    game.settings!.register(MODULE_ID, SCOPE_IN_COMBAT, {
        name: "In-Combat Movement Mode",
        hint: "Choose how token movement behaves during combat: 'Tactics' (preview path then move), 'Exploration' (move immediately), or disable entirely.",
        scope: "world",
        config: true,
        default: "Tactics",
        type: String,
        choices: {
            Tactics: "Tactics",
            Exploration: "Exploration",
            Disabled: "Disabled",
        },
    });
}

export function getMovementBehaviour(): MovementBehaviour {
    const mode: MovementBehaviour = game.combat?.active
        ? game.settings?.get(MODULE_ID, SCOPE_IN_COMBAT) ?? "Tactics"
        : game.settings?.get(MODULE_ID, SCOPE_OUT_OF_COMBAT) ?? "Tactics";
    return mode;
}

export function isModuleFunctional(): boolean {
    const mode = getMovementBehaviour();

    return mode !== "Disabled";
}
