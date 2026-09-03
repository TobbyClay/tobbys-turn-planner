import { LocalSweepPolygon } from "../localSweepPolygon";
import { CoverPreview } from "./types";

export function getCoverPreviewFromPosition(
    attacker: Token,
    position: { x: number; y: number; elevation?: number },
    targets: Iterable<Token>
): CoverPreview[] {
    return Array.from(targets)
        .filter((target) => target?.id !== attacker.id)
        .map((target) => evaluateCover(attacker, position, target));
}

function evaluateCover(
    attacker: Token,
    position: { x: number; y: number; elevation?: number },
    target: Token
): CoverPreview {
    const origin = {
        x: position.x + attacker.w / 2,
        y: position.y + attacker.h / 2,
    };

    const samples = targetSamplePoints(target);
    let blocked = 0;
    for (const sample of samples) {
        if (testBlocked(origin, sample) || tokenBlocks(origin, sample, attacker, target)) {
            blocked++;
        }
    }

    const total = samples.length;
    const cover =
        blocked >= total
            ? "total"
            : blocked >= 3
            ? "threeQuarters"
            : blocked >= 1
            ? "half"
            : "none";

    return { target, cover, blocked, total };
}

function tokenBlocks(
    from: { x: number; y: number },
    to: { x: number; y: number },
    attacker: Token,
    target: Token
) {
    for (const token of canvas?.tokens?.placeables ?? []) {
        if (token.id === attacker.id || token.id === target.id) continue;
        if (!token.visible || token.document.hidden) continue;
        const actor = token.actor;
        const hpMax = foundry.utils.getProperty(actor ?? {}, "system.attributes.hp.max");
        const hpValue = foundry.utils.getProperty(actor ?? {}, "system.attributes.hp.value");
        if (typeof hpMax === "number" && hpMax > 0 && hpValue === 0) continue;
        if (segmentIntersectsRect(from, to, tokenBounds(token))) return true;
    }
    return false;
}

function tokenBounds(token: Token) {
    const inset = Math.min(token.w, token.h) * 0.12;
    return {
        left: token.x + inset,
        right: token.x + token.w - inset,
        top: token.y + inset,
        bottom: token.y + token.h - inset,
    };
}

function segmentIntersectsRect(
    a: { x: number; y: number },
    b: { x: number; y: number },
    r: { left: number; right: number; top: number; bottom: number }
) {
    if (pointInRect(a, r) || pointInRect(b, r)) return true;
    const corners = [
        { x: r.left, y: r.top },
        { x: r.right, y: r.top },
        { x: r.right, y: r.bottom },
        { x: r.left, y: r.bottom },
    ];
    for (let i = 0; i < corners.length; i++) {
        if (segmentsIntersect(a, b, corners[i], corners[(i + 1) % corners.length])) {
            return true;
        }
    }
    return false;
}

function pointInRect(
    p: { x: number; y: number },
    r: { left: number; right: number; top: number; bottom: number }
) {
    return p.x >= r.left && p.x <= r.right && p.y >= r.top && p.y <= r.bottom;
}

function segmentsIntersect(
    a: { x: number; y: number },
    b: { x: number; y: number },
    c: { x: number; y: number },
    d: { x: number; y: number }
) {
    const o1 = orientation(a, b, c);
    const o2 = orientation(a, b, d);
    const o3 = orientation(c, d, a);
    const o4 = orientation(c, d, b);
    return o1 !== o2 && o3 !== o4;
}

function orientation(
    a: { x: number; y: number },
    b: { x: number; y: number },
    c: { x: number; y: number }
) {
    return Math.sign((b.y - a.y) * (c.x - b.x) - (b.x - a.x) * (c.y - b.y));
}

function targetSamplePoints(target: Token): { x: number; y: number }[] {
    const inset = Math.min(canvas?.grid?.size ?? 100, Math.min(target.w, target.h)) * 0.2;
    const left = target.x + inset;
    const right = target.x + target.w - inset;
    const top = target.y + inset;
    const bottom = target.y + target.h - inset;
    return [
        { x: left, y: top },
        { x: right, y: top },
        { x: right, y: bottom },
        { x: left, y: bottom },
    ];
}

function testBlocked(from: { x: number; y: number }, to: { x: number; y: number }) {
    return LocalSweepPolygon.testCollision(from, to, {
        type: "move",
        mode: "any",
        edgeTypes: {
            //@ts-expect-error Foundry edge type definitions are incomplete.
            wall: { mode: 1, priority: -Infinity },
            //@ts-expect-error Foundry edge type definitions are incomplete.
            innerBounds: { mode: 2, priority: -Infinity },
        },
    });
}
