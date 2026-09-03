import { callResetMovement } from "../../api/resetMovement";
import { MODULE_ID } from "../../constants";
import { isCombatMovementHistoryForTokenEnabled } from "../../settings/movementHistory";
import { AerisToken } from "../aerisToken";

export class MovementBudgetContext {
    get priorTurnCost(): number {
        if (!isCombatMovementHistoryForTokenEnabled(this.token)) return 0;
        return this.token.actor?.flags?.[MODULE_ID]?.distanceMoved ?? 0;
    }

    async set(movement: number) {
        await this.token.actor?.setFlag(MODULE_ID, "distanceMoved", movement);
    }

    async reset() {
        if (!this.token.actor) return;
        await this.token.actor.setFlag(MODULE_ID, "distanceMoved", 0);
        await callResetMovement(this.token.actor);
    }

    constructor(private token: AerisToken) {}
}
