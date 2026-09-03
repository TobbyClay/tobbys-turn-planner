import { MODULE_ID } from "../constants";
import { ColorConfigMenu } from "./colorConfigMenu.js";

export const STROKE_COLOR = "gridStrokeColor";

export const COLOR_MENU = "colorMenu";

export const ACTIVE_PATH_COLOR = "gridActivePathColor";
export const AVAILABLE_TILES_COLOR = "gridAvailableTilesColor";
export const BONUS_TILES_COLOR = "gridBonusTilesColor";
export const INVALID_TILES_COLOR = "gridInvalidTilesColor";
export const UNREACHABLE_TILES_COLOR = "gridUnreachableTilesColor";

export const DEFAULT_ACTIVE_PATH_COLOR = "#99ae5eB3";
export const DEFAULT_AVAILABLE_TILES_COLOR = "#99ae5e4D";
export const DEFAULT_BONUS_AVAILABLE_TILES_COLOR = "#ae835e4D";
export const DEFAULT_INVALID_TILES_COLOR = "#ff00004D";
export const DEFAULT_UNREACHABLE_TILES_COLOR = "#ff000026";

export const DEFAULT_STROKE_COLOR = "#99ae5eFF";

export const ACCENT_COLOR = "gridAccentColor";

export const DEFAULT_ACCENT_COLOR = "#FFFFFFFF";

export const SHOW_OTHERS_PATHS = "showOthersGridPaths";
export const OTHERS_ALPHA_MULTIPLIER = "othersGridAlphaMultiplier";

export const DEFAULT_SHOW_OTHERS_PATHS = true;
export const DEFAULT_OTHERS_ALPHA_MULTIPLIER = 0.5;

export const COLOR_FORMAT = "hexa";

export let colorSettings: string[] = [];

function registerColorPickerSetting(
    key: ClientSettings.KeyFor<typeof MODULE_ID>,
    config: any
) {
    config = {
        ...config,
        scope: "client",
        config: false,
        type: new game.colorPicker!.ColorPickerField({ format: COLOR_FORMAT }),
    };
    game.settings?.register(MODULE_ID, key, config);
    colorSettings.push(key);
}

export function registerGridColorSettings() {
    game.settings?.registerMenu(MODULE_ID, COLOR_MENU, {
        name: "Color Settings",
        hint: "Color settings for the module.",
        label: "Configure Color Settings",
        icon: "fas fa-palette",
        restricted: true,
        type: ColorConfigMenu,
    });

    registerColorPickerSetting(ACTIVE_PATH_COLOR, {
        name: "Grid Fill: Active Path",
        hint: "The fill color used for the currently selected path.",
        default: DEFAULT_ACTIVE_PATH_COLOR,
    });

    registerColorPickerSetting(AVAILABLE_TILES_COLOR, {
        name: "Grid Fill: Reachable Area",
        hint: "The fill color used for reachable tiles that are not on the current path.",
        default: DEFAULT_AVAILABLE_TILES_COLOR,
    });

    registerColorPickerSetting(BONUS_TILES_COLOR, {
        name: "Grid Fill: Bonus Area",
        hint: "The fill color used for bonus reachable tiles added by the movement multiplier key.",
        default: DEFAULT_BONUS_AVAILABLE_TILES_COLOR,
    });

    registerColorPickerSetting(INVALID_TILES_COLOR, {
        name: "Grid Fill: Invalid Area",
        hint: "The fill color used for tiles beyond your movement range.",
        default: DEFAULT_INVALID_TILES_COLOR,
    });

    registerColorPickerSetting(UNREACHABLE_TILES_COLOR, {
        name: "Grid Fill: Unreachable Area",
        hint: "The fill color used for tiles no longer in your movement range.",
        default: DEFAULT_UNREACHABLE_TILES_COLOR,
    });

    registerColorPickerSetting(STROKE_COLOR, {
        name: "Grid Stroke Color",
        hint: "The stroke color used for outlining reachable tiles.",
        default: DEFAULT_STROKE_COLOR,
    });

    registerColorPickerSetting(ACCENT_COLOR, {
        name: "Grid Accent Color",
        hint: "The accent color used for concentric circle highlights.",
        default: DEFAULT_ACCENT_COLOR,
    });

    game.settings?.register(MODULE_ID, SHOW_OTHERS_PATHS, {
        name: "Show Others' Grid Paths",
        hint: "Display the grid path of other users' token movement.",
        scope: "client",
        config: true,
        type: Boolean,
        default: DEFAULT_SHOW_OTHERS_PATHS,
    });

    game.settings?.register(MODULE_ID, OTHERS_ALPHA_MULTIPLIER, {
        name: "Others' Grid Path Alpha Multiplier",
        hint: "Multiply the alpha of others' grid path colors by this value. Default: 0.5",
        scope: "client",
        config: true,
        type: Number,
        range: {
            min: 0,
            max: 1,
            step: 0.05,
        },
        default: DEFAULT_OTHERS_ALPHA_MULTIPLIER,
    });
}

export function colorStringToRGBAlpha(color: string): Color {
    if (color.startsWith("#")) color = color.slice(1);
    const rgb = parseInt(color.slice(0, 6), 16);
    const alpha =
        color.length === 8 ? parseInt(color.slice(6, 8), 16) / 255 : 1;
    return { rgb, alpha };
}

export function rgbIntToRGBA(rgb: number, alpha?: number) {
    const r = ((rgb >> 16) & 0xff) / 255;
    const g = ((rgb >> 8) & 0xff) / 255;
    const b = (rgb & 0xff) / 255;
    const a = alpha ?? 1;
    return new Float32Array([r * a, g * a, b * a, a]);
}

export type Color = {
    rgb: number;
    alpha: number;
};

export type ColorConfig = {
    active: Color;
    available: Color;
    bonus: Color;
    invalid: Color;
    unreachable: Color;
    reticule: Color;
};

export function getGridColorConfig(): ColorConfig {
    const get = (
        key:
            | "gridActivePathColor"
            | "gridAvailableTilesColor"
            | "gridAccentColor"
            | "gridBonusTilesColor"
            | "gridInvalidTilesColor"
            | "gridUnreachableTilesColor",
        fallback: string
    ) => colorStringToRGBAlpha(game.settings?.get(MODULE_ID, key) ?? fallback);

    const active = get(ACTIVE_PATH_COLOR, DEFAULT_ACTIVE_PATH_COLOR);
    const available = get(AVAILABLE_TILES_COLOR, DEFAULT_AVAILABLE_TILES_COLOR);

    const bonus = get(BONUS_TILES_COLOR, DEFAULT_BONUS_AVAILABLE_TILES_COLOR);

    const invalid = get(INVALID_TILES_COLOR, DEFAULT_INVALID_TILES_COLOR);

    const unreachable = get(
        UNREACHABLE_TILES_COLOR,
        DEFAULT_UNREACHABLE_TILES_COLOR
    );

    const reticule = get(ACCENT_COLOR, DEFAULT_ACCENT_COLOR);

    return {
        active,
        available,
        bonus,
        invalid,
        unreachable,
        reticule,
    };
}
