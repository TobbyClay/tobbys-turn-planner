import { MODULE_ID } from "../constants";

export function callResetMovement(actor: Actor) {
    Hooks.callAll(`${MODULE_ID}.resetMovement`, actor);
}
