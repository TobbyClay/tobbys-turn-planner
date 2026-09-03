import { Color } from "../settings/gridColor";

export function drawReticules(
    gridSize: number,
    reticule: Color,
    g: PIXI.Graphics,
    trail: { x: number; y: number }[]
): PIXI.Graphics {
    g.clear();
    const outerRadius = gridSize * 0.2;
    const innerRadius = gridSize * 0.05;

    for (let i = 0; i < trail.length; i++) {
        const { x, y } = trail[i];

        // Draw outer circle
        g.lineStyle(0.02 * gridSize, reticule.rgb, reticule.alpha);
        g.drawCircle(x, y, outerRadius);

        // Draw inner circle
        g.lineStyle(0.015 * gridSize, reticule.rgb, reticule.alpha);
        g.drawCircle(x, y, innerRadius);

        // Draw connector line from this tile to the next
        if (i < trail.length - 1) {
            const next = trail[i + 1];
            const angle = Math.atan2(next.y - y, next.x - x);

            const x1 = x + outerRadius * Math.cos(angle);
            const y1 = y + outerRadius * Math.sin(angle);
            const x2 = next.x - outerRadius * Math.cos(angle);
            const y2 = next.y - outerRadius * Math.sin(angle);

            g.lineStyle(0.02 * gridSize, reticule.rgb, reticule.alpha);
            g.moveTo(x1, y1);
            g.lineTo(x2, y2);
        }
    }

    return g;
}
