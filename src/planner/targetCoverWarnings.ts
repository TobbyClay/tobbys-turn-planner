import { isTargetCoverWarningEnabled } from "../settings/turnPlanner";
import { hasActiveEncounter } from "./combatScope";
import { coverEffect, coverLabel } from "./coverRules";
import { getCoverPreviewFromPosition } from "./localCover";
import type { CoverLevel } from "./types";

const warnedCover = new Map<string, CoverLevel>();

export function setupTargetCoverWarnings() {
    Hooks.on("targetToken", (user: User, target: Token, targeted: boolean) => {
        if (user.id !== game.userId) return;
        if (!targeted) {
            clearWarningsForTarget(target);
            return;
        }

        warnForTarget(target);
    });

    Hooks.on("controlToken", (token: Token, controlled: boolean) => {
        if (!controlled || !isTargetCoverWarningEnabled()) return;
        if (!token.actor?.isOwner) return;
        for (const target of game.user?.targets ?? []) warnForPair(token, target);
    });
}

function warnForTarget(target: Token) {
    if (!isTargetCoverWarningEnabled()) return;
    if (!hasActiveEncounter()) return;
    const attacker = getSingleControlledToken();
    if (!attacker) return;
    warnForPair(attacker, target);
}

function warnForPair(attacker: Token, target: Token) {
    if (!hasActiveEncounter()) return;
    if (attacker.id === target.id) return;
    if (!target.visible || target.document.hidden) return;
    if (!isHostilePair(attacker, target)) return;

    const preview = getCoverPreviewFromPosition(
        attacker,
        {
            x: attacker.document.x,
            y: attacker.document.y,
            elevation: attacker.document.elevation,
        },
        [target]
    )[0];

    if (!preview || preview.cover === "none") {
        warnedCover.delete(warningKey(attacker, target));
        return;
    }

    const key = warningKey(attacker, target);
    if (warnedCover.get(key) === preview.cover) return;
    warnedCover.set(key, preview.cover);

    ui.notifications?.warn(
        `Cover: ${target.name} has ${coverLabel(preview.cover).toLocaleLowerCase()} cover against ${attacker.name}: ${coverEffect(preview.cover)} (${preview.blocked}/${preview.total} lines blocked).`
    );
}

function getSingleControlledToken(): Token | null {
    const controlled =
        canvas?.tokens?.controlled.filter((token) => token.actor?.isOwner) ?? [];
    return controlled.length === 1 ? controlled[0] : null;
}

function isHostilePair(attacker: Token, target: Token): boolean {
    const hostile = CONST.TOKEN_DISPOSITIONS.HOSTILE;
    const attackerDisposition = attacker.document.disposition;
    const targetDisposition = target.document.disposition;

    return (
        (targetDisposition === hostile && attackerDisposition !== hostile) ||
        (attackerDisposition === hostile && targetDisposition !== hostile)
    );
}

function clearWarningsForTarget(target: Token) {
    for (const key of [...warnedCover.keys()]) {
        if (key.endsWith(`:${target.id}`)) warnedCover.delete(key);
    }
}

function warningKey(attacker: Token, target: Token) {
    return `${canvas?.scene?.id ?? "scene"}:${attacker.id}:${target.id}`;
}
