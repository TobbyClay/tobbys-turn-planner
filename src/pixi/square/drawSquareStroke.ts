import { Offset } from "../../types/canvas";

export function drawSquareStroke(
    paintedTiles: Offset[],
    paintedSet: Set<string>,
    gridSize: number,
    color: number,
    alpha: number,
    g: PIXI.Graphics
): PIXI.Graphics {
    g.clear();

    const hasTile = (x: number, y: number) => paintedSet.has(`${x},${y}`);

    const r = gridSize * 0.1;
    const p = gridSize * 0.05;

    for (const { j, i } of paintedTiles) {
        const gx = j * gridSize;
        const gy = i * gridSize;

        const top = hasTile(j, i - 1);
        const bottom = hasTile(j, i + 1);
        const left = hasTile(j - 1, i);
        const right = hasTile(j + 1, i);

        const topLeft = hasTile(j - 1, i - 1);
        const topRight = hasTile(j + 1, i - 1);
        const bottomLeft = hasTile(j - 1, i + 1);
        const bottomRight = hasTile(j + 1, i + 1);

        // Set the stroke style (line thickness, color, and opacity)
        g.lineStyle(3, color, alpha);

        g.moveTo(gx - p, gy - p);

        // === Top edge ===
        if (top) g.moveTo(gx + gridSize - r - p, gy - p);
        else if (!topLeft && !top && !left) {
            g.moveTo(gx - p + r, gy - p);
            g.lineTo(gx + gridSize - r - p, gy - p);
        } else if (topLeft || !left) {
            g.moveTo(gx + r + p, gy - p);
            g.lineTo(gx + gridSize - r - p, gy - p);
        } else {
            g.moveTo(gx + p, gy - p);
            g.lineTo(gx + gridSize - r - p, gy - p);
        }

        // Top-right
        if (!top && !right) {
            if (topRight) {
                g.quadraticCurveTo(
                    gx + gridSize - p,
                    gy - p,
                    gx + gridSize - p,
                    gy - r - p
                );
                g.moveTo(gx + gridSize + r + p, gy + p);
                g.quadraticCurveTo(
                    gx + gridSize + p,
                    gy + p,
                    gx + gridSize + p,
                    gy + r + p
                );
            } else {
                g.lineTo(gx + gridSize + p - r, gy - p);
                g.quadraticCurveTo(
                    gx + gridSize + p,
                    gy - p,
                    gx + gridSize + p,
                    gy + r - p
                );
            }
        } else if (!topRight && top && right) {
            g.moveTo(gx + gridSize + p, gy - r - p);
            g.quadraticCurveTo(
                gx + gridSize + p,
                gy - p,
                gx + gridSize + r + p,
                gy - p
            );
        } else if (!top && right && !topRight) {
            g.lineTo(gx + gridSize + p, gy - p);
        } else {
            g.moveTo(gx + gridSize + p, gy - p);
        }

        // === Right edge ===
        if (right) g.moveTo(gx + gridSize + p, gy + gridSize - r - p);
        else if (!topRight && !top && !right) {
            g.moveTo(gx + gridSize + p, gy - p + r);
            g.lineTo(gx + gridSize + p, gy + gridSize - r - p);
        } else if (topRight || !top) {
            g.moveTo(gx + gridSize + p, gy + r + p);
            g.lineTo(gx + gridSize + p, gy + gridSize - r - p);
        } else {
            g.moveTo(gx + gridSize + p, gy + p);
            g.lineTo(gx + gridSize + p, gy + gridSize - r - p);
        }

        // Bottom-right
        if (!bottom && !right) {
            if (bottomRight) {
                g.quadraticCurveTo(
                    gx + gridSize + p,
                    gy + gridSize - p,
                    gx + gridSize + r + p,
                    gy + gridSize - p
                );
                g.moveTo(gx + gridSize - p, gy + gridSize + r + p);
                g.quadraticCurveTo(
                    gx + gridSize - p,
                    gy + gridSize + p,
                    gx + gridSize - r - p,
                    gy + gridSize + p
                );
            } else {
                g.lineTo(gx + gridSize + p, gy + gridSize + p - r);
                g.quadraticCurveTo(
                    gx + gridSize + p,
                    gy + gridSize + p,
                    gx + gridSize - r + p,
                    gy + gridSize + p
                );
            }
        } else if (!bottomRight && bottom && right) {
            g.moveTo(gx + gridSize + r + p, gy + gridSize + p);
            g.quadraticCurveTo(
                gx + gridSize + p,
                gy + gridSize + p,
                gx + gridSize + p,
                gy + gridSize + r + p
            );
            g.moveTo(gx + gridSize + p, gy + gridSize + p);
        } else if (!right && bottom && !bottomRight) {
            g.lineTo(gx + gridSize + p, gy + gridSize + p);
        } else {
            g.moveTo(gx + gridSize + p, gy + gridSize + p);
        }

        // === Bottom edge ===
        if (bottom) g.moveTo(gx + r + p, gy + gridSize + p);
        else if (!bottomRight && !bottom && !right) {
            g.moveTo(gx + gridSize + p - r, gy + gridSize + p);
            g.lineTo(gx + r + p, gy + gridSize + p);
        } else if (bottomRight || !right) {
            g.moveTo(gx + gridSize - r - p, gy + gridSize + p);
            g.lineTo(gx + r + p, gy + gridSize + p);
        } else {
            g.moveTo(gx + gridSize - p, gy + gridSize + p);
            g.lineTo(gx + r + p, gy + gridSize + p);
        }

        // Bottom-left
        if (!bottom && !left && !bottomLeft) {
            g.lineTo(gx - p + r, gy + gridSize + p);
            g.quadraticCurveTo(
                gx - p,
                gy + gridSize + p,
                gx - p,
                gy + gridSize - r + p
            );
        } else if (!bottomLeft && bottom && left) {
            g.moveTo(gx - p, gy + gridSize + r + p);
            g.quadraticCurveTo(
                gx - p,
                gy + gridSize + p,
                gx - r - p,
                gy + gridSize + p
            );
            g.moveTo(gx - p, gy + gridSize + p);
        } else if (!bottom && left && !bottomLeft) {
            g.lineTo(gx - p, gy + gridSize + p);
        } else {
            g.moveTo(gx - p, gy + gridSize + p);
        }

        // === Left edge ===
        if (left) g.moveTo(gx - p, gy + r + p);
        else if (!bottomLeft && !bottom && !left) {
            g.moveTo(gx - p, gy + gridSize + p - r);
            g.lineTo(gx - p, gy + r + p);
        } else if (bottomLeft || !bottom) {
            g.moveTo(gx - p, gy + gridSize - r - p);
            g.lineTo(gx - p, gy + r + p);
        } else {
            g.moveTo(gx - p, gy + gridSize - p);
            g.lineTo(gx - p, gy + r + p);
        }

        // Top-left
        if (!top && !left && !topLeft) {
            g.lineTo(gx - p, gy - p + r);
            g.quadraticCurveTo(gx - p, gy - p, gx + r - p, gy - p);
        } else if (!topLeft && top && left) {
            g.moveTo(gx - r - p, gy - p);
            g.quadraticCurveTo(gx - p, gy - p, gx - p, gy - r - p);
            g.moveTo(gx - p, gy - p);
        } else if (!left && top && !topLeft) {
            g.lineTo(gx - p, gy - p);
        } else {
            g.moveTo(gx - p, gy - p);
        }
    }

    return g;
}
