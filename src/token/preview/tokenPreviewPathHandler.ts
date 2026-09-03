import { getScaleJumpFactor } from "../../settings/jumpPercent";
import { getTokenMoveSpeed } from "../../settings/tokenSpeed";
import { disablePixiInteraction } from "../../pixi/disableInteraction";
import { socketlibSocket } from "../../socket/_socket";
import { Offset } from "../../types/canvas";
import {
	revertRotation,
	revertScaleMultiplier,
} from "../../utils/animateProperty";
import { clamp } from "../../utils/clamp";
import { isAutoRotateEnabled } from "../../utils/settings";
import { getTokenTopLeftFromAnchorOffset } from "../../utils/tiles";
import { AerisToken } from "../aerisToken";

export class TokenPreviewAnimator {
	private ticker: (() => void) | null = null;
	private lastX: number = 0;

	private rotationOffset = 0;
	private lastAppliedRotationOffset = 0;

	private currentScaleMultiplier = 1;
	private ghostSprite: PIXI.Sprite | null = null;

	constructor(private token: AerisToken) {}

	startPreview(): void {
		if (!canvas!.app || !this.token.mesh) return;

		this.removeCallback();

		this.rotationOffset = 0;
		this.lastAppliedRotationOffset = 0;
		this.currentScaleMultiplier = 1;

		const sizeX = canvas!.grid?.sizeX ?? 100;
		const sizeY = canvas!.grid?.sizeY ?? 100;

		const mesh = this.token.mesh;
		const tokenW = Math.max(sizeX, this.token.w);
		const tokenH = Math.max(sizeY, this.token.h);
		this.lastX = mesh.position.x;

		const SCALE_JUMP_FACTOR = getScaleJumpFactor();

		const getTarget = () => {
			const pos = this.token.queuedPositionOffset;
			if (!pos) return null;

			const tl = getTokenTopLeftFromAnchorOffset(this.token, pos);
			return tl ? new PIXI.Point(tl.x + tokenW / 2, tl.y + tokenH / 2) : null;
		};

		this.ticker = () => {
			const delta = (canvas!.app!.ticker.deltaMS || 16.666) / 1000;
			const mesh = this.token.mesh!;
			const target = getTarget();
			if (!target) return;
			this.updateGhost(target, tokenW, tokenH);

			// Position
			mesh.position.x += (target.x - mesh.position.x) * 6 * delta;
			mesh.position.y += (target.y - mesh.position.y) * 6 * delta;

			// Rotation
			const velocityX = mesh.position.x - this.lastX;
			this.lastX = mesh.position.x;

			if (isAutoRotateEnabled()) {
				const dx = target.x - mesh.position.x;
				const dy = target.y - mesh.position.y;
				const targetAngle = Math.atan2(dy, dx) - Math.PI / 2;

				let angleDiff = targetAngle - mesh.rotation;

				// Normalise to [-PI, PI]
				while (angleDiff > Math.PI) angleDiff -= 2 * Math.PI;
				while (angleDiff < -Math.PI) angleDiff += 2 * Math.PI;

				const ROTATION_SPEED = 6;
				mesh.rotation += angleDiff * ROTATION_SPEED * delta;
			} else {
				const velRot = clamp(velocityX * 0.025, -Math.PI / 16, Math.PI / 16);
				this.rotationOffset += (velRot - this.rotationOffset) * 7 * delta;
				const diff = this.rotationOffset - this.lastAppliedRotationOffset;
				mesh.rotation += diff;
				this.lastAppliedRotationOffset = this.rotationOffset;
			}

			// Scale
			const targetScale = SCALE_JUMP_FACTOR;
			const lastScale = this.currentScaleMultiplier;
			const nextScale = lastScale + (targetScale - lastScale) * 5 * delta;
			const frameFactor = nextScale / lastScale;

			this.currentScaleMultiplier *= frameFactor;

			mesh.scale.x *= frameFactor;
			mesh.scale.y *= frameFactor;

			this.currentScaleMultiplier = nextScale;

			this.syncTokenPosition();
		};

		canvas!.app.ticker.add(this.ticker);
	}

	async reset(initialAnchorOffset: Offset): Promise<boolean> {
		if (!canvas!.app || !this.ticker || !this.token.mesh) return false;

		this.removeCallback();

		const moveSpeed = 0.5 / getTokenMoveSpeed();

		const sizeX = canvas!.grid?.sizeX ?? 100;
		const sizeY = canvas!.grid?.sizeY ?? 100;

		const mesh = this.token.mesh;
		const tokenW = Math.max(sizeX, this.token.w);
		const tokenH = Math.max(sizeY, this.token.h);

		const tl = getTokenTopLeftFromAnchorOffset(this.token, initialAnchorOffset);
		if (!tl) return false;

		const targetX = tl.x + tokenW / 2;
		const targetY = tl.y + tokenH / 2;

		const moveP = new Promise((resolve) => {
			this.ticker = () => {
				const delta = (canvas!.app!.ticker.deltaMS || 16.666) / 1000;
				const dx = targetX - mesh.position.x;
				const dy = targetY - mesh.position.y;

				mesh.position.x += dx * 6 * delta * moveSpeed;
				mesh.position.y += dy * 6 * delta * moveSpeed;

				this.syncTokenPosition();

				const done = Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5;

				if (done) {
					this.removeCallback();
					mesh.position.set(targetX, targetY);
					resolve(true);
				}
			};

			canvas!.app!.ticker.add(this.ticker);
		});

		const rotP = revertRotation(mesh, this.rotationOffset, 200 / moveSpeed);
		const scaleP = revertScaleMultiplier(
			mesh,
			this.currentScaleMultiplier,
			200 / moveSpeed
		);

		return Promise.all([moveP, rotP, scaleP]).then(() => true);
	}

	private removeCallback() {
		if (canvas!.app?.ticker && this.ticker) {
			canvas!.app!.ticker.remove(this.ticker);
			this.ticker = null;
		}
		this.destroyGhost();
	}

	private updateGhost(target: PIXI.Point, tokenW: number, tokenH: number) {
		const texture = this.token.mesh?.texture;
		const parent = this.token.parent;
		if (!texture || !parent) return;

		if (!this.ghostSprite || this.ghostSprite.texture !== texture) {
			this.ghostSprite?.destroy();
			this.ghostSprite = new PIXI.Sprite(texture);
			this.ghostSprite.name = "tobbys-turn-planner-destination-ghost";
			this.ghostSprite.anchor.set(0.5);
			this.ghostSprite.alpha = 0.38;
			disablePixiInteraction(this.ghostSprite);
			parent.addChild(this.ghostSprite);
			if ("sortableChildren" in parent) parent.sortableChildren = true;
		}

		this.ghostSprite.visible = true;
		this.ghostSprite.tint = normalizeTint(this.token.document.texture.tint);
		this.ghostSprite.width = tokenW;
		this.ghostSprite.height = tokenH;
		this.ghostSprite.rotation = this.token.mesh?.rotation ?? 0;
		this.ghostSprite.position.copyFrom(target);
		this.ghostSprite.zIndex = (this.token.zIndex ?? 0) - 1;
	}

	private destroyGhost() {
		this.ghostSprite?.destroy();
		this.ghostSprite = null;
	}

	private syncTokenPosition() {
		const mesh = this.token.mesh!;
		const tokenW = this.token.w;
		const tokenH = this.token.h;

		this.token.x = mesh.position.x - tokenW / 2;
		this.token.y = mesh.position.y - tokenH / 2;
		this.token.document.x = this.token.x;
		this.token.document.y = this.token.y;

		if (game.settings?.get("core", "tokenDragPreview"))
			this.token.initializeSources();
	}
}

function normalizeTint(tint: string | number | null | undefined): number {
	if (typeof tint === "number") return tint;
	if (typeof tint === "string" && tint) return Number.parseInt(tint.replace("#", ""), 16);
	return 0xffffff;
}

export function tacticsBroadcastStartPreview(tokenId: string) {
	socketlibSocket?.executeForEveryone("tacticsHandleStartPreview", tokenId);
}

export function tacticsHandleStartPreview(tokenId: string) {
	const token = canvas!.tokens?.get(tokenId) as AerisToken | undefined;
	if (!token) return;

	token.previewAnimator.startPreview();
}
