import { MODULE_ID } from "../constants";

export const SCALE_JUMP_FACTOR = "scaleJumpFactor";

export function registerScaleJumpFactorSetting() {
    game.settings?.register(MODULE_ID, SCALE_JUMP_FACTOR, {
        name: "Token Jump Scale Factor",
        hint: "Maximum scale factor for token jump and pick up effect. 1 = no change, 1.25 = 25% size increase at peak.",
        scope: "world",
        config: true,
        default: 1.08,
        type: Number,
        range: {
            min: 1.0,
            max: 1.5,
            step: 0.05,
        },
    });
}

export function getScaleJumpFactor(): number {
    return game.settings?.get(MODULE_ID, SCALE_JUMP_FACTOR) ?? 1.08;
}
