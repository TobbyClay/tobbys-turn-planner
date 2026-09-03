import { ColorConfig } from "../../settings/gridColor";
import { CostOffset } from "../../token/trail/costPath";
import { LocalPaintData } from "../../types/paint";
import { getFillColorAlpha } from "../../utils/color";

export function drawSquareTilesLarge(
    gridSize: number,
    _token: Token,
    colorConfig: ColorConfig,
    g: PIXI.Graphics,
    size: number,
    path: CostOffset[],
    _pathKeys: Set<string>,
    ranges: MovementRange[],
    maxRange: number,
    localData?: LocalPaintData
): PIXI.Graphics {
    g.clear();

    const { costMap, tileSet } = buildPaintedCostMap(path, size);
    const r = gridSize * 0.05;
    const p = gridSize * 0.05;

    const has = (x: number, y: number) => tileSet.has(`${x},${y}`);

    const combinedTiles = localData ? localData.basePaintedTiles : path;

    for (const { j, i } of combinedTiles) {
        const gx = j * gridSize;
        const gy = i * gridSize;

        const inTrail = has(j, i);

        const connectedTop = inTrail && has(j, i - 1);
        const connectedBottom = inTrail && has(j, i + 1);
        const connectedLeft = inTrail && has(j - 1, i);
        const connectedRight = inTrail && has(j + 1, i);

        const connectedTopLeft = inTrail && has(j - 1, i - 1);
        const connectedTopRight = inTrail && has(j + 1, i - 1);
        const connectedBottomRight = inTrail && has(j + 1, i + 1);
        const connectedBottomLeft = inTrail && has(j - 1, i + 1);

        const key = `${j},${i}`;
        const cost = costMap.get(key)?.cost ?? null;
        const validRange = costMap.get(key)?.validRange ?? false;
        const dist = localData?.previewDistMap?.get(key) ?? null;
        const uncapped = localData?.uncapped ?? false;

        const fill = getFillColorAlpha(
            dist,
            cost,
            ranges,
            maxRange,
            colorConfig,
            validRange,
            uncapped
        );

        g.beginFill(fill.rgb, fill.alpha);

        if (connectedLeft) {
            g.moveTo(gx, gy + p + r);
        } else g.moveTo(gx + p, gy + p + r);

        if (connectedTop) {
            if (connectedLeft) {
                if (connectedTopLeft) g.lineTo(gx, gy);
                else {
                    g.lineTo(gx, gy + p);
                    g.quadraticCurveTo(gx + p, gy + p, gx + p, gy);
                }
            } else g.lineTo(gx + p, gy);
        } else {
            if (connectedLeft) g.lineTo(gx, gy + p);
            else {
                g.lineTo(gx + p, gy + p + r);
                g.quadraticCurveTo(gx + p, gy + p, gx + p + r, gy + p);
            }
        }

        // === Top edge ===

        if (connectedTop) {
            g.lineTo(gx + gridSize - p - r, gy);
        } else g.lineTo(gx + gridSize - p - r, gy + p);

        // Top-right
        if (connectedRight) {
            if (connectedTop) {
                if (connectedTopRight) g.lineTo(gx + gridSize, gy);
                else {
                    g.lineTo(gx + gridSize - p, gy);
                    g.quadraticCurveTo(
                        gx + gridSize - p,
                        gy + p,
                        gx + gridSize,
                        gy + p
                    );
                }
            } else g.lineTo(gx + gridSize, gy + p);
        } else {
            if (connectedTop) g.lineTo(gx + gridSize - p, gy);
            else {
                g.lineTo(gx + gridSize - p - r, gy + p);
                g.quadraticCurveTo(
                    gx + gridSize - p,
                    gy + p,
                    gx + gridSize - p,
                    gy + p + r
                );
            }
        }

        // === Right edge ===

        if (connectedRight) {
            g.lineTo(gx + gridSize, gy + gridSize - p - r);
        } else g.lineTo(gx + gridSize - p, gy + gridSize - p - r);

        // Bottom-right
        if (connectedBottom) {
            if (connectedRight) {
                if (connectedBottomRight)
                    g.lineTo(gx + gridSize, gy + gridSize);
                else {
                    g.lineTo(gx + gridSize, gy + gridSize - p);
                    g.quadraticCurveTo(
                        gx + gridSize - p,
                        gy + gridSize - p,
                        gx + gridSize - p,
                        gy + gridSize
                    );
                }
            } else g.lineTo(gx + gridSize - p, gy + gridSize);
        } else {
            if (connectedRight) g.lineTo(gx + gridSize, gy + gridSize - p);
            else {
                g.lineTo(gx + gridSize - p, gy + gridSize - p - r);
                g.quadraticCurveTo(
                    gx + gridSize - p,
                    gy + gridSize - p,
                    gx + gridSize - p - r,
                    gy + gridSize - p
                );
            }
        }
        // === Bottom edge ===

        if (connectedBottom) {
            g.lineTo(gx + p + r, gy + gridSize);
        } else g.lineTo(gx + p + r, gy + gridSize - p);

        // Bottom-left
        if (connectedLeft) {
            if (connectedBottom) {
                if (connectedBottomLeft) g.lineTo(gx, gy + gridSize);
                else {
                    g.lineTo(gx + p, gy + gridSize);
                    g.quadraticCurveTo(
                        gx + p,
                        gy + gridSize - p,
                        gx,
                        gy + gridSize - p
                    );
                }
            } else g.lineTo(gx, gy + gridSize - p);
        } else {
            if (connectedBottom) g.lineTo(gx + p, gy + gridSize);
            else {
                g.lineTo(gx + p + r, gy + gridSize - p);
                g.quadraticCurveTo(
                    gx + p,
                    gy + gridSize - p,
                    gx + p,
                    gy + gridSize - p - r
                );
            }
        }

        // === Left edge ===

        if (connectedLeft) {
            g.lineTo(gx, gy + p + r);
        } else g.lineTo(gx + p, gy + p + r);

        g.endFill();
    }

    return g;
}

function buildPaintedCostMap(
    trail: CostOffset[],
    size: number
): { costMap: Map<string, CostOffset>; tileSet: Set<string> } {
    const costMap = new Map<string, CostOffset>();
    for (const {
        j: baseJ,
        i: baseI,
        cost,
        parity,
        mode,
        validRange,
    } of trail) {
        for (let dx = 0; dx < size; dx++) {
            for (let dy = 0; dy < size; dy++) {
                const j = baseJ + dx;
                const i = baseI + dy;
                const key = `${j},${i}`;
                // overwrite so the *last* trail entry “wins” on overlaps
                costMap.set(key, {
                    j,
                    i,
                    cost,
                    parity,
                    mode,
                    validRange,
                });
            }
        }
    }
    return { costMap, tileSet: new Set(costMap.keys()) };
}
