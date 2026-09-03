import { DamagePreview } from "./types";

export async function getAverageDamagePreview(activity: any): Promise<DamagePreview> {
    const config = activity?.getDamageConfig?.({}) ?? { rolls: [] };
    const parts: DamagePreview["parts"] = [];

    for (const roll of config.rolls ?? []) {
        const formula = (roll.parts ?? []).filter(Boolean).join(" + ");
        if (!formula) continue;

        const resolved = (Roll as any).defaultImplementation.replaceFormulaData(
            formula,
            roll.data ?? {}
        );
        const average = await deterministicAverage(resolved);
        const type =
            roll.options?.type ??
            (Array.isArray(roll.options?.types) ? roll.options.types[0] : undefined);

        parts.push({ formula: resolved, average, type });
    }

    return {
        total: parts.reduce((sum, part) => sum + part.average, 0),
        parts,
    };
}

async function deterministicAverage(formula: string): Promise<number> {
    try {
        const minRoll = await (Roll as any).create(formula).evaluate({ minimize: true });
        const maxRoll = await (Roll as any).create(formula).evaluate({ maximize: true });
        return Math.floor(((minRoll.total ?? 0) + (maxRoll.total ?? 0)) / 2);
    } catch (err) {
        console.warn(`Tobby's Turn Planner could not average formula "${formula}".`, err);
        return 0;
    }
}
