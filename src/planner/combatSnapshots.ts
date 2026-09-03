import { MODULE_ID } from "../constants";
import {
    areCombatSnapshotsEnabled,
    COMBAT_SNAPSHOTS,
    getCombatSnapshotLimit,
} from "../settings/turnPlanner";
import { disablePixiInteraction } from "../pixi/disableInteraction";
import { getActiveEncounter, hasActiveEncounter } from "./combatScope";

const { ApplicationV2, DialogV2 } = foundry.applications.api as any;

type SnapshotDocumentSet = Record<string, Record<string, any>>;

type ActorSnapshot = {
    key: string;
    uuid: string | null;
    actorId: string | null;
    tokenId: string | null;
    name: string;
    data: any;
};

type SnapshotSummary = {
    moved: MovementSummary[];
    hp: string[];
    resources: string[];
};

type MovementSummary = {
    tokenId: string;
    name: string;
    distance: number;
    units: string;
    from: any;
    to: any;
};

type CombatSnapshot = {
    id: string;
    reason: string;
    sceneId: string;
    combatId: string;
    round: number;
    turn: number;
    turnKey: string;
    combatantId: string | null;
    combatantName: string;
    createdAt: number;
    documents: SnapshotDocumentSet;
    actors: ActorSnapshot[];
};

type SnapshotStore = Record<string, CombatSnapshot[]>;

type EmbeddedConfig = {
    documentName: string;
    collection: string;
    label: string;
};

const EMBEDDED_DOCUMENTS: EmbeddedConfig[] = [
    { documentName: "Token", collection: "tokens", label: "Tokens" },
    { documentName: "MeasuredTemplate", collection: "templates", label: "Templates" },
    { documentName: "Region", collection: "regions", label: "Regions" },
    { documentName: "Drawing", collection: "drawings", label: "Drawings" },
    { documentName: "Tile", collection: "tiles", label: "Tiles" },
    { documentName: "AmbientLight", collection: "lights", label: "Lights" },
    { documentName: "AmbientSound", collection: "sounds", label: "Sounds" },
    { documentName: "Wall", collection: "walls", label: "Walls" },
    { documentName: "Note", collection: "notes", label: "Notes" },
];

class CombatSnapshotsApplication extends ApplicationV2 {
    static DEFAULT_OPTIONS = {
        id: "tobbys-turn-planner-combat-snapshots",
        classes: ["tobbys-turn-planner", "tobbys-turn-planner-snapshots"],
        tag: "section",
        position: {
            width: 520,
            height: 520,
        },
        window: {
            title: "Combat Snapshots",
            icon: "fa-solid fa-clock-rotate-left",
            resizable: true,
            contentClasses: ["ttp-snapshot-window-content"],
        },
    };

    protected async _renderHTML(_context: object, _options: object): Promise<HTMLElement> {
        const root = document.createElement("div");
        root.className = "ttp-snapshot-root";
        root.innerHTML = renderSnapshotContent();
        return root;
    }

    protected _replaceHTML(result: HTMLElement, content: HTMLElement, _options: object): void {
        content.replaceChildren(result);
        activateSnapshotListeners(content, this);
    }

    async close(options?: object): Promise<this> {
        clearSnapshotGhosts();
        snapshotsApp = null;
        return super.close(options);
    }
}

let snapshotsApp: CombatSnapshotsApplication | null = null;
let snapshotGhostLayer: PIXI.Container | null = null;

export function setupCombatSnapshots() {
    Hooks.on("combatStart", (combat: Combat) => {
        void saveAutomaticSnapshot(combat, "Combat Start");
    });

    Hooks.on("combatTurnChange", (combat: Combat) => {
        void saveAutomaticSnapshot(combat, "Turn Start");
    });

    Hooks.on("renderCombatTracker", (_app: object, html: HTMLElement | JQuery) => {
        renderCombatTrackerButton(html);
    });
}

function renderCombatTrackerButton(html: HTMLElement | JQuery) {
    if (!game.user?.isGM || !areCombatSnapshotsEnabled() || !hasActiveEncounter()) return;
    const root = getHtmlElement(html);
    if (!root || root.querySelector('[data-action="ttp-open-snapshots"]')) return;

    const button = document.createElement("button");
    button.type = "button";
    button.className = "ttp-combat-snapshot-button";
    button.dataset.action = "ttp-open-snapshots";
    button.innerHTML = '<i class="fa-solid fa-clock-rotate-left"></i><span>Snapshots</span>';
    button.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        openCombatSnapshots();
    });

    const footer =
        root.querySelector<HTMLElement>("footer") ??
        root.querySelector<HTMLElement>(".directory-footer") ??
        root.querySelector<HTMLElement>(".combat-tracker-header") ??
        root;
    footer.appendChild(button);
}

export function openCombatSnapshots() {
    if (!game.user?.isGM) return;
    snapshotsApp ??= new CombatSnapshotsApplication();
    void snapshotsApp.render({ force: true });
}

async function saveAutomaticSnapshot(combat: Combat, reason: string) {
    if (!game.user?.isGM || !areCombatSnapshotsEnabled()) return;
    if (!combat?.started) return;

    const store = getSnapshotStore();
    const snapshots = store[combat.id ?? ""] ?? [];
    const turnKey = getTurnKey(combat);
    const latest = snapshots.at(-1);
    if (latest?.turnKey === turnKey) return;

    await saveSnapshot(combat, reason, store);
}

async function saveManualSnapshot() {
    const combat = getActiveEncounter();
    if (!combat) {
        ui.notifications?.warn("No active encounter is available for a snapshot.");
        return;
    }
    await saveSnapshot(combat, "Manual Snapshot");
    void snapshotsApp?.render({ force: true });
}

async function saveSnapshot(combat: Combat, reason: string, existingStore?: SnapshotStore): Promise<CombatSnapshot | null> {
    const scene = combat.scene ?? canvas?.scene;
    if (!scene || !combat.id) return null;

    const snapshot: CombatSnapshot = {
        id: foundry.utils.randomID(),
        reason,
        sceneId: scene.id!,
        combatId: combat.id,
        round: combat.round ?? 0,
        turn: combat.turn ?? 0,
        turnKey: getTurnKey(combat),
        combatantId: combat.combatant?.id ?? null,
        combatantName: combat.combatant?.name ?? "Unknown Combatant",
        createdAt: Date.now(),
        documents: collectSceneDocuments(scene),
        actors: collectActorSnapshots(scene),
    };

    const store = existingStore ?? getSnapshotStore();
    const snapshots = [...(store[combat.id] ?? []), snapshot];
    store[combat.id] = snapshots.slice(-getCombatSnapshotLimit());
    await game.settings?.set(MODULE_ID, COMBAT_SNAPSHOTS as any, store as any);
    return snapshot;
}

function renderSnapshotContent(): string {
    if (!game.user?.isGM) return `<div class="ttp-snapshot-shell"><div class="ttp-muted">GM only.</div></div>`;

    const combat = getActiveEncounter();
    if (!combat) {
        return `<div class="ttp-snapshot-shell"><div class="ttp-muted">No active encounter.</div></div>`;
    }

    const snapshots = getSnapshotsForCombat(combat.id ?? "");
    const chronological = snapshots.slice();
    const rows = chronological
        .slice()
        .reverse()
        .map((snapshot) => renderSnapshotRow(snapshot, getSummaryForSnapshot(snapshot, chronological)))
        .join("");

    return `
        <div class="ttp-snapshot-shell">
            <div class="ttp-planner-banner">
                <div>
                    <span class="ttp-kicker">DM Tools</span>
                    <strong>Combat Snapshots</strong>
                </div>
                <span class="ttp-phase-pill">Round ${combat.round ?? 0}</span>
            </div>
            <div class="ttp-snapshot-toolbar">
                <button type="button" data-action="manual-snapshot"><i class="fa-solid fa-camera"></i><span>Save Current</span></button>
            </div>
            ${
                rows
                    ? `<div class="ttp-snapshot-list">${rows}</div>`
                    : `<div class="ttp-muted">No snapshots have been saved for this encounter yet.</div>`
            }
        </div>
    `;
}

function renderSnapshotRow(snapshot: CombatSnapshot, summary: SnapshotSummary): string {
    const counts = documentCounts(snapshot)
        .map(([label, count]) => `<span>${escapeHtml(label)} ${count}</span>`)
        .join("");
    return `
        <article class="ttp-snapshot-row" data-snapshot-id="${escapeHtml(snapshot.id)}">
            <div>
                <strong>${escapeHtml(snapshot.reason)} for ${escapeHtml(snapshot.combatantName)}</strong>
                <span>Round ${snapshot.round}, Turn ${snapshot.turn + 1} - ${escapeHtml(snapshot.combatantName)}</span>
                <small>${formatRelativeTime(snapshot.createdAt)}</small>
            </div>
            <div class="ttp-snapshot-counts">${counts}<span>Actors ${snapshot.actors.length}</span></div>
            ${renderSnapshotSummary(summary)}
            <button type="button" data-action="rollback-snapshot" data-snapshot-id="${escapeHtml(snapshot.id)}">
                <i class="fa-solid fa-rotate-left"></i><span>Rollback</span>
            </button>
        </article>
    `;
}

function renderSnapshotSummary(summary: SnapshotSummary): string {
    const sections: string[] = [];
    if (summary.moved.length) {
        sections.push(
            `<div><span>Moved</span>${summary.moved
                .slice(0, 4)
                .map((move) => `<strong>${escapeHtml(move.name)} ${formatNumber(move.distance)} ${escapeHtml(move.units)}</strong>`)
                .join("")}</div>`
        );
    }
    if (summary.hp.length) {
        sections.push(
            `<div><span>HP</span>${summary.hp
                .slice(0, 4)
                .map((line) => `<strong>${escapeHtml(line)}</strong>`)
                .join("")}</div>`
        );
    }
    if (summary.resources.length) {
        sections.push(
            `<div><span>Resources</span>${summary.resources
                .slice(0, 4)
                .map((line) => `<strong>${escapeHtml(line)}</strong>`)
                .join("")}</div>`
        );
    }
    if (!sections.length) return `<div class="ttp-snapshot-summary empty">No tracked changes yet.</div>`;
    return `<div class="ttp-snapshot-summary">${sections.join("")}</div>`;
}

function activateSnapshotListeners(root: HTMLElement, app: CombatSnapshotsApplication) {
    root.querySelector('[data-action="manual-snapshot"]')?.addEventListener("click", () => {
        void saveManualSnapshot();
    });

    root.querySelectorAll<HTMLElement>('[data-action="rollback-snapshot"]').forEach((button) => {
        button.addEventListener("click", () => {
            const id = button.dataset.snapshotId;
            if (id) void rollbackSnapshot(id, app);
        });
    });

    root.querySelectorAll<HTMLElement>(".ttp-snapshot-row").forEach((row) => {
        row.addEventListener("mouseenter", () => {
            const id = row.dataset.snapshotId;
            if (id) drawSnapshotGhosts(id);
        });
        row.addEventListener("mouseleave", () => clearSnapshotGhosts());
    });
}

async function rollbackSnapshot(snapshotId: string, app: CombatSnapshotsApplication) {
    const snapshot = findSnapshot(snapshotId);
    if (!snapshot) {
        ui.notifications?.warn("That combat snapshot no longer exists.");
        return;
    }

    const actorChanges = await summarizeActorChanges(snapshot);
    const confirmed = await confirmRollback(snapshot, actorChanges);
    if (!confirmed) return;

    const combat = getActiveEncounter(snapshot.sceneId);
    if (combat) await saveSnapshot(combat, `Pre-Rollback: ${snapshot.reason}`);

    await applySnapshot(snapshot);
    await postRollbackLog(snapshot, actorChanges);
    ui.notifications?.info(`Rolled back to ${snapshot.reason} for ${snapshot.combatantName}.`);
    void app.render({ force: true });
}

async function confirmRollback(snapshot: CombatSnapshot, actorChanges: string[]): Promise<boolean> {
    const documentSummary = documentCounts(snapshot)
        .map(([label, count]) => `<li><span>${escapeHtml(label)}</span><strong>${count}</strong></li>`)
        .join("");
    const actorSummary = actorChanges.length
        ? `<p><strong>HP and resources will be rolled back:</strong></p><ul class="ttp-dialog-list">${actorChanges
              .slice(0, 8)
              .map((change) => `<li><span>Actor</span><strong>${escapeHtml(change)}</strong></li>`)
              .join("")}</ul>`
        : "<p>No actor sheet changes were detected from this snapshot.</p>";

    const result = await DialogV2.confirm({
        window: {
            title: "Rollback Combat Snapshot?",
            icon: "fa-solid fa-clock-rotate-left",
        },
        classes: ["tobbys-turn-planner-dialog"],
        modal: true,
        rejectClose: false,
        content: `
            <div class="ttp-dialog-content">
                <p>Rollback map state to <strong>${escapeHtml(snapshot.reason)}</strong> for <strong>${escapeHtml(snapshot.combatantName)}</strong>?</p>
                <ul class="ttp-dialog-list">${documentSummary}</ul>
                ${actorSummary}
                <p>A fresh pre-rollback snapshot will be saved first.</p>
            </div>
        `,
        yes: {
            label: "Rollback",
            icon: "fa-solid fa-rotate-left",
            default: false,
            callback: () => true,
        },
        no: {
            label: "Cancel",
            icon: "fa-solid fa-xmark",
            default: true,
            callback: () => false,
        },
    });

    return result === true;
}

async function applySnapshot(snapshot: CombatSnapshot) {
    const scene = game.scenes?.get(snapshot.sceneId);
    if (!scene) {
        ui.notifications?.warn("The snapshot scene no longer exists.");
        return;
    }

    for (const config of EMBEDDED_DOCUMENTS) {
        await restoreEmbeddedDocuments(scene, config, snapshot.documents[config.documentName] ?? {});
    }

    await restoreActorResources(snapshot);

    const combat = (game.combats as any)?.get?.(snapshot.combatId) as Combat | undefined;
    if (combat) {
        await combat.update({ round: snapshot.round, turn: snapshot.turn });
    }
}

async function restoreEmbeddedDocuments(
    scene: Scene,
    config: EmbeddedConfig,
    savedDocuments: Record<string, any>
) {
    const current = getEmbeddedDocuments(scene, config);
    if (!current) return;

    const savedIds = new Set(Object.keys(savedDocuments));
    const currentIds = new Set(current.map((doc) => doc.id).filter(Boolean) as string[]);
    const deleteIds = [...currentIds].filter((id) => !savedIds.has(id));
    const createData = [...savedIds]
        .filter((id) => !currentIds.has(id))
        .map((id) => foundry.utils.deepClone(savedDocuments[id]));
    const updateData = [...savedIds]
        .filter((id) => currentIds.has(id))
        .map((id) => foundry.utils.deepClone(savedDocuments[id]));

    if (deleteIds.length) {
        await (scene as any).deleteEmbeddedDocuments(config.documentName, deleteIds);
    }
    if (updateData.length) {
        await (scene as any).updateEmbeddedDocuments(config.documentName, updateData);
    }
    if (createData.length) {
        await (scene as any).createEmbeddedDocuments(config.documentName, createData, { keepId: true });
    }
}

function collectSceneDocuments(scene: Scene): SnapshotDocumentSet {
    const out: SnapshotDocumentSet = {};
    for (const config of EMBEDDED_DOCUMENTS) {
        const documents = getEmbeddedDocuments(scene, config);
        if (!documents) continue;
        out[config.documentName] = {};
        for (const doc of documents) {
            if (!doc.id) continue;
            out[config.documentName][doc.id] = cleanDocumentData(doc.toObject());
        }
    }
    return out;
}

function collectActorSnapshots(scene: Scene): ActorSnapshot[] {
    const out = new Map<string, ActorSnapshot>();
    for (const token of getEmbeddedDocuments(scene, { documentName: "Token", collection: "tokens", label: "Tokens" }) ?? []) {
        const actor = (token as TokenDocument).actor;
        if (!actor) continue;
        const key = actor.uuid ?? `${scene.id}:${token.id}:actor`;
        if (out.has(key)) continue;
        out.set(key, {
            key,
            uuid: actor.uuid ?? null,
            actorId: actor.id ?? null,
            tokenId: token.id ?? null,
            name: actor.name ?? "Unknown Actor",
            data: actorSnapshotData(actor),
        });
    }
    return [...out.values()];
}

function getSummaryForSnapshot(snapshot: CombatSnapshot, chronological: CombatSnapshot[]): SnapshotSummary {
    const next = nextSnapshot(snapshot, chronological);
    const after = next
        ? { documents: next.documents, actors: next.actors }
        : currentSnapshotState(snapshot.sceneId);

    if (!after) return { moved: [], hp: [], resources: [] };

    return {
        moved: summarizeMovement(snapshot, after.documents),
        hp: summarizeHpChanges(snapshot.actors, after.actors),
        resources: summarizeResourceChanges(snapshot.actors, after.actors),
    };
}

function nextSnapshot(snapshot: CombatSnapshot, chronological: CombatSnapshot[]): CombatSnapshot | null {
    const index = chronological.findIndex((candidate) => candidate.id === snapshot.id);
    if (index < 0) return null;
    return chronological[index + 1] ?? null;
}

function currentSnapshotState(sceneId: string): { documents: SnapshotDocumentSet; actors: ActorSnapshot[] } | null {
    const scene = game.scenes?.get(sceneId);
    if (!scene) return null;
    return {
        documents: collectSceneDocuments(scene),
        actors: collectActorSnapshots(scene),
    };
}

function summarizeMovement(snapshot: CombatSnapshot, afterDocuments: SnapshotDocumentSet): MovementSummary[] {
    const beforeTokens = snapshot.documents.Token ?? {};
    const afterTokens = afterDocuments.Token ?? {};
    const scene = game.scenes?.get(snapshot.sceneId);
    const gridSize = Number((scene as any)?.grid?.size ?? canvas?.grid?.size ?? 100) || 100;
    const gridDistance = Number((scene as any)?.grid?.distance ?? canvas?.scene?.grid?.distance ?? 5) || 5;
    const units = String((scene as any)?.grid?.units ?? canvas?.scene?.grid?.units ?? "ft");

    const moved: MovementSummary[] = [];
    for (const [tokenId, before] of Object.entries(beforeTokens)) {
        const after = afterTokens[tokenId];
        if (!after) continue;
        const dx = Number(after.x ?? 0) - Number(before.x ?? 0);
        const dy = Number(after.y ?? 0) - Number(before.y ?? 0);
        const px = Math.hypot(dx, dy);
        const elevationDelta = Math.abs(Number(after.elevation ?? 0) - Number(before.elevation ?? 0));
        if (px < 1 && elevationDelta < 0.1) continue;
        moved.push({
            tokenId,
            name: String(before.name ?? after.name ?? "Token"),
            distance: (px / gridSize) * gridDistance,
            units,
            from: before,
            to: after,
        });
    }
    return moved.sort((a, b) => b.distance - a.distance);
}

function summarizeHpChanges(beforeActors: ActorSnapshot[], afterActors: ActorSnapshot[]): string[] {
    const lines: string[] = [];
    for (const before of beforeActors) {
        const after = findMatchingActorSnapshot(before, afterActors);
        if (!after) continue;
        const beforeHp = numberOrNull(foundry.utils.getProperty(before.data, "system.attributes.hp.value"));
        const afterHp = numberOrNull(foundry.utils.getProperty(after.data, "system.attributes.hp.value"));
        if (beforeHp === null || afterHp === null || beforeHp === afterHp) continue;
        const delta = afterHp - beforeHp;
        if (delta < 0) lines.push(`${before.name} took ${Math.abs(delta)} HP (${beforeHp}->${afterHp})`);
        else lines.push(`${before.name} healed ${delta} HP (${beforeHp}->${afterHp})`);
    }
    return lines;
}

function summarizeResourceChanges(beforeActors: ActorSnapshot[], afterActors: ActorSnapshot[]): string[] {
    const lines: string[] = [];
    for (const before of beforeActors) {
        const after = findMatchingActorSnapshot(before, afterActors);
        if (!after) continue;
        lines.push(...resourceChangeLines(before.name, before.data, after.data, 4));
    }
    return lines;
}

function findMatchingActorSnapshot(before: ActorSnapshot, afterActors: ActorSnapshot[]): ActorSnapshot | null {
    return (
        afterActors.find((actor) => actor.key === before.key) ??
        afterActors.find((actor) => actor.uuid && actor.uuid === before.uuid) ??
        afterActors.find((actor) => actor.actorId && actor.actorId === before.actorId) ??
        afterActors.find((actor) => actor.tokenId && actor.tokenId === before.tokenId) ??
        null
    );
}

function actorSnapshotData(actor: Actor) {
    const data = actor.toObject() as any;
    return cleanDocumentData({
        system: pickProperties(data.system ?? {}, [
            "attributes.hp",
            "attributes.death",
            "attributes.exhaustion",
            "attributes.inspiration",
            "resources",
            "spells",
        ]),
        items: (data.items ?? []).map((item: any) => ({
            _id: item._id,
            name: item.name,
            type: item.type,
            system: pickProperties(item.system ?? {}, [
                "uses",
                "quantity",
                "recharge",
                "consume",
                "preparation",
            ]),
        })),
    });
}

function pickProperties(source: any, paths: string[]): any {
    const out: Record<string, any> = {};
    for (const path of paths) {
        const value = foundry.utils.getProperty(source, path);
        if (value !== undefined) foundry.utils.setProperty(out, path, foundry.utils.deepClone(value));
    }
    return out;
}

async function summarizeActorChanges(snapshot: CombatSnapshot): Promise<string[]> {
    const scene = game.scenes?.get(snapshot.sceneId) ?? null;
    const changes: string[] = [];
    for (const actorSnapshot of snapshot.actors) {
        const actor = await resolveActor(actorSnapshot, scene);
        if (!actor) {
            changes.push(`${actorSnapshot.name}: actor no longer exists`);
            continue;
        }
        const current = actorSnapshotData(actor);
        const diffs = focusedActorChangeLines(actorSnapshot.name, actorSnapshot.data, current, 8);
        changes.push(...diffs);
    }
    return changes;
}

function focusedActorChangeLines(name: string, before: any, after: any, limit: number): string[] {
    const lines = [
        ...hpChangeLines(name, before, after),
        ...resourceChangeLines(name, before, after, limit),
    ];
    return lines.slice(0, limit);
}

function hpChangeLines(name: string, before: any, after: any): string[] {
    const lines: string[] = [];
    addChangeLine(lines, name, "HP", before, after, "system.attributes.hp.value");
    addChangeLine(lines, name, "Temp HP", before, after, "system.attributes.hp.temp");
    addChangeLine(lines, name, "Death Successes", before, after, "system.attributes.death.success");
    addChangeLine(lines, name, "Death Failures", before, after, "system.attributes.death.failure");
    addChangeLine(lines, name, "Exhaustion", before, after, "system.attributes.exhaustion");
    addChangeLine(lines, name, "Inspiration", before, after, "system.attributes.inspiration");
    return lines;
}

function resourceChangeLines(name: string, before: any, after: any, limit: number): string[] {
    const lines: string[] = [];
    compareLeaves(lines, name, "Resource", before, after, "system.resources", limit);
    compareLeaves(lines, name, "Spell", before, after, "system.spells", limit);
    compareItemResources(lines, name, before.items ?? [], after.items ?? [], limit);
    return lines.slice(0, limit);
}

function compareLeaves(
    lines: string[],
    actorName: string,
    prefix: string,
    before: any,
    after: any,
    path: string,
    limit: number
) {
    if (lines.length >= limit) return;
    const beforeFlat = flattenLeaves(foundry.utils.getProperty(before, path) ?? {});
    const afterFlat = flattenLeaves(foundry.utils.getProperty(after, path) ?? {});
    const keys = [...new Set([...beforeFlat.keys(), ...afterFlat.keys()])].sort();
    for (const key of keys) {
        if (lines.length >= limit) return;
        const oldValue = beforeFlat.get(key);
        const newValue = afterFlat.get(key);
        if (oldValue === newValue) continue;
        lines.push(`${actorName}: ${prefix} ${compactPath(key)} ${formatValue(oldValue)} -> ${formatValue(newValue)}`);
    }
}

function compareItemResources(lines: string[], actorName: string, beforeItems: any[], afterItems: any[], limit: number) {
    const afterById = new Map(afterItems.map((item) => [item._id, item]));
    for (const beforeItem of beforeItems) {
        if (lines.length >= limit) return;
        const afterItem = afterById.get(beforeItem._id);
        if (!afterItem) continue;
        const beforeSystem = pickProperties(beforeItem.system ?? {}, [
            "uses",
            "quantity",
            "recharge",
            "consume",
            "preparation",
        ]);
        const afterSystem = pickProperties(afterItem.system ?? {}, [
            "uses",
            "quantity",
            "recharge",
            "consume",
            "preparation",
        ]);
        const beforeFlat = flattenLeaves(beforeSystem);
        const afterFlat = flattenLeaves(afterSystem);
        const keys = [...new Set([...beforeFlat.keys(), ...afterFlat.keys()])].sort();
        for (const key of keys) {
            if (lines.length >= limit) return;
            const oldValue = beforeFlat.get(key);
            const newValue = afterFlat.get(key);
            if (oldValue === newValue) continue;
            lines.push(`${actorName}: ${beforeItem.name} ${compactPath(key)} ${formatValue(oldValue)} -> ${formatValue(newValue)}`);
        }
    }
}

function addChangeLine(
    lines: string[],
    actorName: string,
    label: string,
    before: any,
    after: any,
    path: string
) {
    const oldValue = foundry.utils.getProperty(before, path);
    const newValue = foundry.utils.getProperty(after, path);
    if (String(oldValue) === String(newValue)) return;
    lines.push(`${actorName}: ${label} ${formatValue(String(oldValue))} -> ${formatValue(String(newValue))}`);
}

async function restoreActorResources(snapshot: CombatSnapshot) {
    const scene = game.scenes?.get(snapshot.sceneId) ?? null;
    for (const actorSnapshot of snapshot.actors) {
        const actor = await resolveActor(actorSnapshot, scene);
        if (!actor) continue;
        await restoreActorSnapshot(actor, actorSnapshot.data);
    }
}

async function restoreActorSnapshot(actor: Actor, data: any) {
    const update: Record<string, any> = {};
    for (const path of [
        "system.attributes.hp",
        "system.attributes.death",
        "system.attributes.exhaustion",
        "system.attributes.inspiration",
        "system.resources",
        "system.spells",
    ]) {
        const value = foundry.utils.getProperty(data, path);
        if (value !== undefined) foundry.utils.setProperty(update, path, foundry.utils.deepClone(value));
    }

    if (Object.keys(update).length) await actor.update(update);

    const itemUpdates = (data.items ?? [])
        .filter((item: any) => actor.items?.get(item._id))
        .map((item: any) => ({
            _id: item._id,
            system: pickProperties(item.system ?? {}, [
                "uses",
                "quantity",
                "recharge",
                "consume",
                "preparation",
            ]),
        }));
    if (itemUpdates.length) {
        await actor.updateEmbeddedDocuments("Item", itemUpdates as any[]);
    }
}

async function resolveActor(actorSnapshot: ActorSnapshot, scene: Scene | null): Promise<Actor | null> {
    if (actorSnapshot.uuid) {
        const actor = (await fromUuid(actorSnapshot.uuid)) as Actor | null;
        if (actor?.documentName === "Actor") return actor;
    }
    if (actorSnapshot.actorId) {
        const actor = game.actors?.get(actorSnapshot.actorId);
        if (actor) return actor;
    }
    if (scene && actorSnapshot.tokenId) {
        return scene.tokens.get(actorSnapshot.tokenId)?.actor ?? null;
    }
    return null;
}

async function postRollbackLog(snapshot: CombatSnapshot, actorChanges: string[]) {
    if (!actorChanges.length) return;
    const recipients = (ChatMessage as any).getWhisperRecipients?.("GM")?.map((user: User) => user.id) ?? [];
    const content = `
        <p><strong>Tobby's Turn Planner: Resource Rollback Log</strong></p>
        <p>Rollback applied to <strong>${escapeHtml(snapshot.reason)}</strong> for <strong>${escapeHtml(snapshot.combatantName)}</strong>.</p>
        <p>These HP and resource changes were rolled back:</p>
        <ul>${actorChanges.map((change) => `<li>${escapeHtml(change)}</li>`).join("")}</ul>
    `;
    await ChatMessage.create({
        speaker: { alias: "Tobby's Turn Planner" },
        content,
        whisper: recipients,
    } as any);
}

function drawSnapshotGhosts(snapshotId: string) {
    if (!game.user?.isGM) return;
    clearSnapshotGhosts();

    const snapshot = findSnapshot(snapshotId);
    if (!snapshot) return;
    const summary = getSummaryForSnapshot(snapshot, getSnapshotsForCombat(snapshot.combatId));
    if (!summary.moved.length) return;

    const layer = canvas?.layers.find((candidate) => candidate.options?.name === "grid");
    if (!layer) return;

    snapshotGhostLayer = new PIXI.Container();
    snapshotGhostLayer.name = "tobbys-turn-planner-snapshot-ghosts";
    snapshotGhostLayer.zIndex = 1100;
    disablePixiInteraction(snapshotGhostLayer);

    for (const move of summary.moved) {
        drawTokenGhost(snapshotGhostLayer, move.from);
    }

    layer.addChild(snapshotGhostLayer);
    layer.sortableChildren = true;
    layer.sortChildren();
}

function clearSnapshotGhosts() {
    snapshotGhostLayer?.destroy({ children: true });
    snapshotGhostLayer = null;
}

function drawTokenGhost(container: PIXI.Container, tokenData: any) {
    const grid = canvas?.grid;
    if (!grid) return;

    const x = Number(tokenData.x ?? 0);
    const y = Number(tokenData.y ?? 0);
    const width = Number(tokenData.width ?? 1) * (grid.sizeX ?? grid.size ?? 100);
    const height = Number(tokenData.height ?? 1) * (grid.sizeY ?? grid.size ?? 100);

    const outline = new PIXI.Graphics();
    disablePixiInteraction(outline);
    outline.lineStyle(3, 0xebcb8b, 0.95);
    outline.beginFill(0xebcb8b, 0.16);
    outline.drawRoundedRect(x, y, width, height, 8);
    outline.endFill();
    container.addChild(outline);

    const src = tokenData.texture?.src;
    if (!src) return;

    try {
        const sprite = PIXI.Sprite.from(src);
        disablePixiInteraction(sprite);
        sprite.alpha = 0.42;
        sprite.tint = normalizeTint(tokenData.texture?.tint);
        sprite.x = x;
        sprite.y = y;
        sprite.width = width;
        sprite.height = height;
        container.addChildAt(sprite, Math.max(container.children.length - 1, 0));
    } catch {
        // A missing token texture should not prevent the hover outline from drawing.
    }
}

function getEmbeddedDocuments(scene: Scene, config: EmbeddedConfig): any[] | null {
    const collection = (scene as any)[config.collection];
    if (!collection) return null;
    if (Array.isArray(collection.contents)) return collection.contents;
    try {
        return Array.from(collection);
    } catch {
        return [];
    }
}

function cleanDocumentData(data: any): any {
    const clone = foundry.utils.deepClone(data);
    stripKeys(clone, new Set(["_stats"]));
    return clone;
}

function stripKeys(value: any, keys: Set<string>) {
    if (!value || typeof value !== "object") return;
    for (const key of Object.keys(value)) {
        if (keys.has(key)) {
            delete value[key];
            continue;
        }
        stripKeys(value[key], keys);
    }
}

function flattenLeaves(value: any, prefix = "", out = new Map<string, string>()): Map<string, string> {
    if (value === null || value === undefined || typeof value !== "object") {
        out.set(prefix, String(value));
        return out;
    }
    if (Array.isArray(value)) {
        value.forEach((entry, index) => flattenLeaves(entry, `${prefix}.${index}`, out));
        return out;
    }
    for (const [key, child] of Object.entries(value)) {
        flattenLeaves(child, prefix ? `${prefix}.${key}` : key, out);
    }
    return out;
}

function compactPath(path: string) {
    return path
        .replace(/^system\./, "")
        .replace(/^items\.(\d+)\./, "item $1 ")
        .replace(/^effects\.(\d+)\./, "effect $1 ");
}

function formatValue(value: string | undefined) {
    if (value === undefined) return "missing";
    if (value === "undefined") return "missing";
    if (value.length > 24) return `${value.slice(0, 21)}...`;
    return value;
}

function normalizeTint(tint: string | number | null | undefined): number {
    if (typeof tint === "number") return tint;
    if (typeof tint === "string" && tint) return Number.parseInt(tint.replace("#", ""), 16);
    return 0xffffff;
}

function numberOrNull(value: unknown): number | null {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : null;
}

function formatNumber(value: number) {
    return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function getSnapshotStore(): SnapshotStore {
    return foundry.utils.deepClone(
        ((game.settings?.get(MODULE_ID, COMBAT_SNAPSHOTS as any) as unknown as SnapshotStore) ?? {})
    );
}

function getSnapshotsForCombat(combatId: string): CombatSnapshot[] {
    return getSnapshotStore()[combatId] ?? [];
}

function findSnapshot(snapshotId: string): CombatSnapshot | null {
    const store = getSnapshotStore();
    for (const snapshots of Object.values(store)) {
        const found = snapshots.find((snapshot) => snapshot.id === snapshotId);
        if (found) return found;
    }
    return null;
}

function documentCounts(snapshot: CombatSnapshot): [string, number][] {
    return EMBEDDED_DOCUMENTS.map((config): [string, number] => [
        config.label,
        Object.keys(snapshot.documents[config.documentName] ?? {}).length,
    ]).filter(([, count]) => count > 0);
}

function getTurnKey(combat: Combat): string {
    return `${combat.round ?? 0}:${combat.turn ?? 0}:${combat.combatant?.id ?? ""}`;
}

function getHtmlElement(html: HTMLElement | JQuery): HTMLElement | null {
    if (html instanceof HTMLElement) return html;
    const maybeJQuery = html as JQuery;
    return maybeJQuery?.[0] instanceof HTMLElement ? maybeJQuery[0] : null;
}

function formatRelativeTime(timestamp: number): string {
    const seconds = Math.max(1, Math.floor((Date.now() - timestamp) / 1000));
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ago`;
}

function escapeHtml(value: string) {
    const div = document.createElement("div");
    div.innerText = value;
    return div.innerHTML;
}
