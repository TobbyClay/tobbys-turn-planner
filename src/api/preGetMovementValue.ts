import { MODULE_ID } from "../constants";
import { getGridColorConfig } from "../settings/gridColor";

type MovementStylePreset = "available" | "bonus";

interface UnvalidatedMovementRange {
    value?: number;
    rgb?: string | number;
    a?: string | number;
    preset?: MovementStylePreset;
}

export function callPreGetMovementValue(
    actor: Actor,
    mode: MovementMode
): MovementRange[] | null {
    const apiOverride: UnvalidatedMovementRange[] = [];
    Hooks.call(`${MODULE_ID}.preGetMovementValue`, actor, apiOverride, mode);
    const validated = validateOverride(apiOverride);
    if (!validated.length) return null;

    const { available, bonus } = getGridColorConfig();

    const mapped = validated.map((range) => {
        let rgb = range.rgb;
        let a = range.a;

        if (range.preset === "available") {
            rgb = available.rgb;
            a = available.alpha;
        } else if (range.preset === "bonus") {
            rgb = bonus.rgb;
            a = bonus.alpha;
        }

        return {
            value: range.value ?? 0,
            rgb: rgb ?? available.rgb,
            a: a ?? available.alpha,
        };
    });

    return mapped;
}

let _warnedInvalidOverride = false;
function validateOverride(
    input: UnvalidatedMovementRange[]
): (MovementRange & { preset?: MovementStylePreset })[] {
    const out: (MovementRange & { preset?: MovementStylePreset })[] = [];

    for (const entry of input) {
        const { value, rgb, a, preset } = entry;

        // Try to coerce to numbers
        const valNum =
            typeof value === "number"
                ? value
                : typeof value === "string"
                ? parseFloat(value)
                : NaN;

        if (!Number.isFinite(valNum)) continue;

        let rgbNum =
            typeof rgb === "number"
                ? rgb
                : typeof rgb === "string"
                ? parseInt(rgb, 10)
                : NaN;

        let aNum =
            typeof a === "number"
                ? a
                : typeof a === "string"
                ? parseFloat(a)
                : NaN;

        if (preset) {
            const style = resolvePresetStyle(preset);
            rgbNum = style.rgb;
            aNum = style.a;
        }

        if (Number.isFinite(rgbNum) && Number.isFinite(aNum)) {
            out.push({ value: valNum, rgb: rgbNum, a: aNum, preset });
        } else if (!_warnedInvalidOverride) {
            _warnedInvalidOverride = true;
            ui.notifications?.warn(
                "A movement-range override entry was ignored because it lacked a valid {value, rgb, a}. " +
                    `Please supply numeric "value", "rgb" (rgb), and "a" (alpha) fields.`
            );
        }
    }

    return out;
}

const _warnedInvalidPresets = new Set<string>();

function resolvePresetStyle(preset: string | undefined): {
    rgb: number;
    a: number;
} {
    const { available, bonus } = getGridColorConfig();

    switch (preset) {
        case "available":
            return { rgb: available.rgb, a: available.alpha };
        case "bonus":
            return { rgb: bonus.rgb, a: bonus.alpha };
        default:
            if (preset && !_warnedInvalidPresets.has(preset)) {
                _warnedInvalidPresets.add(preset);
                ui.notifications?.warn(
                    `Unknown movement style preset "${preset}". Valid presets are "available" and "bonus".`
                );
            }
            return { rgb: available.rgb, a: available.alpha };
    }
}
