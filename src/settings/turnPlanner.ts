import { MODULE_ID } from "../constants";

export const ENABLE_TURN_PLANNER = "enableTurnPlanner";
export const ENABLE_TARGET_COVER_WARNINGS = "enableTargetCoverWarnings";
export const PLANNED_TURNS = "plannedTurns";
export const TEMPLATE_EXECUTION_MODE = "templateExecutionMode";
export const COVER_HALF_BONUS = "coverHalfBonus";
export const COVER_THREE_QUARTERS_BONUS = "coverThreeQuartersBonus";
export const COVER_TOTAL_BLOCKS_TARGETING = "coverTotalBlocksTargeting";
export const ENABLE_COMBAT_SNAPSHOTS = "enableCombatSnapshots";
export const COMBAT_SNAPSHOT_LIMIT = "combatSnapshotLimit";
export const COMBAT_SNAPSHOTS = "combatSnapshots";

export type TemplateExecutionMode = "stored" | "replace" | "none";

export type CoverRuleConfig = {
    halfBonus: number;
    threeQuartersBonus: number;
    totalBlocksTargeting: boolean;
};

export function registerTurnPlannerSettings() {
    game.settings?.register(MODULE_ID, ENABLE_TURN_PLANNER as any, {
        name: "Enable Turn Planner",
        hint: "Adds private turn-planning controls for movement, spell and weapon activity previews, cover, and average damage.",
        scope: "world",
        config: true,
        default: true,
        type: Boolean,
    });

    game.settings?.register(MODULE_ID, TEMPLATE_EXECUTION_MODE as any, {
        name: "Template Execution",
        hint: "Choose how planned templates are handled when executing a planned turn. This never rolls dice.",
        scope: "client",
        config: true,
        default: "stored",
        type: String,
        choices: {
            stored: "Use Planned Placement (v13 Templates)",
            replace: "Place Again",
            none: "Do Not Place Template",
        },
    });

    game.settings?.register(MODULE_ID, ENABLE_TARGET_COVER_WARNINGS as any, {
        name: "Warn About Cover When Targeting",
        hint: "When a controlled token targets a hostile token, warn the user if walls or intervening tokens grant cover.",
        scope: "client",
        config: true,
        default: true,
        type: Boolean,
    });

    game.settings?.register(MODULE_ID, COVER_HALF_BONUS as any, {
        name: "Half Cover Bonus",
        hint: "Bonus applied by half cover. Standard 5e is +2 to AC and Dexterity saving throws.",
        scope: "world",
        config: true,
        default: 2,
        type: Number,
    });

    game.settings?.register(MODULE_ID, COVER_THREE_QUARTERS_BONUS as any, {
        name: "Three-Quarters Cover Bonus",
        hint: "Bonus applied by three-quarters cover. Standard 5e is +5 to AC and Dexterity saving throws.",
        scope: "world",
        config: true,
        default: 5,
        type: Number,
    });

    game.settings?.register(MODULE_ID, COVER_TOTAL_BLOCKS_TARGETING as any, {
        name: "Total Cover Blocks Targeting",
        hint: "When enabled, total cover is shown as blocking direct targeting instead of a numeric bonus.",
        scope: "world",
        config: true,
        default: true,
        type: Boolean,
    });

    game.settings?.register(MODULE_ID, ENABLE_COMBAT_SNAPSHOTS as any, {
        name: "Enable DM Combat Snapshots",
        hint: "Automatically saves DM-only map state snapshots at the start of each combat turn for rollback.",
        scope: "world",
        config: true,
        default: true,
        type: Boolean,
    });

    game.settings?.register(MODULE_ID, COMBAT_SNAPSHOT_LIMIT as any, {
        name: "Combat Snapshot Limit",
        hint: "Maximum turn snapshots kept per combat encounter.",
        scope: "world",
        config: true,
        default: 10,
        type: Number,
    });

    game.settings?.register(MODULE_ID, PLANNED_TURNS as any, {
        name: "Planned Turns",
        scope: "client",
        config: false,
        default: {},
        type: Object,
    } as any);

    game.settings?.register(MODULE_ID, COMBAT_SNAPSHOTS as any, {
        name: "Combat Snapshots",
        scope: "world",
        config: false,
        default: {},
        type: Object,
    } as any);
}

export function isTurnPlannerEnabled(): boolean {
    return (game.settings?.get(MODULE_ID, ENABLE_TURN_PLANNER as any) as boolean) ?? true;
}

export function isTargetCoverWarningEnabled(): boolean {
    return (
        (game.settings?.get(
            MODULE_ID,
            ENABLE_TARGET_COVER_WARNINGS as any
        ) as boolean) ?? true
    );
}

export function getTemplateExecutionMode(): TemplateExecutionMode {
    const mode =
        (game.settings?.get(
            MODULE_ID,
            TEMPLATE_EXECUTION_MODE as any
        ) as TemplateExecutionMode | "ask") ?? "stored";
    return mode === "ask" ? "stored" : mode;
}

export function getCoverRuleConfig(): CoverRuleConfig {
    return {
        halfBonus:
            (game.settings?.get(MODULE_ID, COVER_HALF_BONUS as any) as number) ?? 2,
        threeQuartersBonus:
            (game.settings?.get(
                MODULE_ID,
                COVER_THREE_QUARTERS_BONUS as any
            ) as number) ?? 5,
        totalBlocksTargeting:
            (game.settings?.get(
                MODULE_ID,
                COVER_TOTAL_BLOCKS_TARGETING as any
            ) as boolean) ?? true,
    };
}

export function areCombatSnapshotsEnabled(): boolean {
    return (
        (game.settings?.get(MODULE_ID, ENABLE_COMBAT_SNAPSHOTS as any) as boolean) ??
        true
    );
}

export function getCombatSnapshotLimit(): number {
    const value =
        (game.settings?.get(MODULE_ID, COMBAT_SNAPSHOT_LIMIT as any) as number) ??
        10;
    return Math.max(1, Math.floor(Number(value) || 10));
}
