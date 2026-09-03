export function getMovementActionLabel(mode: MovementMode) {
    const action = CONFIG.Token.movement.actions[mode];
    const text = game.i18n?.localize(action.label) ?? "Walk";

    return text;
}
