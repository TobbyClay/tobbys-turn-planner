import { CostOffset } from "../token/trail/costPath";
import { Offset } from "../types/canvas";
import { disablePixiInteraction } from "../pixi/disableInteraction";
import { getTokenTopLeftFromAnchorOffset } from "../utils/tiles";
import { LocalSweepPolygon } from "../localSweepPolygon";
import { PlannedTemplate } from "./types";

export class PlannerOverlay {
    private container: PIXI.Container | null = null;
    private reach = new PIXI.Graphics();
    private range = new PIXI.Graphics();
    private path = new PIXI.Graphics();
    private ghost = new PIXI.Graphics();
    private template = new PIXI.Graphics();
    private ghostSprite: PIXI.Sprite | null = null;

    ensure() {
        if (this.container?.parent) return this.container;

        const layer = canvas?.layers.find((l) => l.options?.name === "grid");
        if (!layer) return null;

        this.container = new PIXI.Container();
        this.container.name = "tobbys-turn-planner-overlay";
        this.container.zIndex = 1000;
        disablePixiInteraction(this.container);
        [this.reach, this.range, this.path, this.template, this.ghost].forEach(disablePixiInteraction);
        this.container.addChild(this.reach, this.range, this.path, this.template, this.ghost);
        layer.addChild(this.container);
        layer.sortableChildren = true;
        layer.sortChildren();
        return this.container;
    }

    drawReachTiles(tiles: Offset[]) {
        if (!this.ensure()) return;
        this.reach.clear();
        this.reach.lineStyle(1, 0x88c0d0, 0.35);
        this.reach.beginFill(0x88c0d0, 0.12);
        for (const tile of tiles) {
            drawGridTile(this.reach, tile);
        }
        this.reach.endFill();
    }

    drawPath(path: CostOffset[], speedDistance = 0) {
        if (!this.ensure()) return;
        this.path.clear();
        const gridDistance = canvas?.scene?.grid?.distance ?? 5;
        const speedCost = speedDistance > 0 ? speedDistance / gridDistance : Number.POSITIVE_INFINITY;

        for (const tile of path) {
            const color = movementTierColor(tile.cost, speedCost);
            this.path.lineStyle(2, color, 0.9);
            this.path.beginFill(color, 0.28);
            drawGridTile(this.path, tile);
            this.path.endFill();
        }
    }

    drawRange(origin: { x: number; y: number } | null, distance: number | null) {
        if (!this.ensure()) return;
        this.range.clear();
        if (!origin || !distance || distance <= 0) return;

        const grid = canvas?.grid;
        const scene = canvas?.scene;
        if (!grid || !scene) return;

        const gridDistance = scene.grid?.distance ?? 5;
        const rangePx = distance * ((grid.size ?? 100) / gridDistance);
        const offsets = getOffsetsInRadius(origin, rangePx);

        this.range.lineStyle(1, 0xbf1d1d, 0.35);
        this.range.beginFill(0xbf1d1d, 0.14);
        for (const offset of offsets) {
            const center = grid.getCenterPoint(offset);
            if (Math.hypot(center.x - origin.x, center.y - origin.y) > rangePx) continue;
            if (rangeBlocked(origin, center)) continue;
            drawGridTile(this.range, offset);
        }
        this.range.endFill();
    }

    drawGhost(token: Token, offset: Offset | null) {
        const container = this.ensure();
        if (!container) return;
        this.ghost.clear();
        if (!offset) {
            if (this.ghostSprite) this.ghostSprite.visible = false;
            return;
        }

        const topLeft = getTokenTopLeftFromAnchorOffset(token, offset);
        this.drawGhostSprite(container, token, topLeft);
        this.ghost.lineStyle(3, 0xebcb8b, 0.9);
        this.ghost.beginFill(0xebcb8b, 0.18);
        this.ghost.drawRoundedRect(topLeft.x, topLeft.y, token.w, token.h, 8);
        this.ghost.endFill();
    }

    private drawGhostSprite(container: PIXI.Container, token: Token, topLeft: { x: number; y: number }) {
        const texture = (token as any).mesh?.texture as PIXI.Texture | undefined;
        if (!texture) {
            if (this.ghostSprite) this.ghostSprite.visible = false;
            return;
        }

        if (!this.ghostSprite || this.ghostSprite.texture !== texture) {
            this.ghostSprite?.destroy();
            this.ghostSprite = new PIXI.Sprite(texture);
            disablePixiInteraction(this.ghostSprite);
            this.ghostSprite.anchor.set(0.5);
            container.addChildAt(this.ghostSprite, Math.max(container.children.indexOf(this.ghost), 0));
        }

        this.ghostSprite.visible = true;
        this.ghostSprite.alpha = 0.42;
        this.ghostSprite.tint = normalizeTint(token.document.texture.tint);
        this.ghostSprite.width = token.w;
        this.ghostSprite.height = token.h;
        this.ghostSprite.rotation = (token as any).mesh?.rotation ?? ((token.document.rotation ?? 0) * PIXI.DEG_TO_RAD);
        this.ghostSprite.position.set(topLeft.x + token.w / 2, topLeft.y + token.h / 2);
    }

    drawTemplate(template: PlannedTemplate | null) {
        if (!this.ensure()) return;
        this.template.clear();
        if (!template) return;

        const unitToPx =
            (canvas?.grid?.size ?? 100) / (canvas?.scene?.grid?.distance ?? 5);
        const distance = template.distance * unitToPx;
        const width = (template.width ?? canvas?.scene?.grid?.distance ?? 5) * unitToPx;
        const direction = toRadians(template.direction ?? 0);

        this.template.lineStyle(2, 0xbf616a, 0.9);
        this.template.beginFill(0xbf616a, 0.18);

        switch (template.type) {
            case "circle":
                this.template.drawCircle(template.x, template.y, distance);
                break;
            case "cone":
                drawCone(this.template, template.x, template.y, distance, direction, template.angle ?? 53);
                break;
            case "ray":
            case "rect":
                drawRay(this.template, template.x, template.y, distance, width, direction);
                break;
            default:
                this.template.drawCircle(template.x, template.y, distance);
                break;
        }
        this.template.endFill();
    }

    clear() {
        this.reach.clear();
        this.range.clear();
        this.path.clear();
        this.ghost.clear();
        this.template.clear();
        if (this.ghostSprite) this.ghostSprite.visible = false;
    }

    destroy() {
        this.clear();
        this.container?.destroy({ children: true });
        this.container = null;
        this.reach = new PIXI.Graphics();
        this.range = new PIXI.Graphics();
        this.path = new PIXI.Graphics();
        this.ghost = new PIXI.Graphics();
        this.template = new PIXI.Graphics();
        this.ghostSprite = null;
    }
}

function movementTierColor(cost: number, speedCost: number) {
    if (cost <= speedCost) return 0xa3be8c;
    if (cost <= speedCost * 2) return 0xebcb8b;
    if (cost <= speedCost * 3) return 0xd08770;
    return 0xbf616a;
}

function normalizeTint(tint: string | number | null | undefined): number {
    if (typeof tint === "number") return tint;
    if (typeof tint === "string" && tint) return Number.parseInt(tint.replace("#", ""), 16);
    return 0xffffff;
}

function drawGridTile(g: PIXI.Graphics, offset: Offset) {
    const grid = canvas!.grid!;
    const isHex = !!grid.isHexagonal;
    if (!isHex) {
        const topLeft = grid.getTopLeftPoint(offset);
        g.drawRect(topLeft.x, topLeft.y, grid.sizeX, grid.sizeY);
        return;
    }

    const center = grid.getCenterPoint(offset);
    const vertices = (grid as any).getVertices?.(center) ?? [];
    if (!vertices.length) {
        g.drawCircle(center.x, center.y, Math.min(grid.sizeX, grid.sizeY) / 2);
        return;
    }
    g.moveTo(vertices[0].x, vertices[0].y);
    for (const v of vertices.slice(1)) g.lineTo(v.x, v.y);
    g.closePath();
}

function getOffsetsInRadius(origin: { x: number; y: number }, rangePx: number): Offset[] {
    const grid = canvas!.grid!;
    const topLeft = grid.getOffset({ x: origin.x - rangePx, y: origin.y - rangePx });
    const bottomRight = grid.getOffset({ x: origin.x + rangePx, y: origin.y + rangePx });
    const i0 = Math.min(topLeft.i, bottomRight.i) - 1;
    const i1 = Math.max(topLeft.i, bottomRight.i) + 1;
    const j0 = Math.min(topLeft.j, bottomRight.j) - 1;
    const j1 = Math.max(topLeft.j, bottomRight.j) + 1;

    const offsets: Offset[] = [];
    for (let i = i0; i <= i1; i++) {
        for (let j = j0; j <= j1; j++) {
            offsets.push({ i, j });
        }
    }
    return offsets;
}

function rangeBlocked(from: { x: number; y: number }, to: { x: number; y: number }) {
    const collision = LocalSweepPolygon.testCollision(from, to, {
        type: "move",
        mode: "any",
        edgeTypes: {
            //@ts-expect-error Foundry edge type definitions are incomplete.
            wall: { mode: 1, priority: -Infinity },
            //@ts-expect-error Foundry edge type definitions are incomplete.
            innerBounds: { mode: 2, priority: -Infinity },
        },
    });
    return Array.isArray(collision) ? collision.length > 0 : !!collision;
}

function drawCone(
    g: PIXI.Graphics,
    x: number,
    y: number,
    radius: number,
    direction: number,
    angleDegrees: number
) {
    const half = toRadians(angleDegrees) / 2;
    const steps = 24;
    g.moveTo(x, y);
    for (let i = 0; i <= steps; i++) {
        const a = direction - half + (i / steps) * half * 2;
        g.lineTo(x + Math.cos(a) * radius, y + Math.sin(a) * radius);
    }
    g.closePath();
}

function toRadians(degrees: number) {
    return (degrees * Math.PI) / 180;
}

function drawRay(
    g: PIXI.Graphics,
    x: number,
    y: number,
    length: number,
    width: number,
    direction: number
) {
    const ux = Math.cos(direction);
    const uy = Math.sin(direction);
    const px = -uy * (width / 2);
    const py = ux * (width / 2);
    const ex = x + ux * length;
    const ey = y + uy * length;

    g.moveTo(x + px, y + py);
    g.lineTo(ex + px, ey + py);
    g.lineTo(ex - px, ey - py);
    g.lineTo(x - px, y - py);
    g.closePath();
}
