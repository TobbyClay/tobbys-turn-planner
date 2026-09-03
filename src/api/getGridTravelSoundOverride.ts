import { MODULE_ID } from "../constants";

let _warnedInvalidSoundOverride = false;

export function callGetGridTravelSoundOverride(
	actor?: Actor,
	mode?: string,
	index?: number
): string | undefined {
	const unvalidated: unknown[] = [];
	Hooks.call(
		`${MODULE_ID}.getGridTravelSoundOverride`,
		actor,
		mode,
		index,
		unvalidated
	);
	return validateSoundOverride(unvalidated);
}

function validateSoundOverride(input: unknown[]): string | undefined {
	for (const entry of input) {
		if (typeof entry === "string" && entry.trim()) {
			return entry.trim(); // Use the first valid string
		}
	}

	if (!_warnedInvalidSoundOverride && input.length > 0) {
		_warnedInvalidSoundOverride = true;
		ui.notifications?.warn(
			`A grid-travel sound override entry was ignored because it wasn't a valid string.`
		);
	}

	return undefined;
}
