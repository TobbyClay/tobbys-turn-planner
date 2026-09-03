import { ColorConfig } from "../../settings/gridColor";
import { CostOffset } from "../../token/trail/costPath";
import { HexagonalGrid } from "../../types/canvas";
import { LocalPaintData } from "../../types/paint";
import { getFillColorAlpha } from "../../utils/color";
import { CUBE_NEIGHBORS } from "../../utils/directions";
import { createCostMap } from "../square/drawSquareTilesSmall";

export function drawHexTilesSmall(
    _gridSize: number,
    _token: Token,
    colorConfig: ColorConfig,
    g: PIXI.Graphics,
    _size: number,
    path: CostOffset[],
    _pathKeys: Set<string>,
    ranges: MovementRange[],
    maxRange: number,
    localData?: LocalPaintData
): PIXI.Graphics {
    g.clear();

    const grid = canvas!.grid as HexagonalGrid;

    const orientOffset = grid.columns ? 2 : 0;

    const pts = canvas!.grid!.getShape();
    const padding = 0.1;
    const scale = 1 - padding;

    const relPoly = pts.map((p) => ({ x: p.x * scale, y: p.y * scale }));
    const flatPoly = relPoly.flatMap((p) => [p.x, p.y]);

    const costMap = createCostMap(path);

    const combinedTiles = localData ? localData.basePaintedTiles : path;

    for (const { i, j } of combinedTiles) {
        const key = `${j},${i}`;
        const pathDist = localData?.previewDistMap?.get(key) ?? null;
        const cost = costMap.get(key)?.cost ?? null;
        const validRange = costMap.get(key)?.validRange ?? false;
        const uncapped = localData?.uncapped ?? false;

        const fill = getFillColorAlpha(
            pathDist,
            cost,
            ranges,
            maxRange,
            colorConfig,
            validRange,
            uncapped
        );

        g.beginFill(fill.rgb, fill.alpha);

        const { x: cx, y: cy } = grid.getCenterPoint({ i, j });
        const poly = flatPoly.map((v, idx) =>
            idx % 2 === 0 ? cx + v : cy + v
        );
        g.drawPolygon(poly).endFill();
    }

    let cPrev = canvas!.grid!.getCenterPoint({ i: path[0]?.i, j: path[0]?.j });

    for (let k = 1; k < path.length; k++) {
        const cur = path[k];
        const last = path[k - 1];

        const dc = (() => {
            const a = grid.offsetToCube(cur),
                b = grid.offsetToCube(last);
            return { dq: a.q - b.q, dr: a.r - b.r, ds: a.s - b.s };
        })();

        const baseDir = CUBE_NEIGHBORS.findIndex(
            (d) => d.dq === dc.dq && d.dr === dc.dr && d.ds === dc.ds
        );
        if (baseDir < 0) continue;

        const dir = (baseDir + orientOffset) % 6;

        const vA = pts[dir];
        const vB = pts[(dir + 1) % 6];
        const ax = vA.x,
            ay = vA.y;
        const bx = vB.x,
            by = vB.y;

        const pA_hub = { x: cPrev.x + ax, y: cPrev.y + ay };
        const pB_hub = { x: cPrev.x + bx, y: cPrev.y + by };

        const dx = pB_hub.x - pA_hub.x;
        const dy = pB_hub.y - pA_hub.y;

        const L = Math.hypot(dx, dy) || 1;
        const ux = dx / L,
            uy = dy / L;
        const nx = -uy,
            ny = ux;

        const lengthShrink = 0.4;
        const halfCut = (L * lengthShrink) / 2;
        const pA_edge = {
            x: ax + ux * halfCut,
            y: ay + uy * halfCut,
        };
        const pB_edge = {
            x: bx - ux * halfCut,
            y: by - uy * halfCut,
        };

        const thickness = padding * L;

        const quadLocal = [
            pA_edge.x + nx * thickness,
            pA_edge.y + ny * thickness,
            pB_edge.x + nx * thickness,
            pB_edge.y + ny * thickness,
            pB_edge.x - nx * thickness,
            pB_edge.y - ny * thickness,
            pA_edge.x - nx * thickness,
            pA_edge.y - ny * thickness,
        ];

        const quadAbs = quadLocal.map((v, idx) =>
            idx % 2 === 0 ? cPrev.x + v : cPrev.y + v
        );

        g.beginFill(colorConfig.active.rgb, colorConfig.active.alpha)
            .lineStyle(0)
            .drawPolygon(quadAbs)
            .endFill();

        cPrev = canvas!.grid!.getCenterPoint({ i: cur.i, j: cur.j });
    }

    return g;
}
