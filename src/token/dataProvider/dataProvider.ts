import { callGetMovementModes } from "../../api/getMovementModes";
import { getMovementValue } from "../../utils/movement";

export class MovementDataProvider {
    get(actor: Actor | null): MovementData[] {
        if (!actor) return [];
        const modes = callGetMovementModes(actor) ?? [];
        const use: MovementMode[] = modes.length ? modes : ["walk"];
        const unique = Array.from(new Set(use));
        return unique
            .map((mode) => ({ mode, ranges: getMovementValue(actor, mode) }))
            .filter((x) => x.ranges.length);
    }
}
