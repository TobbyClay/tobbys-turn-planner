import {
	getGridTravelSound,
	isGridTravelSoundEnable,
} from "../../settings/gridSound";
import { getScaleJumpFactor } from "../../settings/jumpPercent";
import { getTokenMoveSpeed } from "../../settings/tokenSpeed";
import { revertRotation } from "../../utils/animateProperty";
import { clamp } from "../../utils/clamp";
import { easeOutQuint } from "../../utils/easings";
import { isAutoRotateEnabled } from "../../utils/settings";
import { sleep } from "../../utils/sleep";
import { getTokenTopLeftFromAnchorOffset } from "../../utils/tiles";
import { getGameInterfaceVolume } from "../../utils/volume";
import { AerisToken } from "../aerisToken";
import { CostOffset } from "../trail/costPath";

export class TokenJumpHandler {
	private isJumping: boolean = false;
	private lastX: number | null = null;
	private smoothedVx: number = 0;
	private baseScaleX = 1;
	private baseScaleY = 1;

	private trailQueue: CostOffset[] = [];

	private rotationOffset = 0;

	constructor(private token: AerisToken) {}

	private getRotationTarget() {
		return clamp(this.smoothedVx * 0.025, -Math.PI / 16, Math.PI / 16);
	}

	public async enqueueJumps(
		trail: CostOffset[],
		isCaller: boolean,
		lastOnly: boolean
	) {
		this.trailQueue.push(...trail);
		if (!this.isJumping) {
			await this.jumpLoop(isCaller, lastOnly);
		}
	}

	private async jumpLoop(isCaller: boolean, lastOnly: boolean) {
		this.isJumping = true;

		this.baseScaleX = this.token.mesh?.scale._x ?? 1;
		this.baseScaleY = this.token.mesh?.scale._y ?? 1;

		const rotateTowardsDirection = isAutoRotateEnabled();

		const moveSpeed = 0.5 / getTokenMoveSpeed();

		let i = 0;

		while (true) {
			if (!this.trailQueue.length) break;
			while (this.trailQueue.length) {
				if (lastOnly) {
					const last = this.trailQueue[this.trailQueue.length - 1];
					this.trailQueue = [];

					await this.singleJump(last, isCaller, i, {
						rotateTowardsDirection,
					});
				} else {
					if (isCaller && game.paused && !game.user?.isGM) break;
					const next = this.trailQueue.shift()!;

					await this.singleJump(next, isCaller, i++, {
						rotateTowardsDirection,
					});
				}
			}
			await revertRotation(
				this.token.mesh!,
				this.rotationOffset,
				400 / moveSpeed,
				easeOutQuint
			);
			this.rotationOffset = 0;
		}

		this.isJumping = false;
	}

	private singleJump(
		pos: CostOffset,
		isCaller: boolean,
		i: number,
		options?: {
			rotateTowardsDirection?: boolean;
		}
	): Promise<boolean> {
		const mesh = this.token.mesh;
		if (!mesh) return Promise.resolve(false);

		const sizeX = canvas!.grid?.sizeX ?? 100;
		const sizeY = canvas!.grid?.sizeY ?? 100;

		const tokenW = Math.max(sizeX, this.token.w);
		const tokenH = Math.max(sizeY, this.token.h);

		const tl = getTokenTopLeftFromAnchorOffset(this.token, pos)!;
		const endX = tl.x + tokenW / 2,
			endY = tl.y + tokenH / 2;
		const startX = mesh.position.x,
			startY = mesh.position.y;
		if (Math.hypot(startX - endX, startY - endY) < 1)
			return Promise.resolve(false);

		let targetRotation: number | null = null;
		if (options?.rotateTowardsDirection) {
			const dx = endX - startX;
			const dy = endY - startY;
			targetRotation = Math.atan2(dy, dx) - Math.PI / 2;
		}

		const JUMP_SCALE_FACTOR = getScaleJumpFactor();
		const duration = getTokenMoveSpeed() * 1000;

		const easeInOutQuad = (t: number) =>
			t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;

		return new Promise((resolve) => {
			const startTime = performance.now();

			const ticker = () => {
				const delta = (canvas!.app!.ticker.deltaMS || 16.666) / 1000;
				const now = performance.now();

				const elapsed = now - startTime;
				const p = Math.min(elapsed / duration, 1);
				const e = easeInOutQuad(p);

				mesh.position.x = startX + (endX - startX) * e;

				const linearY = startY + (endY - startY) * p;
				mesh.position.y = linearY;

				const velocityX =
					mesh.position.x - (this.lastX ?? mesh.position.x);
				this.smoothedVx += (velocityX - this.smoothedVx) * 10 * delta;

				this.lastX = mesh.position.x;

				if (options?.rotateTowardsDirection) {
					const current = mesh.rotation;
					let deltaRot = targetRotation! - current;

					while (deltaRot > Math.PI) deltaRot -= 2 * Math.PI;
					while (deltaRot < -Math.PI) deltaRot += 2 * Math.PI;

					const ROTATION_SPEED = 6;
					mesh.rotation += deltaRot * delta * ROTATION_SPEED;

					this.token.gridPainter.updateTextContainerRotation(
						mesh.rotation
					);
				} else {
					const rotIncrease =
						(this.getRotationTarget() - this.rotationOffset) *
						2.5 *
						delta;

					mesh.rotation += rotIncrease;
					this.rotationOffset += rotIncrease;
				}

				const scaleJump =
					1 + (JUMP_SCALE_FACTOR - 1) * Math.sin(Math.PI * p);
				mesh.scale.set(
					this.baseScaleX * scaleJump,
					this.baseScaleY * scaleJump
				);

				this.syncPosition();

				if (p === 1) {
					mesh.position.set(endX, endY);
					mesh.scale.set(this.baseScaleX, this.baseScaleY);
					this.syncPosition();
					if (isGridTravelSoundEnable() && this.token.visible) {
						const sound = getGridTravelSound(
							this.token.actor,
							pos.mode,
							i
						);
						game.audio?.play(sound, {
							volume: getGameInterfaceVolume(),
						});
					}
					canvas!.app?.ticker.remove(ticker);

					(async () => {
						if (isCaller) {
							await this.token.document.update(
								{
									x: this.token.x,
									y: this.token.y,
									...(isAutoRotateEnabled() && {
										rotation:
											(this.token.mesh?.rotation ?? 0) *
											PIXI.RAD_TO_DEG,
									}),
								},
								{
									//@ts-expect-error untyped
									supressPaint: true,
									animate: false,
									panCamera: false,
											movement: {
												// @ts-ignore untyped
												[this.token.id]: {
													constrainOptions: {
														ignoreWalls: true,
													},
												},
											},
								}
							);
							await sleep(20);
						}

						resolve(true);
					})();

					// revertRotation(this.token.mesh!, this.rotationOffset, 200);
				}
			};

			canvas!.app!.ticker.add(ticker);
		});
	}

	private syncPosition() {
		const mesh = this.token.mesh!;
		this.token.x = mesh.position.x - this.token.w / 2;
		this.token.y = mesh.position.y - this.token.h / 2;
		this.token.document.x = this.token.x;
		this.token.document.y = this.token.y;
		this.token.initializeSources();
		canvas!.perception.update({
			refreshVision: true,
		});
	}
}
