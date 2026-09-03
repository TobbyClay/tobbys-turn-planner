import { ColorConfig } from "../../settings/gridColor";
import { CostOffset } from "../../token/trail/costPath";
import { Offset } from "../../types/canvas";
import { LocalPaintData } from "../../types/paint";
import { getFillColorAlpha } from "../../utils/color";

export function drawSquareTilesSmall(
    gridSize: number,
    _token: Token,
    colorConfig: ColorConfig,
    g: PIXI.Graphics,
    _size: number,
    path: CostOffset[],
    pathKeys: Set<string>,
    ranges: MovementRange[],
    maxRange: number,
    localData?: LocalPaintData
): PIXI.Graphics {
    g.clear();

    const r = gridSize * 0.05;
    const p = gridSize * 0.05;
    const dWidth = gridSize * 0.3;

    const costMap = createCostMap(path);

    const combinedTiles = localData ? localData.basePaintedTiles : path;
    for (const { j, i } of combinedTiles) {
        const gx = j * gridSize;
        const gy = i * gridSize;

        const {
            connectedBottom,
            connectedBottomLeft,
            connectedLeft,
            connectedTopLeft,
            connectedTop,
            connectedTopRight,
            connectedRight,
            connectedBottomRight,
            topLeftConnected,
            topRightConnected,
            bottomRightConnected,
            bottomLeftConnected,
        } = getConnectedInfoFromTrail(j, i, path);

        const inTrail = pathKeys.has(`${j},${i}`);

        const leftInTrail = pathKeys.has(`${j - 1},${i}`);
        const rightInTrail = pathKeys.has(`${j + 1},${i}`);
        const topTInTrail = pathKeys.has(`${j},${i - 1}`);
        const bottomInTrail = pathKeys.has(`${j},${i + 1}`);

        const key = `${j},${i}`;
        const cost = costMap.get(key)?.cost ?? null;
        const validRange = costMap.get(key)?.validRange ?? false;
        const dist = localData?.previewDistMap?.get(key) ?? null;
        const uncapped = localData?.uncapped ?? false;

        const { rgb, alpha } = getFillColorAlpha(
            dist,
            cost,
            ranges,
            maxRange,
            colorConfig,
            validRange,
            uncapped
        );

        g.beginFill(rgb, alpha);

        if (connectedLeft) {
            g.moveTo(gx, gy + p);
        } else if (inTrail && (!topLeftConnected || connectedTopLeft)) {
            g.moveTo(gx + p, gy + dWidth + p);
        } else g.moveTo(gx + p, gy + dWidth + p + p);

        // Top-left
        if (connectedTopLeft) {
            if (topLeftConnected) {
                g.lineTo(gx, gy + dWidth);
                g.lineTo(gx + dWidth, gy);
                g.lineTo(gx + dWidth + p, gy + p);
                g.lineTo(gx + gridSize / 2, gy + p);
            } else {
                if (leftInTrail) g.lineTo(gx - dWidth + p, gy + p);
                g.lineTo(gx - dWidth, gy);
                g.lineTo(gx, gy);
                if (connectedTop) {
                    g.lineTo(gx + p, gy); // leave top connect at gx+p,gy
                } else {
                    g.lineTo(gx + dWidth, gy);
                    g.lineTo(gx + dWidth + p, gy + p);
                }
            }
        } else if (connectedTop) {
            g.lineTo(gx + p, gy); // leave top connect at gx+p,gy
        } else if (!connectedLeft) {
            if (topLeftConnected) {
                g.lineTo(gx + p + dWidth + p, gy + p);
            } else {
                g.lineTo(gx + p, gy + p + r);
                g.quadraticCurveTo(gx + p, gy + p, gx + p + r, gy + p);
            }
        } else if (connectedLeft && topLeftConnected) {
            g.lineTo(gx, gy + dWidth);
            g.lineTo(gx + dWidth - p, gy + p);
        } else {
            g.lineTo(gx + p + r, gy + p);
        }

        // === Top edge ===

        if (connectedTop) {
            g.lineTo(gx + gridSize - p, gy);
        } else if (inTrail && (!topRightConnected || connectedTopRight)) {
            g.lineTo(gx + gridSize - dWidth - p, gy + p);
        } else g.lineTo(gx + gridSize - dWidth - p - p, gy + p);

        // Top-right
        if (connectedTopRight) {
            if (topTInTrail) g.lineTo(gx + gridSize - p, gy - dWidth + p);
            g.lineTo(gx + gridSize, gy - dWidth);
            g.lineTo(gx + gridSize, gy);
            if (connectedRight) {
                g.lineTo(gx + gridSize, gy + p); // leave right connect at gx + gridSize, gy + p
            } else {
                g.lineTo(gx + gridSize, gy + dWidth);
                g.lineTo(gx + gridSize - p, gy + dWidth + p);
            }
        } else if (connectedRight) {
            g.lineTo(gx + gridSize, gy + p); // leave top connect at gx+p,gy
        } else if (!connectedTop) {
            if (topRightConnected) {
                g.lineTo(gx + gridSize - p, gy + dWidth + p + p);
            } else {
                g.lineTo(gx + gridSize - p - r, gy + p);
                g.quadraticCurveTo(
                    gx + gridSize - p,
                    gy + p,
                    gx + gridSize - p,
                    gy + p + r
                );
            }
        } else if (connectedTop && topRightConnected) {
            g.lineTo(gx + gridSize - dWidth, gy);
            g.lineTo(gx + gridSize - p, gy + dWidth - p);
        } else {
            g.lineTo(gx + gridSize - p, gy + p + r);
        }

        // === Right edge ===

        if (connectedRight) {
            g.lineTo(gx + gridSize, gy + gridSize - p);
        } else if (inTrail && (!bottomRightConnected || connectedBottomRight)) {
            g.lineTo(gx + gridSize - p, gy + gridSize - dWidth - p);
        } else {
            g.lineTo(gx + gridSize - p, gy + gridSize - dWidth - p - p);
        }

        // Bottom-right
        if (connectedBottomRight) {
            if (bottomRightConnected) {
                g.lineTo(gx + gridSize, gy + gridSize - dWidth);
                g.lineTo(gx - dWidth + gridSize, gy + gridSize);
                g.lineTo(gx - dWidth + gridSize - p, gy + gridSize - p);
                g.lineTo(gx + gridSize / 2, gy + gridSize - p);
            } else {
                if (rightInTrail)
                    g.lineTo(gx + gridSize + dWidth - p, gy + gridSize - p);
                g.lineTo(gx + gridSize + dWidth, gy + gridSize);
                g.lineTo(gx + gridSize, gy + gridSize);
                if (connectedBottom) {
                    g.lineTo(gx + gridSize - p, gy + gridSize); // leave bottom connect at gx + gridSize - p, gy + gridSize
                } else {
                    g.lineTo(gx + gridSize - dWidth, gy + gridSize);
                    g.lineTo(gx + gridSize - dWidth - p, gy + gridSize - p);
                }
            }
        } else if (connectedBottom) {
            g.lineTo(gx + gridSize - p, gy + gridSize); // leave top connect at gx+p,gy
        } else if (!connectedRight) {
            if (bottomRightConnected) {
                g.lineTo(gx + gridSize - dWidth - p - p, gy + gridSize - p);
            } else {
                g.lineTo(gx + gridSize - p, gy + gridSize - p - r);
                g.quadraticCurveTo(
                    gx + gridSize - p,
                    gy + gridSize - p,
                    gx + gridSize - p - r,
                    gy + gridSize - p
                );
            }
        } else if (connectedRight && bottomRightConnected) {
            g.lineTo(gx + gridSize, gy + gridSize - dWidth);
            g.lineTo(gx + gridSize - dWidth + p, gy + gridSize - p);
        } else {
            g.lineTo(gx + gridSize - p - r, gy + gridSize - p);
        }

        // === Bottom edge ===

        if (connectedBottom) {
            g.lineTo(gx + p, gy + gridSize);
        } else if (inTrail && (!bottomLeftConnected || connectedBottomLeft)) {
            g.lineTo(gx + dWidth + p, gy + gridSize - p);
        } else {
            g.lineTo(gx + dWidth + p + p, gy + gridSize - p);
        }

        // Bottom-left
        if (connectedBottomLeft) {
            if (bottomInTrail) g.lineTo(gx + p, gy + gridSize + dWidth - p);
            g.lineTo(gx, gy + gridSize + dWidth);
            g.lineTo(gx, gy + gridSize);
            if (connectedLeft) {
                g.lineTo(gx, gy + gridSize - p); // leave bottom connect at gx, gy + gridSize - p
            } else {
                g.lineTo(gx, gy + gridSize - dWidth);
                g.lineTo(gx + p, gy + gridSize - dWidth - p);
            }
        } else if (connectedLeft) {
            g.lineTo(gx, gy + gridSize - p); // leave top connect at gx, gy + gridSize - p
        } else if (!connectedBottom) {
            if (bottomLeftConnected) {
                g.lineTo(gx + p, gy + gridSize - dWidth - p - p);
            } else {
                g.lineTo(gx + p + r, gy + gridSize - p);
                g.quadraticCurveTo(
                    gx + p,
                    gy + gridSize - p,
                    gx + p,
                    gy + gridSize - p - r
                );
            }
        } else if (connectedBottom && bottomLeftConnected) {
            g.lineTo(gx + dWidth, gy + gridSize);
            g.lineTo(gx + p, gy + gridSize - dWidth + p);
        } else {
            g.lineTo(gx + p, gy + gridSize - p - r);
        }

        // === Left edge ===

        if (connectedLeft) {
            g.lineTo(gx, gy + p);
        } else if (inTrail && (!topLeftConnected || connectedTopLeft)) {
            g.lineTo(gx + p, gy + dWidth + p);
        } else {
            g.lineTo(gx + p, gy + dWidth + p + p);
        }

        g.endFill();
    }

    return g;
}

function getConnectedInfoFromTrail(j: number, i: number, trail: Offset[]) {
    const key = (t: { j: number; i: number }) => `${t.j},${t.i}`;
    const indexMap = new Map(trail.map((t, i) => [key(t), i]));
    const currentKey = key({ j, i });

    const connected: Record<string, boolean> = {
        connectedTop: false,
        connectedBottom: false,
        connectedLeft: false,
        connectedRight: false,
        connectedTopLeft: false,
        connectedTopRight: false,
        connectedBottomLeft: false,
        connectedBottomRight: false,
        topLeftConnected: false,
        topRightConnected: false,
        bottomLeftConnected: false,
        bottomRightConnected: false,
    };

    const checkConsecutive = (a: string, b: string): boolean =>
        indexMap.has(a) &&
        indexMap.has(b) &&
        Math.abs(indexMap.get(a)! - indexMap.get(b)!) === 1;

    const dirs = {
        top: key({ j, i: i - 1 }),
        bottom: key({ j, i: i + 1 }),
        left: key({ j: j - 1, i }),
        right: key({ j: j + 1, i }),
        topLeft: key({ j: j - 1, i: i - 1 }),
        topRight: key({ j: j + 1, i: i - 1 }),
        bottomLeft: key({ j: j - 1, i: i + 1 }),
        bottomRight: key({ j: j + 1, i: i + 1 }),
    };

    // Check current ↔ neighbor connections
    connected.connectedTop = checkConsecutive(currentKey, dirs.top);
    connected.connectedBottom = checkConsecutive(currentKey, dirs.bottom);
    connected.connectedLeft = checkConsecutive(currentKey, dirs.left);
    connected.connectedRight = checkConsecutive(currentKey, dirs.right);
    connected.connectedTopLeft = checkConsecutive(currentKey, dirs.topLeft);
    connected.connectedTopRight = checkConsecutive(currentKey, dirs.topRight);
    connected.connectedBottomLeft = checkConsecutive(
        currentKey,
        dirs.bottomLeft
    );
    connected.connectedBottomRight = checkConsecutive(
        currentKey,
        dirs.bottomRight
    );

    // Check neighbor ↔ neighbor connections (diagonal formations)
    connected.topLeftConnected = checkConsecutive(dirs.top, dirs.left);
    connected.topRightConnected = checkConsecutive(dirs.top, dirs.right);
    connected.bottomLeftConnected = checkConsecutive(dirs.bottom, dirs.left);
    connected.bottomRightConnected = checkConsecutive(dirs.bottom, dirs.right);

    return connected;
}

export function createCostMap(trail: CostOffset[]): Map<string, CostOffset> {
    const m = new Map<string, CostOffset>();
    for (const t of trail) {
        m.set(`${t.j},${t.i}`, t);
    }
    return m;
}
