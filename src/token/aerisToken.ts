import { PIXI } from "fvtt-types/configuration";
import { isPathBeyondRangeAllowed } from "../settings/allowOutOfGrid";
import { isPlanningToken } from "../planner/planningState";
import {
    getMovementBehaviour,
    isModuleFunctional,
    ValidMovementBehaviour,
} from "../settings/enableGrid";
import { canSeeOthersPreview } from "../settings/enableOthersPreview";
import { isMovementEngineEnabled } from "../settings/movementEngine";
import { isCombatMovementHistoryForTokenEnabled } from "../settings/movementHistory";
import { isExplorationUncapped } from "../settings/uncapExploration";
import { socketlibSocket } from "../socket/_socket";
import { Offset } from "../types/canvas";
import { getTopLeftTileFromToken } from "../utils/tiles";
import { TokenJumpHandler } from "./animation/jumpTokenTo";
import { MovementDataProvider } from "./dataProvider/dataProvider";
import { DragActionHandler } from "./dragAction/dragAction";
import { explorationBroadcastJumpTo } from "./exploration";
import { TokenGridPainter } from "./graphics/tokenPathGraphicsHandler";
import { MovementBudgetContext } from "./movementBudget/movementBudget";
import { TokenPathStateManager } from "./pathfinding/tokenPathfinder";
import {
    tacticsBroadcastStartPreview,
    TokenPreviewAnimator,
} from "./preview/tokenPreviewPathHandler";
import { tacticsBroadcastSetQueuedPositionOffset } from "./tactics";
import { MovementPathTracker } from "./trail/BacktrableMovementTrail";
import { CostOffset } from "./trail/costPath";
import { TokenZoomHandler } from "./zoom/tokenZoomHandler";

type DragStartState = {
    anchorOffset: Offset | null;
    anchorCenter: { x: number; y: number };
    pointerOrigin: { x: number; y: number };
};

type BaseInteractionData = Canvas.Event.InteractionData<
    PIXI.Container<PIXI.DisplayObject>
>;

export interface AerisInteractionData extends BaseInteractionData {
    destination?: { x: number; y: number };
    targets?: AerisToken[];
    behaviour?: ValidMovementBehaviour;
    clearPreviewContainer?: boolean;
    uncap?: boolean;
}

export type AerisToken = InstanceType<ReturnType<typeof createAerisTokenClass>>;

export function createAerisTokenClass(
    BaseTokenClass = CONFIG.Token.objectClass as typeof Token
) {
    return class AerisToken extends BaseTokenClass {
        private _dragStartState: DragStartState | null = null;
        _draggerUserId: string | null = null;
        _draggedWarnFlag: string | null = null;

        protected setDragStartData(state: DragStartState | null): void {
            this._dragStartState = state;
            this._draggerUserId = state ? game.userId! : null;
            this._draggedWarnFlag = null;
            broadcastSetDraggerUserId(this.id, state ? game.userId! : null);
        }

        public movementPath = new MovementPathTracker(this);
        public previewAnimator = new TokenPreviewAnimator(this);
        public gridPainter = new TokenGridPainter(this);
        public pathStateManager = new TokenPathStateManager(this);
        public jumpHandler = new TokenJumpHandler(this);
        public zoomHandler = new TokenZoomHandler(this);
        public movementBudgetHandler = new MovementBudgetContext(this);
        public dragActionHandler = new DragActionHandler(this);
        public movementDataProvider = new MovementDataProvider();

        isJumping: boolean = false;
        queuedPositionOffset: Offset | null = null;

        setQueuedPositionOffset(offset: Offset | null, notify?: boolean): void {
            this.queuedPositionOffset = offset;
            if (notify)
                tacticsBroadcastSetQueuedPositionOffset(this.id, offset);
        }

        get queuedPositionTopLeft(): { x: number; y: number } | null {
            return this.queuedPositionOffset
                ? canvas!.grid!.getTopLeftPoint(this.queuedPositionOffset)
                : null;
        }

        isAerisDrag(): boolean {
            return !!this._dragStartState;
        }

        /**
         * Called when a left-drag event begins on this object.
         *
         * Returning `false` will cancel the drag and prevent `#onDragLeftStart` from proceeding.
         * Used to implement custom drag-blocking logic (e.g., when dragging should be conditional).
         *
         * Called by the internal `#onDragLeftStart(event)` method, which handles core drag behavior.
         *
         * @param {PIXI.FederatedEvent} event - The PIXI interaction event triggering the drag.
         * @returns {boolean|void} - Return `false` to block the drag, or nothing to allow it.
         */
        protected override _onDragLeftStart(
            event: Canvas.Event.Pointer<PIXI.Container<PIXI.DisplayObject>>
        ): boolean | void {
            if (isPlanningToken(this.id)) return false;

            const result = super._onDragLeftStart(event);
            //@ts-expect-error untyped
            if (result === false) return result;
            if (this.document.locked) return false;
            if (!this._canDrag(game.user!, event)) return false;
            if (this._draggerUserId !== null) {
                if (this._draggedWarnFlag === null) {
                    this._draggedWarnFlag = this._draggerUserId;
                    ui.notifications?.warn(
                        `You cannot drag this token at this time.`
                    );
                }
                return false;
            }

            return true;
        }

        private _shouldUseAerisDrag(event: PIXI.FederatedEvent): boolean {
            return (
                isATAvailable() &&
                canvas!.tokens?.controlled.length === 1 &&
                !event.shiftKey
            );
        }

        //@ts-expect-error untyped
        protected override async _initializeDragLeft(
            event: PIXI.FederatedEvent
        ) {
            if (!this._shouldUseAerisDrag(event)) {
                //@ts-expect-error untyped
                return super._initializeDragLeft(event);
            }

            //@ts-expect-error untyped
            this.layer._draggedToken = this;

            this.stopAnimation();

            const { origin } = event.interactionData!;

            const anchorOffset =
                this.queuedPositionOffset ?? getTopLeftTileFromToken(this)!;

            this.setDragStartData({
                anchorOffset,
                anchorCenter: canvas!.grid!.getCenterPoint(anchorOffset),
                pointerOrigin: {
                    x: origin!.x,
                    y: origin!.y,
                },
            });

            event.interactionData ??= {};
            event.interactionData.targets = [this];
            event.interactionData.contexts = [];

            this.dragActionHandler.startDrag(this.movementDataProvider);

            const behaviour = getMovementBehaviour() as ValidMovementBehaviour;
            event.interactionData.behaviour = behaviour;
            const uncap =
                behaviour === "Exploration" && isExplorationUncapped();

            this.movementPath.reset({ uncap });
            await this.pathStateManager.initBaseReach({
                currentTile: anchorOffset,
                behaviour,
                uncap,
            });
            await this.updatePathAndPaint();
            this.gridPainter.paintAndBroadcast();
            this.zoomHandler.zoomOut(this.center);

            if (behaviour === "Tactics") {
                if (!game.user?.isGM && canSeeOthersPreview())
                    tacticsBroadcastStartPreview(this.id);
                else this.previewAnimator.startPreview();
            }
        }

        addToMovementTrail(
            offset: Offset,
            behaviour: ValidMovementBehaviour,
            uncap: boolean
        ): CostOffset | void {
            const mode = this.dragActionHandler.currentAction ?? "walk";
            const last = this.movementPath.update(offset, mode);
            if (!last) return;
            this.updatePathAndPaint({ last, behaviour, uncap });
            return last;
        }

        async updatePathAndPaint(context?: {
            last?: CostOffset;
            behaviour?: ValidMovementBehaviour;
            uncap?: boolean;
        }) {
            let { last, behaviour, uncap } = context ?? {};
            last ??= this.movementPath.last;

            if (!last) return;
            if (this.movementPath._path.length === 1) {
                last.mode = this.dragActionHandler.currentAction;
            }

            await this.pathStateManager.updatePathReach({
                currentTile: last,
                usedMovement: last.cost,
                behaviour,
                uncap,
                mode: this.dragActionHandler.currentAction,
            });

            this.gridPainter.paintAndBroadcast();
        }

        recalculatePlannedMovementPath() {
            //@ts-expect-error untyped
            if (!this.isAerisDrag()) super.recalculatePlannedMovementPath();
            else this.updatePathAndPaint();
        }

        protected _onDragLeftMove(
            event: Canvas.Event.Pointer<PIXI.Container<PIXI.DisplayObject>>
        ): void {
            if (!this.isAerisDrag()) {
                return super._onDragLeftMove(event);
            }

            const dragStartState = this._dragStartState!;

            const {
                destination = { x: 0, y: 0 },
                targets = [],
                behaviour,
                uncap,
            }: AerisInteractionData = event.interactionData ?? {};

            //@ts-expect-error protected in types
            canvas._onDragCanvasPan(event);

            const origin = dragStartState.pointerOrigin;
            const dx = destination.x - origin.x;
            const dy = destination.y - origin.y;

            for (const aerisToken of targets) {
                const newAnchorPx = {
                    ...dragStartState.anchorCenter,
                }!;

                newAnchorPx.x += dx;
                newAnchorPx.y += dy;

                const newAnchor = canvas!.grid!.getOffset(newAnchorPx);

                if (!game.user?.isGM) {
                    if (
                        !this.pathStateManager.baseReachableKeys.has(
                            `${newAnchor.j},${newAnchor.i}`
                        ) &&
                        !isPathBeyondRangeAllowed()
                    )
                        continue;
                }

                const lastAnchor = aerisToken.addToMovementTrail(
                    newAnchor,
                    behaviour!,
                    uncap!
                );

                if (lastAnchor) {
                    aerisToken.setQueuedPositionOffset(lastAnchor, true);

                    if (behaviour === "Exploration")
                        explorationBroadcastJumpTo(this.id!, lastAnchor);
                }
            }
        }

        get isDragged() {
            return isATAvailable()
                ? //@ts-expect-error untyped
                  this.isAerisDrag() ?? super.isDragged
                : //@ts-expect-error untyped
                  super.isDragged;
        }

        protected _onDragLeftDrop(
            event: Canvas.Event.Pointer<PIXI.Container<PIXI.DisplayObject>>
        ): void | false {
            if (!this.isAerisDrag()) return super._onDragLeftDrop(event);

            const {
                destination = { x: 0, y: 0 },
                targets = [],
                behaviour,
            }: AerisInteractionData = event.interactionData ?? {};

            if (!targets.length) return false;

            const willDrop = canvas!.dimensions?.rect.contains(
                destination.x,
                destination.y
            );

            if (event.interactionData)
                event.interactionData.clearPreviewContainer = false;

            const updates = willDrop
                ? this._prepareDragLeftDropUpdates(event)
                : null;

            for (const aerisToken of targets) {
                (async () => {
                    const trail = aerisToken.movementPath._path;
                    // TODO no need to reset on gm sourced drags
                    await broadcastDragEnd(
                        aerisToken.id,
                        aerisToken._dragStartState!.anchorOffset!,
                        trail,
                        behaviour!
                    );
                    this.zoomHandler.zoomBackIn();

                    if (isCombatMovementHistoryForTokenEnabled(this))
                        await this.movementBudgetHandler.set(
                            this.movementPath.last?.cost ?? 0
                        );

                    this.setDragStartData(null);

                    if (updates) this._commitDragLeftDropUpdates(updates);
                })();
            }
        }

        protected async _commitDragLeftDropUpdates(
            updates: Token.DragLeftDropUpdate[]
        ) {
            for (const u of updates) {
                const d = this.document.collection?.get(u._id!);
                if (d) d.locked = d._source.locked;
            }

            await canvas!.scene?.updateEmbeddedDocuments(
                this.document.documentName,
                updates,
                {
                    //@ts-expect-error untyped
                    supressPaint: true,
                    animate: false,
                    panCamera: false,
                }
            );

            this.layer.clearPreviewContainer();
        }

        protected override _prepareDragLeftDropUpdates(
            event: Canvas.Event.Pointer<PIXI.Container<PIXI.DisplayObject>>
        ): Token.DragLeftDropUpdate[] {
            if (!this.isAerisDrag())
                return super._prepareDragLeftDropUpdates(event);

            const { targets = [] }: AerisInteractionData =
                event.interactionData;

            const updates = [];
            for (const aerisToken of targets) {
                const { document } = aerisToken;
                // Pass queued pos directly since sometimes it's out of sync
                const dest = aerisToken.queuedPositionTopLeft ??
                    aerisToken.getSnappedPosition() ?? {
                        x: document.x,
                        y: document.y,
                    };

                const tokenWidth = aerisToken.w;
                const tokenHeight = aerisToken.h;

                const bounds = canvas!.dimensions?.sceneRect;
                if (!bounds) continue;

                const fitsWithinScene =
                    dest.x >= bounds.x &&
                    dest.y >= bounds.y &&
                    dest.x + tokenWidth <= bounds.x + bounds.width &&
                    dest.y + tokenHeight <= bounds.y + bounds.height;

                if (!fitsWithinScene) continue;

                updates.push({ _id: aerisToken.id, x: dest.x, y: dest.y });
            }

            return updates;
        }

        protected override _onUpdate(
            changed: any,
            options: any,
            userId: string
        ) {
            super._onUpdate(changed, options, userId);
            // this.renderFlags.delete("redraw");

            if (options.supressPaint) {
                this.renderFlags.clear();
            }
        }

        protected override _onDragLeftCancel(
            event: Canvas.Event.Pointer<PIXI.Container<PIXI.DisplayObject>> &
                MouseEvent
        ) {
            if (!this.isAerisDrag()) super._onDragLeftCancel(event);

            const { behaviour }: AerisInteractionData =
                event.interactionData ?? {};

            if (event.button === 2) {
                broadcastTokenDragCancel(
                    this.id,
                    this._dragStartState?.anchorOffset!,
                    behaviour!
                );
                this.setDragStartData(null);
            }
        }

        //@ts-expect-error untyped
        protected override _finalizeDragLeft(event: PIXI.FederatedEvent) {
            //@ts-expect-error untyped
            if (!this.isAerisDrag()) super._finalizeDragLeft(event);

            //@ts-expect-error untyped
            this.layer._draggedToken = null;

            if (event.interactionData?.clearPreviewContainer !== false) {
                this.layer.clearPreviewContainer();
            }
        }
    };
}
export function isATAvailable() {
    return (
        (!!canvas!.grid?.isSquare || !!canvas!.grid?.isHexagonal) &&
        isMovementEngineEnabled() &&
        isModuleFunctional()
    );
}

async function broadcastSetDraggerUserId(
    tokenId: string,
    userId: string | null
) {
    await socketlibSocket?.executeForEveryone(
        "handleSetDraggerUserId",
        tokenId,
        userId
    );
}

export function handleSetDraggerUserId(tokenId: string, userId: string | null) {
    const token = canvas!.tokens?.get(tokenId);
    if (!token) return;

    token._draggerUserId = userId;
    token._draggedWarnFlag = null;
}

async function broadcastDragEnd(
    tokenId: string,
    initialAnchorOffset: Offset,
    trail: CostOffset[],
    behaviour: ValidMovementBehaviour
) {
    socketlibSocket?.executeForOthers(
        "handleDragEnd",
        tokenId,
        initialAnchorOffset,
        trail,
        false,
        behaviour
    );

    await handleDragEnd(tokenId, initialAnchorOffset, trail, true, behaviour);
}

export async function handleDragEnd(
    tokenId: string,
    initialAnchorOffset: Offset,
    trail: CostOffset[],
    isCaller: boolean,
    behaviour: ValidMovementBehaviour
) {
    const token = canvas!.tokens?.get(tokenId) as AerisToken | undefined;
    if (!token) return;

    if (behaviour === "Tactics") {
        await token.previewAnimator.reset(initialAnchorOffset);
        await token.jumpHandler.enqueueJumps(trail, isCaller, false);
    }

    token.gridPainter.removePaint();
    token.queuedPositionOffset = null;
}

async function broadcastTokenDragCancel(
    tokenId: string,
    initialAnchorOffset: Offset,
    behaviour: ValidMovementBehaviour
) {
    socketlibSocket?.executeForOthers(
        "handleTokenDragCancel",
        tokenId,
        initialAnchorOffset,
        behaviour
    );

    await handleTokenDragCancel(tokenId, initialAnchorOffset, behaviour);
}

export async function handleTokenDragCancel(
    tokenId: string,
    initialAnchorOffset: Offset,
    behaviour: ValidMovementBehaviour
) {
    const token = canvas!.tokens?.get(tokenId) as AerisToken | undefined;
    if (!token) return;

    if (behaviour === "Tactics")
        await token.previewAnimator.reset(initialAnchorOffset);
    token.gridPainter.removePaint();
    token.queuedPositionOffset = null;
}
