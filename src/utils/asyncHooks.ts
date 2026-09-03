import { log } from "./logging";

export async function asyncHooksCallAll(
	hook: string,
	...args: any[]
): Promise<boolean | undefined> {
	if (CONFIG.debug.hooks) {
		log(`asyncHooksCallAll ${hook} hook with args:`, ...args);
	}

	const hookEvents = Hooks.events[hook];
	if (!hookEvents) return undefined;

	for (const entry of Array.from(hookEvents)) {
		try {
			const result = hookCall(entry, args);
			if (result && typeof result.then === "function") {
				await result;
			}
		} catch (err) {
			const message = `hooked function for hook ${hook}`;
			log(message, err);
		}
	}
	return true;
}

export async function asyncHooksCall(
	hook: string,
	...args: any[]
): Promise<boolean | undefined> {
	if (CONFIG.debug.hooks) {
		log(`asyncHooksCall ${hook} hook with args:`, ...args);
	}

	const hookEvents = Hooks.events[hook];
	if (!hookEvents) return undefined;

	for (const entry of Array.from(hookEvents)) {
		let callAdditional;
		try {
			const result = hookCall(entry, args);
			if (result && typeof result.then === "function")
				callAdditional = await result;
			else callAdditional = result;
		} catch (err) {
			const message = `hooked function for hook ${hook}`;
			log(message, err);
		}
		if (callAdditional === false) return false;
	}
	return true;
}

export function hookCall(entry: any, args: any[]) {
	const { hook, id, fn, once } = entry;
	if (once) Hooks.off(hook, id);
	try {
		return entry.fn(...args);
	} catch (err: any) {
		const message = `Error thrown in hooked function '${fn?.name}' for hook '${hook}'`;
		log(`midi | ${message}`);
		if (hook !== "error")
			Hooks.onError("Hooks.#call", err, {
				message,
				hook,
				fn,
				log: "error",
			});
	}
}
