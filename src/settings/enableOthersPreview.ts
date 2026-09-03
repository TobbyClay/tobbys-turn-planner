import { MODULE_ID } from "../constants";

export const ENABLE_OTHERS_PREVIEW = "enableOthersPreview";

export function registerEnableOthersPreviewSetting() {
	game.settings?.register(MODULE_ID, ENABLE_OTHERS_PREVIEW, {
		name: "Enabled Others' Token Previews",
		hint: "If enabled, users will see token previews made by others in Tactics mode.",
		scope: "world",
		config: true,
		default: false,
		type: Boolean,
	});
}

export function canSeeOthersPreview(): boolean {
	return game.settings?.get(MODULE_ID, ENABLE_OTHERS_PREVIEW) ?? false;
}
