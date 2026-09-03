import { CostOffset } from "../token/trail/costPath";
import { Offset } from "../types/canvas";

export type PlannedTemplate = {
    type: string;
    x: number;
    y: number;
    direction: number;
    distance: number;
    width?: number;
    angle?: number;
};

export type PlannedAction = {
    itemUuid: string;
    activityId: string;
    label: string;
    activationType?: string;
    template?: PlannedTemplate;
};

export type PlannedTurn = {
    id: string;
    userId: string;
    sceneId: string;
    tokenId: string;
    tokenName: string;
    actorUuid: string | null;
    origin: { x: number; y: number; elevation?: number };
    originOffset: Offset;
    destination: { x: number; y: number; elevation?: number };
    destinationOffset: Offset;
    path: CostOffset[];
    action?: PlannedAction;
    bonusAction?: PlannedAction;
    template?: PlannedTemplate;
    createdAt: number;
};

export type PlannerActionOption = {
    id: string;
    group: "spell" | "scroll" | "weapon" | "other";
    item: Item;
    activity: any;
    label: string;
    detail: string;
    activationType: string;
    activationLabel: string;
    rangeLabel: string;
    rangeDistance: number | null;
};

export type DamagePreview = {
    total: number;
    parts: { formula: string; average: number; type?: string }[];
};

export type CoverLevel = "none" | "half" | "threeQuarters" | "total";

export type CoverPreview = {
    target: Token;
    cover: CoverLevel;
    blocked: number;
    total: number;
};
