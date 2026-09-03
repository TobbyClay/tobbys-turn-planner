import { MODULE_ID } from "../constants";
import { getMovementSystemPath } from "../settings/movementPropertyPath";
import { getGameInterfaceVolume } from "../utils/volume";
import {
    AerisInteractionData,
    AerisToken,
    createAerisTokenClass,
} from "./aerisToken";

export function setupTobbysTurnPlannerTokens() {
    CONFIG.Token.objectClass = createAerisTokenClass(CONFIG.Token.objectClass);
}

export function setupSupressCanvasPanWhileDragging() {
    //@ts-expect-error protected
    const originalPan = foundry.canvas.Canvas.prototype._onDragCanvasPan;

    //@ts-expect-error protected
    foundry.canvas.Canvas.prototype._onDragCanvasPan = function (
        event: Canvas.Event.Pointer<PIXI.Container<PIXI.DisplayObject>>
    ) {
        const interactionData = event.interactionData as AerisInteractionData;

        const dragTarget = interactionData?.targets?.[0];

        if (dragTarget?.isAerisDrag()) return;

        return originalPan.call(this, event);
    };
}

export function setupBuildReachablesOnCreateToken() {
    Hooks.on(
        "createToken",
        (tokenDoc: TokenDocument, _createOptions: Object, _userId: String) => {
            const token = tokenDoc.object as AerisToken | undefined;
            if (!token) return;
            token.pathStateManager.initBaseReach();
        }
    );
}

export function setupBuildReachablesOnMovementUpdate() {
    Hooks.on("updateActor", (actor: Actor, changes: object) => {
        // TODO FIND CURRENT MODE INSTEAD OF PASSING WALK
        const movementPath = getMovementSystemPath(actor);
        const movementChange = foundry.utils.getProperty(changes, movementPath);
        if (movementChange === undefined) return;

        const token = canvas!.tokens?.placeables.find(
            (t) => t.actor === actor
        ) as AerisToken | undefined;
        if (!token) return;

        token.pathStateManager.initBaseReach();
    });
}

export function setupTokenHUDResetMovementBtn() {
    Hooks.on("renderTokenHUD", (hud: TokenHUD, html: HTMLElement | JQuery, _data) => {
        const actor = ((hud as any).object?.actor ?? (hud as any).actor) as Actor | undefined;
        if (!actor?.isOwner) return;
        const value = actor.flags?.["tobbys-turn-planner"]?.distanceMoved ?? 0;
        if (!value) return;

        const root = getHudElement(html);
        if (!root || root.querySelector('[data-action="tobbys-turn-planner-reset-movement"]')) return;

        const button = document.createElement("button");
        button.type = "button";
        button.classList.add("control-icon");
        button.dataset.action = "tobbys-turn-planner-reset-movement";
        button.dataset.tooltip = "Reset Movement";
        button.setAttribute("aria-label", "Reset Movement");
        button.innerHTML = '<i class="fas fa-undo" inert></i>';
        button.addEventListener("click", (event) => {
            event.preventDefault();
            event.stopPropagation();
            game.audio?.play(POP_CLICK_AUDIO, {
                volume: getGameInterfaceVolume(),
            });
            actor.setFlag(MODULE_ID, "distanceMoved", 0);
        });

        insertHudButton(root, button);
    });
}

function getHudElement(html: HTMLElement | JQuery): HTMLElement | null {
    if (html instanceof HTMLElement) return html;
    const maybeJQuery = html as JQuery;
    return maybeJQuery?.[0] instanceof HTMLElement ? maybeJQuery[0] : null;
}

function insertHudButton(root: HTMLElement, button: HTMLButtonElement) {
    const reference =
        root.querySelector('button.control-icon[data-action="sort"]') ??
        root.querySelector("button.control-icon");
    const parent =
        reference?.parentElement ??
        root.querySelector<HTMLElement>(".col.right") ??
        root;

    parent.insertBefore(button, reference ?? parent.firstChild);
}

const POP_CLICK_AUDIO = "modules/tobbys-turn-planner/assets/pop_ui_click.ogg";

export function setupMovementHistory() {
    Hooks.on("combatStart", async (combat: Combat) => {
        if (!game.user?.isGM) return;
        const resets: Promise<void>[] = [];
        combat.combatants.forEach((c) => {
            resets.push(resetCombatantMovement(c));
        });
        await Promise.all(resets);
    });

    Hooks.on("combatTurnChange", async (combat: Combat, prev: Combat.HistoryData) => {
        if (!game.user?.isGM) return;
        const combatantId = prev.combatantId;
        if (!combatantId) return;

        const combatant = combat.combatants.get(combatantId);
        await resetCombatantMovement(combatant);
    });
}

async function resetCombatantMovement(combatant: Combatant | null | undefined): Promise<void> {
    const token = getCombatantToken(combatant);
    await token?.movementBudgetHandler?.reset?.();
}

function getCombatantToken(combatant: Combatant | null | undefined): AerisToken | null {
    const token =
        combatant?.token?.object ??
        (combatant?.tokenId ? canvas?.tokens?.get(combatant.tokenId) : null);

    return token?.movementBudgetHandler ? (token as AerisToken) : null;
}
