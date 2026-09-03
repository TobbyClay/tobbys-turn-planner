import { MODULE_ID } from "../constants";

export function callGetMovementModes(actor: Actor): MovementMode[] {
    const unvalidated: unknown[] = [];
    Hooks.call(`${MODULE_ID}.getMovementModes`, actor, unvalidated);
    return validateMovementModes(unvalidated);
}

let _warnedInvalidModes = false;

function validateMovementModes(input: unknown[]): MovementMode[] {
    const out: MovementMode[] = [];

    for (const entry of input) {
        if (typeof entry === "string" && entry.trim()) {
            out.push(entry.trim() as MovementMode);
        } else if (!_warnedInvalidModes) {
            _warnedInvalidModes = true;
            ui.notifications?.warn(
                `A movement-mode entry was ignored because it wasn't a valid string.`
            );
        }
    }

    return out;
}
