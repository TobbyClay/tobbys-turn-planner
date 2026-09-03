import { PlannerActionOption } from "./types";

const ACTION_TYPES = new Set(["attack", "save", "damage", "heal"]);

export function getPlannerActions(actor: Actor | null): PlannerActionOption[] {
    if (!actor) return [];

    const out: PlannerActionOption[] = [];
    for (const item of actor.items ?? []) {
        const activities = getActivities(item);
        if (!activities.length) continue;

        for (const activity of activities) {
            if (!isUsefulActivity(activity)) continue;
            const group = getGroup(item);
            const activationType = getActivationType(activity, item);
            const activationLabel = getActivationLabel(activationType);
            const rangeLabel = getRangeLabel(activity, item);
            const rangeDistance = getRangeDistance(activity, item);
            const detail = getActivityDetail(activity, item, activationLabel, rangeLabel);
            out.push({
                id: `${item.uuid}::${activity.id}`,
                group,
                item,
                activity,
                label:
                    activity.name && activity.name !== item.name
                        ? `${item.name}: ${activity.name}`
                        : item.name,
                detail,
                activationType,
                activationLabel,
                rangeLabel,
                rangeDistance,
            });
        }
    }

    return out.sort((a, b) => {
        const groupOrder = groupWeight(a.group) - groupWeight(b.group);
        if (groupOrder) return groupOrder;
        const activationOrder = activationWeight(a.activationType) - activationWeight(b.activationType);
        if (activationOrder) return activationOrder;
        return a.label.localeCompare(b.label);
    });
}

function getActivities(item: Item): any[] {
    const activities = (item as any).system?.activities;
    if (!activities) return [];
    if (Array.isArray(activities.contents)) return activities.contents;
    if (typeof activities.values === "function") return Array.from(activities.values());
    return [];
}

function isUsefulActivity(activity: any): boolean {
    if (!activity) return false;
    if (ACTION_TYPES.has(activity.type)) return true;
    if (activity.target?.template?.type) return true;
    if (activity.damage?.parts?.length) return true;
    if (activity.healing?.formula) return true;
    return false;
}

function getGroup(item: Item): PlannerActionOption["group"] {
    const itemType = String(item.type);
    if (itemType === "weapon") return "weapon";
    if (itemType === "spell") return "spell";

    const type = (item as any).system?.type?.value ?? (item as any).system?.type;
    const name = item.name.toLocaleLowerCase();
    if (itemType === "consumable" && (type === "scroll" || name.includes("scroll"))) {
        return "scroll";
    }

    return "other";
}

function groupWeight(group: PlannerActionOption["group"]): number {
    switch (group) {
        case "spell":
            return 0;
        case "scroll":
            return 1;
        case "weapon":
            return 2;
        default:
            return 3;
    }
}

function getActivityDetail(
    activity: any,
    item: Item,
    activationLabel: string,
    rangeLabel: string
): string {
    const parts: string[] = [];
    if (activity.type) parts.push(String(activity.type));
    if (activationLabel) parts.push(activationLabel);
    if (rangeLabel) parts.push(rangeLabel);
    const template = activity.target?.template;
    if (template?.type && template?.size) {
        parts.push(`${template.size} ${canvas?.scene?.grid?.units ?? ""} ${template.type}`);
    }
    const itemRange = (item as any).labels?.range;
    if (!rangeLabel && itemRange) parts.push(String(itemRange));
    return parts.filter(Boolean).join(" | ");
}

function getActivationType(activity: any, item: Item): string {
    return String(activity?.activation?.type ?? (item as any).system?.activation?.type ?? "action");
}

function getActivationLabel(type: string): string {
    const config = (CONFIG as any).DND5E?.activityActivationTypes?.[type];
    const label = config?.label ?? config?.header ?? config;
    if (typeof label === "string" && label) return game.i18n?.localize(label) ?? label;

    switch (type) {
        case "action":
            return "Action";
        case "bonus":
            return "Bonus Action";
        case "reaction":
            return "Reaction";
        case "minute":
            return "Minute";
        case "hour":
            return "Hour";
        case "day":
            return "Day";
        case "legendary":
            return "Legendary Action";
        case "lair":
            return "Lair Action";
        case "special":
            return "Special";
        default:
            return titleCase(type || "Action");
    }
}

function activationWeight(type: string): number {
    switch (type) {
        case "action":
            return 0;
        case "bonus":
            return 1;
        case "reaction":
            return 2;
        case "legendary":
        case "lair":
            return 3;
        default:
            return 4;
    }
}

function getRangeLabel(activity: any, item: Item): string {
    const labels = [
        activity?.labels?.range,
        activity?.range?.labels?.range,
        activity?.range?.labels?.description,
        (item as any).labels?.range,
        (item as any).system?.range?.labels?.range,
        (item as any).system?.range?.labels?.description,
    ];
    const existing = labels.find((label) => typeof label === "string" && label.trim());
    if (existing) return String(existing);

    const range = getRangeData(activity, item);
    const units = String(range?.units ?? "");
    const value = Number(range?.value);
    if (units === "self") return "Self";
    if (units === "touch") return "Touch";
    if (units === "spec" || units === "special") return "Special";
    if (Number.isFinite(value) && value > 0) return `${formatNumber(value)} ${rangeUnitLabel(units)}`.trim();
    return "";
}

function getRangeDistance(activity: any, item: Item): number | null {
    const range = getRangeData(activity, item);
    const units = String(range?.units ?? "").toLocaleLowerCase();
    if (units === "self" || units === "spec" || units === "special") return null;
    if (units === "touch") return canvas?.scene?.grid?.distance ?? 5;

    const value = Number(range?.value);
    if (!Number.isFinite(value) || value <= 0) return null;

    switch (units) {
        case "mi":
        case "mile":
        case "miles":
            return value * 5280;
        case "m":
        case "meter":
        case "meters":
            return value * 3.28084;
        default:
            return value;
    }
}

function getRangeData(activity: any, item: Item): any {
    const activityRange = activity?.range;
    if (hasRangeValue(activityRange)) return activityRange;

    const itemRange = (item as any).system?.range;
    if (hasRangeValue(itemRange)) return itemRange;

    return activityRange ?? itemRange ?? null;
}

function hasRangeValue(range: any): boolean {
    if (!range) return false;
    if (range.units) return true;
    const value = Number(range.value);
    return Number.isFinite(value) && value > 0;
}

function rangeUnitLabel(units: string): string {
    if (!units) return canvas?.scene?.grid?.units ?? "";
    const config = (CONFIG as any).DND5E?.movementUnits?.[units] ?? (CONFIG as any).DND5E?.distanceUnits?.[units];
    const label = config?.abbreviation ?? config?.label ?? config;
    if (typeof label === "string" && label) return game.i18n?.localize(label) ?? label;
    return units;
}

function titleCase(value: string): string {
    return value
        .replace(/[-_]/g, " ")
        .replace(/\b\w/g, (letter) => letter.toLocaleUpperCase());
}

function formatNumber(value: number) {
    return Number.isInteger(value) ? String(value) : value.toFixed(1);
}
