export function getActiveEncounter(sceneId = canvas?.scene?.id ?? null): Combat | null {
    const combats = getCombats();
    const sceneCombat = combats.find((combat) => isCombatActiveForScene(combat, sceneId));
    if (sceneCombat) return sceneCombat;

    const current = game.combat as Combat | null | undefined;
    return current && isCombatActiveForScene(current, sceneId) ? current : null;
}

export function hasActiveEncounter(sceneId = canvas?.scene?.id ?? null): boolean {
    return !!getActiveEncounter(sceneId);
}

function getCombats(): Combat[] {
    const combats = game.combats as unknown as Iterable<Combat> | { contents?: Combat[] } | undefined;
    if (!combats) return [];
    if (Array.isArray((combats as { contents?: Combat[] }).contents)) {
        return (combats as { contents: Combat[] }).contents;
    }
    try {
        return Array.from(combats as Iterable<Combat>);
    } catch {
        return [];
    }
}

function isCombatActiveForScene(combat: Combat, sceneId: string | null): boolean {
    if (!combat?.started) return false;
    const combatSceneId = combat.scene?.id ?? (combat as any).sceneId ?? null;
    return !sceneId || !combatSceneId || combatSceneId === sceneId;
}
