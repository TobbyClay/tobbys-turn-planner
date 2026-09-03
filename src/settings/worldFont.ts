import { MODULE_ID } from "../constants";

const DEFAULT_FONT_IMPORT =
    "@import url('https://fonts.googleapis.com/css2?family=Cal+Sans&display=swap');";

const DEFAULT_FONT_FAMILY = "Cal Sans";

export function registerWorldFont() {
    game.settings?.register(MODULE_ID, "fontImport", {
        name: "CSS @import for your font",
        hint: `e.g. "${DEFAULT_FONT_IMPORT}". See the README for more font‐import examples: https://gitlab.com/aeris-fvtt/tobbys-turn-planner#custom-font-setup`,
        scope: "world",
        config: true,
        type: String,
        default: DEFAULT_FONT_IMPORT,
        onChange: () => {
            bakeFont();
        },
    });
    game.settings?.register(MODULE_ID, "fontFamily", {
        name: "Font-Family name",
        hint: "Exactly as in the import URL, e.g. 'Roboto', 'Cal Sans'",
        scope: "world",
        config: true,
        type: String,
        default: DEFAULT_FONT_FAMILY,
        onChange: () => {
            bakeFont();
        },
    });
}

// TODO FIGURE OUT WHY FONT NOT BAKING PROPERLY
export async function bakeFont() {
    if (PIXI.BitmapFont.available["TrailFont"]) {
        PIXI.BitmapFont.uninstall("TrailFont");
    }

    const importRule =
        game.settings?.get(MODULE_ID, "fontImport") || DEFAULT_FONT_IMPORT;
    const match = importRule.match(/url\(['"]([^'"]+)['"]\)/);
    const href = match?.[1] ?? importRule;

    let link = document.getElementById("aeris-font-link") as HTMLLinkElement;
    if (!link) {
        link = document.createElement("link");
        link.id = "aeris-font-link";
        link.rel = "stylesheet";
        document.head.appendChild(link);
    }
    link.href = href;

    const fam =
        game.settings?.get(MODULE_ID, "fontFamily") || DEFAULT_FONT_FAMILY;

    await waitForFont(`64px ${fam}`, 1000);

    PIXI.BitmapFont.from(
        "TrailFont",
        {
            fontFamily: fam,
            fontSize: 64,
            fill: "#ffffff",
        },
        { chars: PIXI.BitmapFont.ASCII }
    );
}

// Poll solution for timing
async function waitForFont(fontSpec: string, timeoutMs = 1000) {
    const interval = 50;
    let elapsed = 0;
    while (elapsed < timeoutMs) {
        const loaded = await document.fonts.load(fontSpec);
        if (loaded.length) return true;
        await new Promise((r) => setTimeout(r, interval));
        elapsed += interval;
    }
    console.warn(`Timeout waiting for font: ${fontSpec}`);
    return false;
}
