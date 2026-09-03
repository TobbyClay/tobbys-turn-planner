import { socketlibSocket } from "../socket/_socket";

const _patternCache: Record<string, string[]> = {};

/**
 * Returns all file paths matching a wildcard pattern.
 * @param pattern - A full path with a wildcard, e.g. "modules/foo/*.ogg"
 * @param forceReload - If true, bypasses the cache
 */
export async function resolveWildcardMatches(
    pattern: string,
    forceReload: boolean = false
): Promise<string[]> {
    if (!game.user?.isGM) {
        const result =
            (await socketlibSocket?.executeAsGM(
                "resolveWildcardMatches",
                pattern,
                forceReload
            )) ?? [];
        _patternCache[pattern] = result;
    }

    if (!pattern.includes("*")) return [pattern];

    if (_patternCache[pattern] && (!game.user?.isGM || !forceReload)) {
        return _patternCache[pattern];
    }

    const folder = pattern.substring(0, pattern.lastIndexOf("/"));
    const wildcard = pattern.substring(pattern.lastIndexOf("/") + 1);
    const regex = new RegExp(
        "^" + wildcard.replace(/\./g, "\\.").replace(/\*/g, ".*") + "$"
    );

    try {
        const { files } = await foundry.applications.apps.FilePicker.browse(
            "data",
            folder
        );
        const matches = files.filter((f) =>
            regex.test(f.split("/").pop() ?? "")
        );
        _patternCache[pattern] = matches;
        return matches;
    } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        console.warn(`Wildcard resolution failed for ${pattern}: ${msg}`);
        return [];
    }
}

export function syncCacheResolveWildcardMatches(
    pattern: string
): string[] | undefined {
    if (!pattern.includes("*")) return [pattern];

    if (_patternCache[pattern]) {
        return _patternCache[pattern];
    }
}
