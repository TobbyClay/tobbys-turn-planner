import { MODULE_ID } from "../constants";

export const CAMERA_PAN_PADDING = "cameraPanPadding";
export const CAMERA_PAN_PADDING_CHANGED = "cameraPanPaddingChanged";

export function registerCameraPanPaddingSetting() {
    game.settings?.register(MODULE_ID, CAMERA_PAN_PADDING, {
        name: "Camera Pan Padding",
        hint: "Used by the Move Camera on Token Hold setting. Extra zoom-out padding in grid units when the camera pans to focus. 0 for tight focus, higher values add more space.",
        scope: "client",
        config: true,
        default: 1,
        type: Number,
        range: {
            min: 0,
            max: 5,
            step: 0.1,
        },
    });
}
