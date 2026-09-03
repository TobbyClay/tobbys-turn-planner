import { callGetGridTravelSoundOverride } from "../api/getGridTravelSoundOverride";
import { MODULE_ID } from "../constants";
import {
    resolveWildcardMatches,
    syncCacheResolveWildcardMatches,
} from "../utils/resolveWildcard";

export const ENABLE_GRID_SELECT_SOUND = "enableGridSelectSound";
export const GRID_SELECT_SOUND = "gridSelectSound";
export const DEFAULT_GRID_SELECT_AUDIO = "modules/tobbys-turn-planner/assets/menu.ogg";

export const ENABLE_GRID_TRAVEL_SOUND = "enableGridTravelSound";
export const GRID_TRAVEL_SOUND = "gridTravelSound";
export const DEFAULT_GRID_TRAVEL_SOUND_WILDCARD =
    "modules/tobbys-turn-planner/assets/sfx_step_grass_*";

export const DEFAULT_GRID_TRAVEL_SOUND =
    "modules/tobbys-turn-planner/assets/sfx_step_grass_l.ogg";

export function registerGridMovementSoundSetting() {
    game.settings?.register(MODULE_ID, ENABLE_GRID_SELECT_SOUND, {
        name: "Enable Grid Selection Sound",
        hint: "If enabled, a sound will play when selecting a grid destination.",
        scope: "client",
        config: true,
        default: true,
        type: Boolean,
    });

    game.settings?.register(MODULE_ID, GRID_SELECT_SOUND, {
        name: "Grid Selection Sound",
        hint: "Sound played when selecting a grid destination. Choose from the 'modules/tobbys-turn-planner/assets/' folder or select your own.",
        scope: "client",
        config: true,
        default: DEFAULT_GRID_SELECT_AUDIO,
        type: String,
        //@ts-expect-error untyped
        filePicker: true,
    });

    game.settings?.register(MODULE_ID, ENABLE_GRID_TRAVEL_SOUND, {
        name: "Enable Grid Travel Sound",
        hint: "If enabled, a sound will play when a token moves after being dragged.",
        scope: "client",
        config: true,
        default: true,
        type: Boolean,
    });

    game.settings?.register(MODULE_ID, GRID_TRAVEL_SOUND, {
        name: "Grid Travel Sound",
        hint: "Sound played during token movement. Choose from the 'modules/tobbys-turn-planner/assets/' folder or select your own. Can include wildcards like *.ogg.",
        scope: "client",
        config: true,
        default: DEFAULT_GRID_TRAVEL_SOUND_WILDCARD,
        type: String,
        //@ts-expect-error untyped
        filePicker: true,
        onChange: (value: string) => {
            resolveWildcardMatches(value, true);
        },
    });
}

export function warmGridTravelCache() {
    const setting =
        game.settings?.get(MODULE_ID, GRID_TRAVEL_SOUND) ??
        DEFAULT_GRID_TRAVEL_SOUND_WILDCARD;

    if (game.users?.activeGM) resolveWildcardMatches(setting);
}

export function setupWarmGridTravelCacheOnLogin() {
    if (game.user?.isGM) return;
    Hooks.on("userConnected", (user: User, connected: boolean) => {
        if (user.isGM && connected) {
            warmGridTravelCache();
        }
    });
}

export function isGridSelectSoundEnabled(): boolean {
    return (
        game.settings?.storage.get("client")?.[
            `${MODULE_ID}.${ENABLE_GRID_SELECT_SOUND}`
        ] !== "false"
    );
}

export function isGridTravelSoundEnable(): boolean {
    return game.settings?.get(MODULE_ID, ENABLE_GRID_TRAVEL_SOUND) ?? true;
}

export function getGridSelectSound(): string {
    const value =
        game.settings?.storage.get("client")?.[
            `${MODULE_ID}.${GRID_SELECT_SOUND}`
        ];

    return typeof value === "string"
        ? value.replace(/^"(.*)"$/, "$1")
        : DEFAULT_GRID_SELECT_AUDIO;
}

export function getGridTravelSound(
    actor: Actor | null,
    mode: MovementMode,
    index: number
): string {
    if (actor !== null) {
        const override = callGetGridTravelSoundOverride(actor, mode, index);
        if (typeof override === "string") return override;
    }

    const setting =
        game.settings?.get(MODULE_ID, GRID_TRAVEL_SOUND) ??
        DEFAULT_GRID_TRAVEL_SOUND_WILDCARD;

    const result = syncCacheResolveWildcardMatches(setting);

    if (!result || !result.length) return DEFAULT_GRID_TRAVEL_SOUND;

    return index !== undefined
        ? result[index % result.length] ?? DEFAULT_GRID_TRAVEL_SOUND
        : result[Math.floor(Math.random() * result.length)];
}
