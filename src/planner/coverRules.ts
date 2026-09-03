import { getCoverRuleConfig } from "../settings/turnPlanner";
import type { CoverLevel } from "./types";

export function coverLabel(cover: CoverLevel): string {
    switch (cover) {
        case "half":
            return "Half";
        case "threeQuarters":
            return "Three-Quarters";
        case "total":
            return "Total";
        default:
            return "None";
    }
}

export function coverEffect(cover: CoverLevel): string {
    const rules = getCoverRuleConfig();
    switch (cover) {
        case "half":
            return `${formatBonus(rules.halfBonus)} AC and Dex saves`;
        case "threeQuarters":
            return `${formatBonus(rules.threeQuartersBonus)} AC and Dex saves`;
        case "total":
            return rules.totalBlocksTargeting
                ? "Cannot be directly targeted"
                : "Total cover applies by table ruling";
        default:
            return "No cover effect";
    }
}

function formatBonus(value: number): string {
    const numeric = Number.isFinite(value) ? value : 0;
    return numeric >= 0 ? `+${numeric}` : `-${Math.abs(numeric)}`;
}
