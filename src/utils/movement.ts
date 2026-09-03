import { callPreGetMovementValue } from "../api/preGetMovementValue";
import { getGridColorConfig } from "../settings/gridColor";
import {
    getBaseMovementOverride,
    getMovementMultiplier,
} from "../settings/movementMultiplier";
import {
    getDefaultPath,
    getMovementSystemPath,
} from "../settings/movementPropertyPath";

const README_URL = "https://gitlab.com/aeris-fvtt/tobbys-turn-planner#troubleshooting";

// scope here to only warn once per setting
let warnedPath: string | null = null;

export function getMovementValue(
    actor: Actor | null,
    mode: MovementMode
): MovementRange[] {
    if (actor === null) return [];
    const override = callPreGetMovementValue(actor, mode);
    if (override) return override;

    const { available, bonus } = getGridColorConfig();

    const baseOverride = getBaseMovementOverride();
    if (baseOverride)
        return [
            { value: baseOverride, rgb: available.rgb, a: available.alpha },
        ];

    const movementPathSetting = getMovementSystemPath(actor);

    let movementValue: number;

    if (typeof movementPathSetting === "number") {
        movementValue = movementPathSetting;
    } else {
        if (!movementPathSetting.length) return [];

        movementValue = foundry.utils.getProperty(
            actor,
            movementPathSetting
        ) as number;
    }

    if (
        typeof movementValue !== "number" &&
        warnedPath !== movementPathSetting
    ) {
        warnedPath = movementPathSetting as string;
        ui.notifications?.warn(
            `Please select a valid data path for movement for your system's actors, i.e. "${getDefaultPath()}".<br>
                If you need help, please see the <a href="${README_URL}" target="_blank" rel="noopener">
                Troubleshooting section of the README.
            </a>.`
        );
        return [
            {
                value: 6,
                rgb: available.rgb,
                a: available.alpha,
            },
        ];
    }

    const ranges = [
        {
            value: movementValue,
            rgb: available.rgb,
            a: available.alpha,
        },
    ];

    const movementMultiplier = getMovementMultiplier();
    if (movementMultiplier > 1)
        ranges.push({
            value: movementValue * getMovementMultiplier(),
            rgb: bonus.rgb,
            a: bonus.alpha,
        });

    return ranges;
}

export function movementRangesEqual(
    a: MovementRange[],
    b: MovementRange[]
): boolean {
    if (a.length !== b.length) return false;
    return a.every(
        (r, i) => r.value === b[i].value && r.rgb === b[i].rgb && r.a === b[i].a
    );
}

export function maxMovementRange(ranges: MovementRange[]): number {
    if (!ranges.length) return 0;
    return Math.max(...ranges.map((r) => r.value));
}
