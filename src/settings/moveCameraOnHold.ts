import { MODULE_ID } from "../constants";

export const MOVE_CAMERA_ON_HOLD = "moveCameraOnHold";

export function registerMoveCameraOnHoldSetting() {
	game.settings?.register(MODULE_ID, MOVE_CAMERA_ON_HOLD, {
		name: "Move Camera on Token Hold",
		hint: "Requires Aeris Cinematic View. If enabled, the camera moves to follow a token while it is being held (e.g., during drag). Disable to prevent camera movement until drop.",
		scope: "client",
		config: true,
		default: true,
		type: Boolean,
	});
}

export function isMoveCameraOnHoldEnabled(): boolean {
	return (
		game.settings?.get(MODULE_ID, MOVE_CAMERA_ON_HOLD) === true &&
		!!game.modules?.get("aeris-cinematic-view")?.active
	);
}
