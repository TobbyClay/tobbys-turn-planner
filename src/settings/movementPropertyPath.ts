import { MODULE_ID } from "../constants";

export const PATH_WALK = "movementDataPathSetting";
const DEFAULT_MOVEMENT_PATH = "system.attributes.movement.walk";

const defaultPathsWalk = {
    dnd5e: "system.attributes.movement.walk",
    pf2e: "system.attributes.speed.total",
} as const;

export function getDefaultPath(): string {
    const systemId = (game.system?.id ?? "") as keyof typeof defaultPathsWalk;
    return defaultPathsWalk[systemId] ?? DEFAULT_MOVEMENT_PATH;
}

export function registerMovementDataPathSetting() {
    const actorTypes = Actor.implementation.TYPES.filter((t) => t !== "base");

    actorTypes.forEach((a) => {
        //@ts-expect-error untyped;
        game.settings?.register(MODULE_ID, `${PATH_WALK}.${a}`, {
            name: `Movement Property Path (${a})`,
            hint: `Data path to a ${a} actor’s movement property path. Alternatively, enter a number to use that as a flat override for all actors of this type.`,
            scope: "world",
            config: true,
            default: getDefaultPath(),
            type: String,
        });
    });
}

export function getMovementSystemPath(
    actor: Actor.Implementation
): string | number {
    //@ts-expect-error untyped
    const stored = game.settings?.get(MODULE_ID, `${PATH_WALK}.${actor.type}`);

    if (typeof stored === "string" && /^\d+$/.test(stored))
        return Number(stored);

    return typeof stored === "string" && stored.length
        ? stored
        : getDefaultPath();
}
