import { CostOffset } from "./costPath";

const label = (mode: MovementMode) =>
    game.i18n?.localize?.(`TOKEN.MOVEMENT.ACTIONS.${mode}.label`) ?? mode;

export function formatTrailSegments(trail: CostOffset[]): string {
    if (!trail.length) return ""; // need at least one hop

    if (trail.length === 1) {
        return `Drag to move`;
    }

    const distance = canvas!.grid?.distance ?? 1;
    const units = canvas!.grid?.units ? ` ${canvas!.grid.units}` : "";

    const chunks: { mode: MovementMode; total: number }[] = [];

    let curMode: MovementMode | null = null;
    let running = 0;

    for (let i = 1; i < trail.length; i++) {
        const prev = trail[i - 1];
        const seg = trail[i];

        const delta = seg.cost - prev.cost;
        if (delta === 0) continue;

        if (seg.mode === curMode) running += delta;
        else {
            if (curMode) chunks.push({ mode: curMode, total: running });
            curMode = seg.mode;
            running = delta;
        }
    }
    if (curMode) chunks.push({ mode: curMode, total: running });

    return chunks
        .map(({ mode, total }) => `${label(mode)} ${total * distance}${units}`)
        .join(" > ");
}
