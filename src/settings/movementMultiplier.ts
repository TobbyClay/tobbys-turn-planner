import { MODULE_ID } from "../constants";

let movementModifier = false;

export function registerMovementMultiplier() {
    game.keybindings?.register(MODULE_ID, "movementMultiplierKeybind", {
        name: "Movement multiplier hotkey",
        hint: "Hold this key while dragging a token to temporarily multiply its movement range.",
        onDown: () => (movementModifier = true),
        onUp: () => (movementModifier = false),
    });

    game.settings?.register(MODULE_ID, "movementMultiplier", {
        name: "Movement multiplier",
        hint: "Factor by which movement range is multiplied when the hotkey is held (e.g. 2 = double range).",
        scope: "client",
        config: true,
        default: 2,
        type: Number,
        range: {
            min: 1,
            max: 3,
            step: 1,
        },
    });

    game.settings?.register(MODULE_ID, "baseMovementOverride", {
        name: "Base Movement Override",
        hint: "If > 0, use this value (in grid units) instead of reading from actor data; 0 = disabled.",
        scope: "world",
        config: true,
        type: Number,
        default: 0,
        range: { min: 0, max: 12, step: 1 },
    });
}

export function getMovementMultiplier() {
    if (!movementModifier) return 1;
    return Number(
        game.settings?.storage.get("client")?.[
            "tobbys-turn-planner.movementMultiplier"
        ] ?? "2"
    );
}

export function getBaseMovementOverride() {
    return game.settings?.get(MODULE_ID, "baseMovementOverride") ?? 0;
}
