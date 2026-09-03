import { MODULE_ID } from "../../constants";
import { isMoveCameraOnHoldEnabled } from "../../settings/moveCameraOnHold";
import { nearlyEqual } from "../../utils/nearlyEqual";
import { AerisToken } from "../aerisToken";

export class TokenZoomHandler {
	_initialCanvasScale: number | null = null;
	_destCanvasData: {
		pivot: { x: number; y: number };
		scale: number;
	} | null = null;

	constructor(private token: AerisToken) {}

	async zoomOut(origin: { x: number; y: number }) {
		if (!isMoveCameraOnHoldEnabled()) return;
		const gridSize = canvas?.grid?.size ?? 100;

		const padding =
			gridSize * (game.settings?.get(MODULE_ID, "cameraPanPadding") ?? 1);

		this._initialCanvasScale = canvas!.stage!.scale.x;

		(async () => {
			this._destCanvasData = await aerisCinema.panKeepEventViewportPosition(
				origin,
				this.token.pathStateManager.basePaintedTiles.map((r) => [
					r.j * gridSize - padding,
					r.i * gridSize - padding,
					gridSize + padding * 2,
					gridSize + padding * 2,
				])
			);
		})().catch(console.error);
	}

	async zoomBackIn() {
		if (!this._destCanvasData || !this._initialCanvasScale) return;

		const {
			pivot: { x, y },
			scale,
		} = this._destCanvasData;

		if (
			!nearlyEqual(x, canvas!.stage!.pivot.x) ||
			!nearlyEqual(y, canvas!.stage!.pivot.y) ||
			!nearlyEqual(scale, canvas!.stage!.scale.x)
		)
			return;

		aerisCinema.panToTargetScaleViaTicker(
			this.token.center,
			this._initialCanvasScale
		);
	}
}
