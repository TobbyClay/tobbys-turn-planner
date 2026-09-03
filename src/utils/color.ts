import { Color, ColorConfig } from "../settings/gridColor";

export function getFillColorAlpha(
    distanceFromCurrentPath: number | null,
    currentCost: number | null,
    ranges: MovementRange[] | undefined,
    _maxRange: number,
    config: ColorConfig,
    validRange: boolean,
    uncapped: boolean
): Color {
    const inCurrentPath = currentCost !== null;
    const unreachableOnPath = distanceFromCurrentPath === null;

    if (inCurrentPath) {
        if (!validRange) {
            return {
                rgb: config.invalid.rgb,
                alpha: config.invalid.alpha,
            };
        } else {
            return {
                rgb: config.active.rgb,
                alpha: config.active.alpha,
            };
        }
    } else if (unreachableOnPath) {
        return {
            rgb: config.unreachable.rgb,
            alpha: config.unreachable.alpha,
        };
    } else {
        if (!ranges?.length) {
            return {
                rgb: config.invalid.rgb,
                alpha: config.invalid.alpha,
            };
        }

        const match = ranges.find((r) => distanceFromCurrentPath <= r.value);

        if (match)
            return {
                rgb: match.rgb as number,
                alpha: match.a,
            };
        else if (uncapped) {
            return ranges[0]
                ? { rgb: ranges[0].rgb, alpha: ranges[0].a }
                : {
                      rgb: config.available.rgb,
                      alpha: config.available.alpha,
                  };
        }

        return {
            rgb: config.invalid.rgb,
            alpha: config.invalid.alpha,
        };
    }
}
