import { MODULE_ID } from "../constants";

export const AUTO_PATH = "autoPath";

let autoPathOn = false;

export function registerAutoPathSetting() {
    game.keybindings?.register(MODULE_ID, "autoPathKeybind", {
        name: "Auto path toggle",
        hint: "Press this key to toggle auto pathing, which will try to find the shortest path for you.",
        onDown: () => {
            game.settings.set(MODULE_ID, AUTO_PATH, !autoPathOn);
        },
    });

    game.settings?.register(MODULE_ID, AUTO_PATH, {
        name: "Auto-Path Tokens During Movement",
        hint: "If enabled, the pathfinding algorithm will solely search for the best way to get to the final destination, rather than combine previous locations.",
        scope: "client",
        config: true,
        default: false,
        type: Boolean,
        onChange: (value: boolean) => {
            autoPathOn = value;
        },
    });

    autoPathOn = game.settings?.get(MODULE_ID, AUTO_PATH) ?? false;
}

export function isAutoPathEnabled(): boolean {
    return autoPathOn;
}
