import { MODULE_ID } from "../constants";

export const TOKEN_MOVE_SPEED = "tokenMoveSpeed";

export function registerTokenMoveSpeedSetting() {
    game.settings?.register(MODULE_ID, TOKEN_MOVE_SPEED, {
        name: "Token Speed",
        hint: "Time (in seconds) a token takes to move one grid square. Lower = faster. Also impacts other animation speeds.",
        scope: "world",
        config: true,
        default: 0.2,
        type: Number,
        range: { min: 0.05, max: 1.0, step: 0.05 },
    });
}

export function getTokenMoveSpeed(): number {
    return game.settings?.get(MODULE_ID, TOKEN_MOVE_SPEED) ?? 0.2;
}
