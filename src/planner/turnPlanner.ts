import { MODULE_ID } from "../constants";
import { getMovementBehaviour, ValidMovementBehaviour } from "../settings/enableGrid";
import {
    isTurnPlannerEnabled,
    PLANNED_TURNS,
    getTemplateExecutionMode,
} from "../settings/turnPlanner";
import type { TemplateExecutionMode } from "../settings/turnPlanner";
import { AerisToken } from "../token/aerisToken";
import { MovementDataProvider } from "../token/dataProvider/dataProvider";
import { Offset } from "../types/canvas";
import { getTopLeftTileFromToken } from "../utils/tiles";
import { maxMovementRange } from "../utils/movement";
import { getPlannerActions } from "./actionCatalog";
import { getAverageDamagePreview } from "./averageDamage";
import { hasActiveEncounter } from "./combatScope";
import { coverEffect, coverLabel } from "./coverRules";
import { getCoverPreviewFromPosition } from "./localCover";
import { setActivePlanningToken } from "./planningState";
import { PlannerOverlay } from "./plannerOverlay";
import { TokenPathStateManager } from "../token/pathfinding/tokenPathfinder";
import { MovementPathTracker } from "../token/trail/BacktrableMovementTrail";
import {
    CoverPreview,
    DamagePreview,
    PlannedAction,
    PlannedTemplate,
    PlannedTurn,
    PlannerActionOption,
} from "./types";

type PlannerPhase = "movement" | "action" | "template";
type ActionSlot = "action" | "bonus";

const { ApplicationV2, DialogV2 } = foundry.applications.api as any;

class TurnPlannerApplication extends ApplicationV2 {
    static DEFAULT_OPTIONS = {
        id: "tobbys-turn-planner-window",
        classes: ["tobbys-turn-planner", "ttp-planner-window"],
        tag: "section",
        position: {
            width: 390,
            height: 560,
        },
        window: {
            title: "Tobby's Turn Planner",
            icon: "fa-solid fa-route",
            resizable: true,
            contentClasses: ["ttp-planner-window-content"],
        },
    };

    constructor(private readonly controller: TurnPlannerController) {
        super();
    }

    protected async _renderHTML(_context: object, _options: object): Promise<HTMLElement> {
        const root = document.createElement("div");
        root.className = "ttp-planner-root";
        root.innerHTML = this.controller.renderContent();
        return root;
    }

    protected _replaceHTML(result: HTMLElement, content: HTMLElement, _options: object): void {
        content.replaceChildren(result);
        this.controller.activateListeners(content);
    }

    async close(options?: object): Promise<this> {
        await super.close(options);
        this.controller.onPlannerWindowClosed(this);
        return this;
    }
}

class TurnPlannerController {
    private token: AerisToken | null = null;
    private overlay = new PlannerOverlay();
    private app: TurnPlannerApplication | null = null;
    private movementPath: MovementPathTracker | null = null;
    private pathStateManager: TokenPathStateManager | null = null;
    private movementData: MovementData[] = [];
    private movementMode: MovementMode = "walk";
    private phase: PlannerPhase = "movement";
    private destinationOffset: Offset | null = null;
    private activeSlot: ActionSlot = "action";
    private selectedAction: PlannerActionOption | null = null;
    private selectedBonusAction: PlannerActionOption | null = null;
    private damagePreview: DamagePreview | null = null;
    private bonusDamagePreview: DamagePreview | null = null;
    private coverPreview: CoverPreview[] = [];
    private plannedTemplate: PlannedTemplate | null = null;
    private plannedBonusTemplate: PlannedTemplate | null = null;
    private readonly provider = new MovementDataProvider();

    private readonly onMove = (event: PIXI.FederatedEvent) => this.handleMove(event);
    private readonly onClick = (event: PIXI.FederatedEvent) => this.handleClick(event);
    private readonly onWheel = (event: WheelEvent) => this.handleWheel(event);
    private readonly onContext = (event: MouseEvent) => {
        event.preventDefault();
        this.cancel();
    };

    async start(token: AerisToken) {
        if (!isTurnPlannerEnabled()) return;
        if (!hasActiveEncounter()) {
            ui.notifications?.warn("Tobby's Turn Planner is only available during an active encounter.");
            return;
        }
        if (!token.actor) {
            ui.notifications?.warn("Tobby's Turn Planner requires a token with an actor.");
            return;
        }

        this.cancel(false);
        this.token = token;
        setActivePlanningToken(token.id ?? null);
        this.phase = "movement";
        this.activeSlot = "action";
        this.destinationOffset = getTopLeftTileFromToken(token);
        this.selectedAction = null;
        this.selectedBonusAction = null;
        this.damagePreview = null;
        this.bonusDamagePreview = null;
        this.coverPreview = [];
        this.plannedTemplate = null;
        this.plannedBonusTemplate = null;

        this.movementData = this.provider.get(token.actor);
        if (!this.movementData.length) this.movementData = [{ mode: "walk", ranges: [] }];
        if (!this.movementData.some((movement) => movement.mode === this.movementMode)) {
            this.movementMode = this.movementData[0].mode;
        }

        this.movementPath = new MovementPathTracker(token, {
            getCurrentAction: () => this.movementMode,
            getRangesForMode: (mode) => this.getRangesForMode(mode),
            getPriorTurnCost: () => token.movementBudgetHandler.priorTurnCost,
        });
        this.pathStateManager = new TokenPathStateManager(token, {
            getCurrentAction: () => this.movementMode,
            getRangesForMode: (mode) => this.getRangesForMode(mode),
            getMaxMovementData: () => this.getMaxMovementData(),
        });

        this.movementPath.reset({ start: this.destinationOffset });

        const behaviour = getMovementBehaviour() as ValidMovementBehaviour;
        await this.pathStateManager.initBaseReach({
            currentTile: this.destinationOffset,
            behaviour,
            force: true,
        });

        this.overlay.drawReachTiles(this.pathStateManager.basePaintedTiles);
        this.overlay.drawPath(this.movementPath.getPaintedTiles(), this.movementSpeed());
        this.overlay.drawGhost(token, this.destinationOffset);
        this.drawSelectedActionRange();
        this.renderPanel();
        this.bindCanvas();
    }

    private bindCanvas() {
        canvas?.stage?.on("mousemove", this.onMove);
        canvas?.stage?.on("mouseup", this.onClick);
        if (canvas?.app?.view) {
            canvas.app.view.addEventListener("wheel", this.onWheel, { passive: false });
            canvas.app.view.addEventListener("contextmenu", this.onContext);
        }
    }

    private unbindCanvas() {
        canvas?.stage?.off("mousemove", this.onMove);
        canvas?.stage?.off("mouseup", this.onClick);
        if (canvas?.app?.view) {
            canvas.app.view.removeEventListener("wheel", this.onWheel);
            canvas.app.view.removeEventListener("contextmenu", this.onContext);
        }
    }

    private async handleMove(event: PIXI.FederatedEvent) {
        if (!this.token) return;
        const point = getCanvasPoint(event);

        if (this.phase === "movement") {
            const offset = canvas!.grid!.getOffset(point);
            await this.previewMovement(offset);
        } else if (this.phase === "template") {
            const template = this.currentTemplate();
            if (!template) return;
            template.x = point.x;
            template.y = point.y;
            this.setCurrentTemplate(template);
            this.overlay.drawTemplate(template);
        }
    }

    private async handleClick(event: PIXI.FederatedEvent) {
        if (!this.token || (event as any).button === 2) return;
        if (this.phase === "movement") {
            this.phase = "action";
            await this.refreshActionPreview();
            this.renderPanel();
        } else if (this.phase === "template") {
            this.phase = "action";
            await this.refreshActionPreview();
            this.renderPanel();
        }
    }

    private handleWheel(event: WheelEvent) {
        const template = this.currentTemplate();
        if (this.phase !== "template" || !template) return;
        event.preventDefault();
        const delta = event.deltaY > 0 ? 15 : -15;
        template.direction = (template.direction + delta + 360) % 360;
        this.setCurrentTemplate(template);
        this.overlay.drawTemplate(template);
    }

    private async previewMovement(offset: Offset) {
        if (!this.token) return;
        if (!this.movementPath || !this.pathStateManager) return;
        const mode = this.movementMode;
        const last = this.movementPath.update(offset, mode);
        if (!last) return;

        await this.pathStateManager.updatePathReach({
            currentTile: last,
            usedMovement: last.cost,
            behaviour: getMovementBehaviour() as ValidMovementBehaviour,
            uncap: false,
            mode,
        });

        this.destinationOffset = { j: last.j, i: last.i };
        this.overlay.drawPath(this.movementPath.getPaintedTiles(), this.movementSpeed());
        this.overlay.drawGhost(this.token, this.destinationOffset);
        this.drawSelectedActionRange();
        await this.refreshActionPreview();
        this.renderPanel();
    }

    private async setAction(slot: ActionSlot, id: string) {
        const option = this.actionsForSlot(slot).find((a) => a.id === id) ?? null;
        this.activeSlot = slot;

        if (slot === "action") {
            this.selectedAction = option;
            this.damagePreview = option ? await getAverageDamagePreview(option.activity) : null;
            this.plannedTemplate = this.createTemplateForAction(option);
        } else {
            this.selectedBonusAction = option;
            this.bonusDamagePreview = option ? await getAverageDamagePreview(option.activity) : null;
            this.plannedBonusTemplate = this.createTemplateForAction(option);
        }

        const template = this.currentTemplate();
        if (template) this.phase = "template";
        else if (this.phase === "template") this.phase = "action";
        this.overlay.drawTemplate(template);
        this.drawSelectedActionRange();
        await this.refreshActionPreview();
        this.renderPanel();
    }

    private actions(): PlannerActionOption[] {
        return getPlannerActions(this.token?.actor ?? null);
    }

    private actionsForSlot(slot: ActionSlot): PlannerActionOption[] {
        const actions = this.actions();
        if (slot === "bonus") return actions.filter((action) => action.activationType === "bonus");
        return actions.filter((action) => action.activationType !== "bonus");
    }

    private getRangesForMode(mode: MovementMode): MovementRange[] {
        return this.movementData.find((movement) => movement.mode === mode)?.ranges ?? [];
    }

    private getMaxMovementData(): MovementData | null {
        if (!this.movementData.length) return null;

        return this.movementData.reduce((max, current) => {
            const maxTotal = max.ranges.reduce((a, b) => a + b.value, 0);
            const currentTotal = current.ranges.reduce((a, b) => a + b.value, 0);
            return currentTotal > maxTotal ? current : max;
        });
    }

    private movementSpeed(): number {
        return maxMovementRange(this.getRangesForMode(this.movementMode));
    }

    private async refreshActionPreview() {
        if (!this.token || !this.destinationOffset) return;
        const destination = this.destinationPoint();
        this.coverPreview = getCoverPreviewFromPosition(
            this.token,
            destination,
            game.user?.targets ?? []
        );
    }

    private destinationPoint() {
        const offset = this.destinationOffset ?? getTopLeftTileFromToken(this.token!);
        return canvas!.grid!.getTopLeftPoint(offset);
    }

    private createTemplateForAction(option: PlannerActionOption | null): PlannedTemplate | null {
        const target = getTemplateTarget(option);
        if (!target?.type || !target?.size) return null;

        let shape =
            (globalThis as any).dnd5e?.config?.areaTargetTypes?.[target.type]?.template ??
            templateShapeFallback(target.type);
        if (!shape) return null;

        const size = Number(target.size);
        const width = target.width ? Number(target.width) : undefined;
        let distance = size;
        let templateWidth = width;
        let direction = 0;

        if (shape === "rect") {
            templateWidth = size;
            if (!useDnd5eGridAlignedSquareTemplates()) {
                shape = "ray";
            } else {
                distance = Math.hypot(size, size);
                direction = 45;
            }
        } else if (shape === "ray") {
            templateWidth ??= canvas?.scene?.grid?.distance ?? 5;
        }

        const center = this.destinationCenter();
        return {
            type: shape,
            x: center.x,
            y: center.y,
            direction,
            distance,
            width: templateWidth,
            angle: shape === "cone" ? CONFIG.MeasuredTemplate.defaults.angle : undefined,
        };
    }

    private destinationCenter() {
        if (!this.token) return { x: 0, y: 0 };
        const point = this.destinationPoint();
        return { x: point.x + this.token.w / 2, y: point.y + this.token.h / 2 };
    }

    private activeAction() {
        return this.activeSlot === "bonus" ? this.selectedBonusAction : this.selectedAction;
    }

    private currentTemplate() {
        return this.activeSlot === "bonus" ? this.plannedBonusTemplate : this.plannedTemplate;
    }

    private setCurrentTemplate(template: PlannedTemplate | null) {
        if (this.activeSlot === "bonus") this.plannedBonusTemplate = template;
        else this.plannedTemplate = template;
    }

    private selectTemplateSlot() {
        if (getTemplateTarget(this.activeAction())) return true;
        if (getTemplateTarget(this.selectedAction)) {
            this.activeSlot = "action";
            return true;
        }
        if (getTemplateTarget(this.selectedBonusAction)) {
            this.activeSlot = "bonus";
            return true;
        }
        return false;
    }

    private drawSelectedActionRange() {
        const action = this.activeAction();
        if (!this.token || !this.destinationOffset || !action?.rangeDistance) {
            this.overlay.drawRange(null, null);
            return;
        }

        this.overlay.drawRange(this.destinationCenter(), action.rangeDistance);
    }

    private renderPanel() {
        if (!this.app) this.app = new TurnPlannerApplication(this);
        void this.app.render({ force: true });
    }

    renderContent(): string {
        const actions = this.actions();
        const movement = this.movementPath?.last?.cost ?? 0;
        const distance = movement * (canvas?.scene?.grid?.distance ?? 1);
        const units = canvas?.scene?.grid?.units ?? "";
        const movementTier = getMovementTier(distance, this.movementSpeed());
        const tokenName = this.token?.name ?? "Selected Token";
        const phaseLabel =
            this.phase === "movement" ? "Movement" : this.phase === "template" ? "Template" : "Action";
        const hasAvailableArea =
            !!this.currentTemplate() ||
            !!getTemplateTarget(this.selectedAction) ||
            !!getTemplateTarget(this.selectedBonusAction) ||
            actions.some((action) => !!getTemplateTarget(action));
        const actionOptions = renderActionOptions(this.actionsForSlot("action"), this.selectedAction?.id ?? "");
        const bonusActionOptions = renderActionOptions(
            this.actionsForSlot("bonus"),
            this.selectedBonusAction?.id ?? ""
        );

        return `
            <div class="ttp-planner-shell">
                <div class="ttp-planner-banner">
                    <div>
                        <span class="ttp-kicker">Planned Turn</span>
                        <strong>${escapeHtml(tokenName)}</strong>
                    </div>
                    <span class="ttp-phase-pill">${phaseLabel}</span>
                </div>
                <div class="ttp-summary-grid">
                    <div class="ttp-stat">
                        <span>Mode</span>
                        <strong>${this.phase === "movement" ? "Choose Movement" : this.phase === "template" ? "Place Area" : "Choose Action"}</strong>
                    </div>
                    <div class="ttp-stat">
                        <span>Movement</span>
                        <strong>${formatNumber(distance)} ${escapeHtml(units)}</strong>
                    </div>
                    <div class="ttp-stat ttp-stat-wide">
                        <span>Action Cost</span>
                        <strong class="ttp-movement-tier ${movementTier.className}">${movementTier.label}</strong>
                    </div>
                </div>
                <div class="ttp-slot-grid">
                    <section class="ttp-slot-card ${this.activeSlot === "action" ? "active" : ""}" data-action="focus-slot" data-slot="action">
                        <label class="ttp-field ttp-slot-field">
                            <span>Action</span>
                            <select data-action="select-action" data-slot="action">
                                <option value="">No planned action</option>
                                ${actionOptions}
                            </select>
                        </label>
                        ${this.renderActionSummary("action")}
                    </section>
                    <section class="ttp-slot-card ${this.activeSlot === "bonus" ? "active" : ""}" data-action="focus-slot" data-slot="bonus">
                        <label class="ttp-field ttp-slot-field">
                            <span>Bonus Action</span>
                            <select data-action="select-action" data-slot="bonus">
                                <option value="">No planned bonus action</option>
                                ${bonusActionOptions}
                            </select>
                        </label>
                        ${this.renderActionSummary("bonus")}
                    </section>
                </div>
                ${this.renderDamageBoard()}
                ${this.renderCover()}
                <div class="ttp-actions">
                    <button type="button" data-action="movement"><i class="fa-solid fa-shoe-prints"></i><span>Movement</span></button>
                    <button type="button" data-action="template" ${hasAvailableArea ? "" : "disabled"} title="${hasAvailableArea ? "Place planned area" : "Select an action with an area"}"><i class="fa-solid fa-draw-polygon"></i><span>Area</span></button>
                    <button type="button" data-action="save"><i class="fa-solid fa-bookmark"></i><span>Save</span></button>
                    <button type="button" data-action="execute"><i class="fa-solid fa-play"></i><span>Execute</span></button>
                </div>
            </div>
        `;
    }

    activateListeners(root: HTMLElement) {
        root.querySelector('[data-action="movement"]')?.addEventListener("click", () => {
            this.phase = "movement";
            this.renderPanel();
        });
        root.querySelector('[data-action="template"]')?.addEventListener("click", async () => {
            if (!this.selectTemplateSlot()) {
                let firstAreaAction = this.actionsForSlot(this.activeSlot).find((action) => !!getTemplateTarget(action));
                if (!firstAreaAction) {
                    firstAreaAction = this.actions().find((action) => !!getTemplateTarget(action));
                    if (firstAreaAction) this.activeSlot = firstAreaAction.activationType === "bonus" ? "bonus" : "action";
                }
                if (firstAreaAction) await this.setAction(this.activeSlot, firstAreaAction.id);
            }
            if (!this.currentTemplate()) this.setCurrentTemplate(this.createTemplateForAction(this.activeAction()));
            if (!this.currentTemplate()) return;
            this.phase = "template";
            this.overlay.drawTemplate(this.currentTemplate());
            this.renderPanel();
        });
        root.querySelector('[data-action="save"]')?.addEventListener("click", () => this.savePlan());
        root.querySelector('[data-action="execute"]')?.addEventListener("click", () => this.executeCurrent());
        root.querySelectorAll<HTMLElement>('[data-action="focus-slot"]').forEach((element) => {
            element.addEventListener("click", (event) => {
                if ((event.target as HTMLElement).closest("select")) return;
                this.activeSlot = slotFromDataset(element.dataset.slot);
                this.overlay.drawTemplate(this.currentTemplate());
                this.drawSelectedActionRange();
                this.renderPanel();
            });
        });
        root.querySelectorAll<HTMLSelectElement>('[data-action="select-action"]').forEach((select) => {
            select.addEventListener("focus", () => {
                this.activeSlot = slotFromDataset(select.dataset.slot);
                this.overlay.drawTemplate(this.currentTemplate());
                this.drawSelectedActionRange();
            });
            select.addEventListener("change", (event) => {
                const target = event.target as HTMLSelectElement;
                void this.setAction(slotFromDataset(target.dataset.slot), target.value);
            });
        });
    }

    private renderDamageBoard(): string {
        const actionDamage = this.renderDamageColumn("Action", this.damagePreview);
        const bonusDamage = this.renderDamageColumn("Bonus Action", this.bonusDamagePreview);
        const total = (this.damagePreview?.total ?? 0) + (this.bonusDamagePreview?.total ?? 0);
        const hasDamage = !!this.damagePreview?.parts.length || !!this.bonusDamagePreview?.parts.length;
        if (!hasDamage) return `<div class="ttp-muted">No damage formula preview.</div>`;

        return `
            <div class="ttp-block ttp-damage-board">
                <div class="ttp-damage-total">
                    <span>Average Damage</span>
                    <strong>${formatNumber(total)}</strong>
                </div>
                <div class="ttp-damage-columns">
                    ${actionDamage}
                    ${bonusDamage}
                </div>
            </div>
        `;
    }

    private renderDamageColumn(label: string, preview: DamagePreview | null): string {
        if (!preview?.parts.length) {
            return `<div class="ttp-damage-column empty"><span>${escapeHtml(label)}</span><em>No damage</em></div>`;
        }

        const rows = preview.parts
            .map(
                (part) =>
                    `<li><span>${escapeHtml(part.formula)}${part.type ? ` <small>${escapeHtml(part.type)}</small>` : ""}</span><strong>${formatNumber(part.average)}</strong></li>`
            )
            .join("");
        return `
            <div class="ttp-damage-column">
                <div><span>${escapeHtml(label)}</span><strong>${formatNumber(preview.total)}</strong></div>
                <ul class="ttp-list">${rows}</ul>
            </div>
        `;
    }

    private renderActionSummary(slot: ActionSlot): string {
        const option = slot === "bonus" ? this.selectedBonusAction : this.selectedAction;
        if (!option) return `<div class="ttp-slot-empty">No ${slot === "bonus" ? "bonus action" : "action"} planned.</div>`;
        const range = option.rangeLabel || "No listed range";
        const overlay = option.rangeDistance
            ? `Previewing ${formatNumber(option.rangeDistance)} ${escapeHtml(canvas?.scene?.grid?.units ?? "")}`
            : "No numeric range overlay";
        return `
            <div class="ttp-block ttp-action-summary">
                <div class="ttp-block-title"><span>${escapeHtml(option.activationLabel)}</span><strong>${escapeHtml(range)}</strong></div>
                <ul class="ttp-list">
                    <li><span>Source</span><strong>${escapeHtml(groupLabel(option.group))}</strong></li>
                    <li><span>Range Overlay</span><strong>${overlay}</strong></li>
                </ul>
            </div>
        `;
    }

    private renderCover(): string {
        if (!this.coverPreview.length) return `<div class="ttp-muted">Target tokens to preview cover.</div>`;
        const rows = this.coverPreview
            .map(
                (cover) =>
                    `<li class="ttp-cover-row"><span><strong>${escapeHtml(cover.target.name)}</strong><small>${escapeHtml(coverEffect(cover.cover))}</small></span><b class="cover-${cover.cover}">${coverLabel(cover.cover)} (${cover.blocked}/${cover.total})</b></li>`
            )
            .join("");
        return `<div class="ttp-block"><div class="ttp-heading">Cover Preview</div><ul class="ttp-list">${rows}</ul></div>`;
    }

    private async savePlan() {
        const plan = this.buildPlan();
        if (!plan) return;
        const plans = getStoredPlans();
        plans[plan.tokenId] = plan;
        await game.settings?.set(MODULE_ID, PLANNED_TURNS as any, plans as any);
        ui.notifications?.info(`Planned turn saved for ${plan.tokenName}.`);
        this.cancel();
    }

    private async executeCurrent() {
        const plan = this.buildPlan();
        if (!plan) return;
        if (await promptExecutePlan(plan)) this.cancel();
    }

    private buildPlan(): PlannedTurn | null {
        if (!this.token || !this.destinationOffset) return null;
        const originOffset = getTopLeftTileFromToken(this.token);
        const destination = this.destinationPoint();
        const action = buildPlannedAction(this.selectedAction, this.plannedTemplate);
        const bonusAction = buildPlannedAction(this.selectedBonusAction, this.plannedBonusTemplate);

        return {
            id: foundry.utils.randomID(),
            userId: game.userId!,
            sceneId: canvas!.scene!.id!,
            tokenId: this.token.id!,
            tokenName: this.token.name,
            actorUuid: this.token.actor?.uuid ?? null,
            origin: {
                x: this.token.document.x,
                y: this.token.document.y,
                elevation: this.token.document.elevation,
            },
            originOffset,
            destination: {
                x: destination.x,
                y: destination.y,
                elevation: this.token.document.elevation,
            },
            destinationOffset: this.destinationOffset,
            path: this.movementPath?._path.map((step) => ({ ...step })) ?? [],
            action,
            bonusAction,
            template: this.plannedTemplate ?? undefined,
            createdAt: Date.now(),
        };
    }

    cancel(clearOverlay = true) {
        this.unbindCanvas();
        const app = this.app;
        this.app = null;
        void app?.close({ animate: false });
        if (clearOverlay) this.overlay.destroy();
        setActivePlanningToken(null);
        this.token = null;
        this.movementPath = null;
        this.pathStateManager = null;
        this.movementData = [];
        this.phase = "movement";
        this.activeSlot = "action";
        this.selectedAction = null;
        this.selectedBonusAction = null;
        this.damagePreview = null;
        this.bonusDamagePreview = null;
        this.coverPreview = [];
        this.plannedTemplate = null;
        this.plannedBonusTemplate = null;
    }

    onPlannerWindowClosed(app: TurnPlannerApplication) {
        if (this.app !== app) return;
        this.app = null;
        this.cancel();
    }
}

const planner = new TurnPlannerController();

export function setupTurnPlanner() {
    Hooks.on("renderTokenHUD", (hud: TokenHUD, html: HTMLElement | JQuery) => {
        if (!isTurnPlannerEnabled()) return;
        if (!hasActiveEncounter()) return;
        const token = getHudToken(hud);
        if (!token?.actor?.isOwner) return;

        const root = getHudElement(html);
        if (!root || root.querySelector('[data-action="tobbys-turn-planner"]')) return;

        const button = document.createElement("button");
        button.type = "button";
        button.classList.add("control-icon");
        button.dataset.action = "tobbys-turn-planner";
        button.dataset.tooltip = "Plan Turn";
        button.setAttribute("aria-label", "Plan Turn");
        button.innerHTML = '<i class="fas fa-route" inert></i>';
        button.addEventListener("click", (event) => {
            event.preventDefault();
            event.stopPropagation();
            planner.start(token);
        });

        insertHudButton(root, button);
    });

    Hooks.on("combatTurnChange", async (combat: Combat) => {
        const combatant = combat.combatant;
        const tokenId = combatant?.tokenId;
        if (!tokenId) return;
        const token = canvas?.tokens?.get(tokenId) as AerisToken | undefined;
        if (!token?.actor?.isOwner) return;
        const plan = getStoredPlans()[tokenId];
        if (!plan) return;
        await promptExecutePlan(plan);
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

function getHudToken(hud: TokenHUD): AerisToken | null {
    const candidates = [
        (hud as any).object,
        (hud as any).object?.object,
        (hud as any).object?.document?.object,
        (hud as any).document?.object,
    ];

    for (const candidate of candidates) {
        if (candidate?.dragActionHandler && candidate?.movementPath) return candidate as AerisToken;
    }

    return null;
}

function getStoredPlans(): Record<string, PlannedTurn> {
    return foundry.utils.deepClone(
        ((game.settings?.get(MODULE_ID, PLANNED_TURNS as any) as unknown as Record<string, PlannedTurn>) ?? {})
    );
}

async function promptExecutePlan(plan: PlannedTurn): Promise<boolean> {
    if (isPlanStale(plan)) {
        ui.notifications?.warn(`Planned turn for ${plan.tokenName} was not executed because the token moved after planning.`);
        await clearStoredPlan(plan.tokenId);
        return false;
    }

    const plannedActions = getPlannedActions(plan);
    const actionText = plannedActions.length
        ? `<ul class="ttp-dialog-list">${plannedActions
              .map((action) => `<li><span>${escapeHtml(action.activationType === "bonus" ? "Bonus Action" : "Action")}</span><strong>${escapeHtml(action.label)}</strong></li>`)
              .join("")}</ul>`
        : "<p>No action is planned.</p>";
    const templateText = plannedActions.some((action) => !!action.template) || !!plan.template
        ? `<p>Template handling: <strong>${templateModeLabel(getTemplateExecutionMode())}</strong>.</p>`
        : "";

    const yes = await confirmPlannerDialog({
        title: "Execute Planned Turn?",
        content: `<p><strong>${escapeHtml(plan.tokenName)}</strong> has a planned turn.</p>${actionText}${templateText}<p>No dice will be rolled.</p>`,
        yesLabel: "Execute",
        noLabel: "Skip",
        defaultYes: false,
    });
    if (!yes) return false;
    await executePlan(plan);
    return true;
}

async function executePlan(plan: PlannedTurn) {
    const scene = game.scenes?.get(plan.sceneId);
    const tokenDoc = scene?.tokens.get(plan.tokenId);
    if (!scene || !tokenDoc) {
        ui.notifications?.warn("The planned token no longer exists.");
        return;
    }

    if (isPlanStale(plan, tokenDoc)) {
        ui.notifications?.warn(`Planned turn for ${plan.tokenName} was not executed because the token moved after planning.`);
        await clearStoredPlan(plan.tokenId);
        return;
    }

    await tokenDoc.update({
        x: plan.destination.x,
        y: plan.destination.y,
        elevation: plan.destination.elevation,
    });

    for (const action of getPlannedActions(plan)) {
        await executePlannedAction(plan, action);
    }

    await clearStoredPlan(plan.tokenId);
}

async function executePlannedAction(plan: PlannedTurn, plannedAction: PlannedAction) {
    const item = (await fromUuid(plannedAction.itemUuid)) as Item | null;
    const activity = (item as any)?.system?.activities?.get(plannedAction.activityId);
    if (!activity) {
        ui.notifications?.warn(`The planned action no longer exists: ${plannedAction.label}.`);
        return;
    }

    const mode = resolveTemplateMode(plannedAction);
    let createMeasuredTemplate = mode === "replace";
    const template = plannedAction.template ?? (plannedAction === plan.action ? plan.template : undefined);
    if (mode === "stored" && template) {
        createMeasuredTemplate = !(await createStoredTemplate(template, activity));
    }

    await activity.use(
        {
            create: { measuredTemplate: createMeasuredTemplate },
            subsequentActions: false,
        },
        {},
        {}
    );
}

function resolveTemplateMode(plannedAction: PlannedAction): TemplateExecutionMode {
    if (!plannedAction.template) return "none";
    return getTemplateExecutionMode();
}

async function confirmPlannerDialog({
    title,
    content,
    yesLabel = "Yes",
    noLabel = "No",
    defaultYes = false,
}: {
    title: string;
    content: string;
    yesLabel?: string;
    noLabel?: string;
    defaultYes?: boolean;
}): Promise<boolean> {
    const result = await DialogV2.confirm({
        window: {
            title,
            icon: "fa-solid fa-dice-d20",
        },
        classes: ["tobbys-turn-planner-dialog"],
        modal: true,
        rejectClose: false,
        content: `<div class="ttp-dialog-content">${content}</div>`,
        yes: {
            label: yesLabel,
            icon: "fa-solid fa-check",
            default: defaultYes,
            callback: () => true,
        },
        no: {
            label: noLabel,
            icon: "fa-solid fa-xmark",
            default: !defaultYes,
            callback: () => false,
        },
    });

    return result === true;
}

async function createStoredTemplate(template: PlannedTemplate, activity: any): Promise<boolean> {
    if (!canvas?.scene) return false;

    const data = {
        t: template.type,
        user: game.userId,
        x: template.x,
        y: template.y,
        direction: template.direction,
        distance: template.distance,
        width: template.width,
        angle: template.angle,
        fillColor: game.user?.color,
        flags: {
            dnd5e: {
                item: activity.item?.uuid,
                origin: activity.uuid,
                dimensions: {
                    size: template.distance,
                    width: template.width,
                    adjustedSize: false,
                },
                spellLevel: activity.getRollData?.()?.item?.level,
            },
        },
    };
    try {
        await canvas.scene.createEmbeddedDocuments("MeasuredTemplate", [data as any]);
        return true;
    } catch (error) {
        console.warn("Tobby's Turn Planner could not create the planned area directly.", error);
        ui.notifications?.warn("The planned area could not be placed directly. dnd5e will ask for placement.");
        return false;
    }
}

function getCanvasPoint(event: PIXI.FederatedEvent): { x: number; y: number } {
    return (event as any).data.getLocalPosition(canvas!.stage);
}

function templateShapeFallback(type: string): string | null {
    switch (type) {
        case "radius":
        case "sphere":
        case "cylinder":
        case "circle":
            return "circle";
        case "cone":
            return "cone";
        case "line":
        case "wall":
            return "ray";
        case "cube":
        case "square":
            return "rect";
        default:
            return null;
    }
}

function getTemplateTarget(option: PlannerActionOption | null): any {
    return option?.activity?.target?.template ?? (option?.item as any)?.system?.target?.template ?? null;
}

function getMovementTier(distance: number, speed: number): { label: string; className: string } {
    if (!speed || speed <= 0) return { label: "Move", className: "tier-move" };
    if (distance <= speed) return { label: "Move", className: "tier-move" };
    if (distance <= speed * 2) return { label: "Dash", className: "tier-dash" };
    if (distance <= speed * 3) return { label: "Dash Twice", className: "tier-double-dash" };
    return { label: "Beyond Two Dashes", className: "tier-over" };
}

function useDnd5eGridAlignedSquareTemplates(): boolean {
    try {
        return game.settings?.get("dnd5e" as any, "gridAlignedSquareTemplates" as any) === true;
    } catch {
        return false;
    }
}

function groupLabel(group: PlannerActionOption["group"]) {
    return group === "spell" ? "Spell" : group === "scroll" ? "Scroll" : group === "weapon" ? "Weapon" : "Other";
}

function renderActionOptions(actions: PlannerActionOption[], selectedId: string) {
    return actions
        .map((action) => {
            const range = action.rangeLabel ? ` (${escapeHtml(action.rangeLabel)})` : "";
            return `<option value="${escapeHtml(action.id)}" ${
                selectedId === action.id ? "selected" : ""
            }>${escapeHtml(groupLabel(action.group))} - ${escapeHtml(action.label)}${range}</option>`;
        })
        .join("");
}

function buildPlannedAction(
    option: PlannerActionOption | null,
    template: PlannedTemplate | null
): PlannedAction | undefined {
    if (!option) return undefined;
    return {
        itemUuid: option.item.uuid ?? "",
        activityId: option.activity.id,
        label: option.label,
        activationType: option.activationType,
        template: template ?? undefined,
    };
}

function getPlannedActions(plan: PlannedTurn): PlannedAction[] {
    const actions: PlannedAction[] = [];
    if (plan.action) {
        actions.push({
            ...plan.action,
            activationType: plan.action.activationType ?? "action",
            template: plan.action.template ?? plan.template,
        });
    }
    if (plan.bonusAction) {
        actions.push({
            ...plan.bonusAction,
            activationType: plan.bonusAction.activationType ?? "bonus",
        });
    }
    return actions;
}

function slotFromDataset(value: string | undefined): ActionSlot {
    return value === "bonus" ? "bonus" : "action";
}

function templateModeLabel(mode: TemplateExecutionMode): string {
    switch (mode) {
        case "stored":
            return "use planned placement";
        case "replace":
            return "place again";
        default:
            return "do not place";
    }
}

function isPlanStale(plan: PlannedTurn, tokenDoc?: TokenDocument | null): boolean {
    const scene = game.scenes?.get(plan.sceneId);
    const doc = tokenDoc ?? scene?.tokens.get(plan.tokenId);
    if (!doc) return true;
    return (
        !nearlyEqual(doc.x, plan.origin.x) ||
        !nearlyEqual(doc.y, plan.origin.y) ||
        !nearlyEqual(doc.elevation ?? 0, plan.origin.elevation ?? 0)
    );
}

async function clearStoredPlan(tokenId: string) {
    const plans = getStoredPlans();
    delete plans[tokenId];
    await game.settings?.set(MODULE_ID, PLANNED_TURNS as any, plans as any);
}

function escapeHtml(value: string) {
    const div = document.createElement("div");
    div.innerText = value;
    return div.innerHTML;
}

function formatNumber(value: number) {
    return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function nearlyEqual(a: number, b: number) {
    return Math.abs(a - b) < 0.5;
}
