import { MODULE_ID } from "../../constants";
import { drawFloatingTokenLabel } from "../../pixi/floatingDistanceLabel";
import { disablePixiInteraction } from "../../pixi/disableInteraction";
import { drawHexTilesLarge } from "../../pixi/hex/drawHexTilesLarge";
import { drawHexTilesSmall } from "../../pixi/hex/drawHexTilesSmall";
import { drawHexStroke } from "../../pixi/hex/hexStroke";
import { PathRenderer, PathSegment } from "../../pixi/path";
import { ReticuleFilter } from "../../pixi/recticuleFilter";
import { drawSquareStroke } from "../../pixi/square/drawSquareStroke";
import { drawSquareTilesLarge } from "../../pixi/square/drawSquareTilesLarge";
import { drawSquareTilesSmall } from "../../pixi/square/drawSquareTilesSmall";
import { TileRegionFilter } from "../../pixi/tileRegionFilter";
import { TileStrokeFilter } from "../../pixi/tileStrokeFilter";
import { WaveBandsFilter } from "../../pixi/waveBandsFilter";
import {
    ColorConfig,
    colorStringToRGBAlpha,
    DEFAULT_STROKE_COLOR,
    getGridColorConfig,
    OTHERS_ALPHA_MULTIPLIER,
    rgbIntToRGBA,
    SHOW_OTHERS_PATHS,
    STROKE_COLOR,
} from "../../settings/gridColor";
import { isDistanceLabelAboveTokenEnabled } from "../../settings/gridDistance";
import { isGridPaintingEnabled } from "../../settings/gridRangeMap";
import {
    getGridSelectSound,
    isGridSelectSoundEnabled,
} from "../../settings/gridSound";
import { socketlibSocket } from "../../socket/_socket";
import { HexagonalGrid, Offset } from "../../types/canvas";
import { LocalPaintData } from "../../types/paint";
import { getFillColorAlpha } from "../../utils/color";
import { getTokenRenderScale } from "../../utils/getTokenBaseScale";
import { isAutoRotateEnabled } from "../../utils/settings";
import {
    getOccupiedTiles,
    getTokenCenterFromAnchorOffset,
    getTopLeftTile,
} from "../../utils/tiles";
import { AerisToken } from "../aerisToken";
import { MovementPathTracker } from "../trail/BacktrableMovementTrail";
import { CostOffset } from "../trail/costPath";
import { formatTrailSegments } from "../trail/formatTrailSegmets";

export class TokenGridPainter {
    private _strokeGraphics: PIXI.Graphics | null = null;
    private _fillGraphics: PIXI.Graphics | null = null;
    private _textContainer: PIXI.Container | null = null;

    private _reticuleFilter: ReticuleFilter | null = null;
    private _reticuleSprite: PIXI.Sprite | null = null;

    private _tileSprite: PIXI.Sprite | null = null;
    private _tileFilter: TileRegionFilter | null = null;

    private _strokeSprite: PIXI.Sprite | null = null;
    private _strokeFilter: TileStrokeFilter | null = null;

    private _pathRenderer?: PathRenderer;

    constructor(private token: AerisToken) {}

    paintAndBroadcast() {
        const pathTiles = this.token.movementPath.getPaintedTiles();

        const colorConfig = getGridColorConfig();

        const movementData = this.token.pathStateManager.cachedMovementData;

        const sorted = movementData?.ranges
            .slice()
            .sort((a, b) => a.value - b.value);

        const data = {
            mode: movementData?.mode ?? "walk",
            ranges: sorted ?? [],
        };

        if (!game.user?.isGM)
            socketlibSocket?.executeForOthers(
                "handleBroadcastPaint",
                this.token.id,
                colorConfig,
                pathTiles,
                data
            );

        if (!isGridPaintingEnabled()) return;

        // this._paintStroke();

        this.paint(colorConfig, pathTiles, data, {
            basePaintedTiles: this.token.pathStateManager.basePaintedTiles,
            basePaintedKeys: this.token.pathStateManager.basePaintedKeys,
            previewPaintedTiles: this.token.pathStateManager.pathPaintedTiles,
            previewDistMap: this.token.pathStateManager.pathDistanceMap,
            currentMode: this.token.dragActionHandler.currentAction,
            uncapped: this.token.pathStateManager.cachedUncapped,
        });
    }

    paint(
        colorConfig: ColorConfig,
        path: CostOffset[],
        movmentData: MovementData,
        localData?: LocalPaintData
    ) {
        if (!isGridPaintingEnabled()) return;

        const isOtherUser = !localData;
        const showOthers =
            game.settings?.get(MODULE_ID, SHOW_OTHERS_PATHS) ?? true;

        if (isOtherUser && !showOthers) return;

        if (localData) {
            localData.basePaintedKeys = new Set(localData.basePaintedKeys);
            localData.basePaintedTiles = [...localData.basePaintedTiles];
            appendPathWithFootprintToLocalData(localData, path, this.token);
            localData.previewDistMap = expandPreviewDistTopLeft(
                localData.previewDistMap,
                this.token
            );
        }

        const alphaMultiplier =
            game.settings?.get(MODULE_ID, OTHERS_ALPHA_MULTIPLIER) ?? 0.5;
        const effectiveAlpha = isOtherUser ? alphaMultiplier : 1;

        const gridSize = canvas!.grid?.size ?? 100;

        const centers = path.map(({ j, i, cost }) => ({
            ...getTokenCenterFromAnchorOffset(this.token, { i, j })!,
            cost,
        }));

        const layer = canvas!.layers.find((l) => l.options?.name === "grid");
        if (!layer) {
            console.warn("Could not find grid layer");
            return;
        }
        if (!layer.sortableChildren) layer.sortableChildren = true;

        const { ranges } = movmentData;

        const text = formatTrailSegments(path);
        const subHeader = localData?.currentMode
            ? `Current: ${localData.currentMode}`
            : undefined;

        if (canvas?.grid?.isHexagonal)
            this._paintFill(
                layer,
                colorConfig,
                gridSize,
                path,
                ranges,
                localData
            );
        else
            this._paintFillShader(
                layer,
                colorConfig,
                gridSize,
                path,
                ranges,
                localData
            );

        this._paintReticuleShader(
            layer,
            colorConfig,
            gridSize,
            effectiveAlpha,
            centers
        );

        const labels = isDistanceLabelAboveTokenEnabled();

        if (labels && (subHeader !== undefined || path.length !== 1))
            this._paintLabel(text, subHeader);
    }

    //@ts-expect-error unused
    private _paintStroke() {
        const gridSize = canvas!.grid?.size ?? 100;

        if (!this._strokeGraphics) {
            this._strokeGraphics = new PIXI.Graphics();
            disablePixiInteraction(this._strokeGraphics);
            this._strokeGraphics.filters = [
                foundry.canvas.rendering.filters.VisionMaskFilter.create(),
            ];
        }

        const { rgb, alpha } = colorStringToRGBAlpha(
            game.settings?.get(MODULE_ID, STROKE_COLOR) ?? DEFAULT_STROKE_COLOR
        );

        const isHexagonal = !!canvas!.grid?.isHexagonal;
        const strokeFn = isHexagonal ? drawHexStroke : drawSquareStroke;

        const strokeGfx = strokeFn(
            this.token.pathStateManager.basePaintedTiles,
            this.token.pathStateManager.basePaintedKeys,
            gridSize,
            rgb,
            alpha,
            this._strokeGraphics
        );

        strokeGfx.zIndex = -1;

        const layer = canvas!.layers.find((l) => l.options?.name === "grid");
        if (!layer) {
            console.warn("Could not find grid layer");
            return;
        }

        layer.addChild(strokeGfx);

        if (isGridSelectSoundEnabled()) {
            const volume = Number(
                game.settings?.storage.get("client")?.[
                    "core.globalInterfaceVolume"
                ] ?? "1"
            );
            game.audio?.play(getGridSelectSound(), { volume });
        }
    }

    private _paintReticuleShader(
        layer: CanvasLayer,
        colorConfig: ColorConfig,
        gridSize: number,
        effectiveAlpha: number,
        centers: { x: number; y: number }[]
    ) {
        this._reticuleFilter ??= new ReticuleFilter();
        this._reticuleSprite ??= (() => {
            const s = new PIXI.Sprite(PIXI.Texture.EMPTY);
            disablePixiInteraction(s);
            s.filters = [
                this._reticuleFilter,
                foundry.canvas.rendering.filters.VisionMaskFilter.create(),
            ];
            s.filterArea = canvas!.app!.renderer.screen;
            return s;
        })();

        if (!this._reticuleSprite.parent) {
            layer.addChild(this._reticuleSprite);
            this._reticuleSprite.zIndex = 100;
        }

        const app = canvas?.app;
        if (!app) return;

        const dimensions = canvas?.dimensions;
        if (!dimensions) return;

        const stage = canvas?.stage;
        if (!stage) return;

        this._reticuleSprite.position.set(0, 0);
        this._reticuleSprite.width = dimensions.width;
        this._reticuleSprite.height = dimensions.height;

        const u = this._reticuleFilter.uniforms;
        const { rgb, alpha } = colorConfig.reticule;

        u.uColor[0] = ((rgb >> 16) & 255) / 255;
        u.uColor[1] = ((rgb >> 8) & 255) / 255;
        u.uColor[2] = (rgb & 255) / 255;
        u.uColor[3] = alpha * effectiveAlpha;

        u.uOuter = gridSize * 0.2;
        u.uInner = gridSize * 0.05;
        u.uStroke = gridSize * 0.02;

        u.uCount = Math.min(centers.length, 128);
        for (let i = 0; i < u.uCount; i++) {
            u.uCenters[i * 2] = centers[i].x;
            u.uCenters[i * 2 + 1] = centers[i].y;
        }

        u.uDrawConnectors = centers.length > 1;
        this._reticuleSprite.visible = u.uCount > 0;
    }

    private _paintLabel(text: string, subHeader?: string) {
        if (!this._textContainer) {
            this._textContainer = new PIXI.Container();
            disablePixiInteraction(this._textContainer);
        }

        this.killUpdateLabelTransform();
        this.startUpdateLabelTransform();
        const floatingLabel = drawFloatingTokenLabel(
            this._textContainer,
            text,
            {
                subHeader,
            }
        );

        this.token.mesh?.addChild(floatingLabel);
        canvas!.tokens!.sortableChildren = true;
        canvas!.tokens!.sortChildren();
        floatingLabel.zIndex = 10000;
    }

    private _paintFill(
        layer: CanvasLayer,
        colorConfig: ColorConfig,
        gridSize: number,
        path: CostOffset[],
        ranges: MovementRange[],
        localData?: LocalPaintData
    ) {
        if (!this._fillGraphics) {
            this._fillGraphics = new PIXI.Graphics();
            disablePixiInteraction(this._fillGraphics);
            this._fillGraphics.filters = [
                foundry.canvas.rendering.filters.VisionMaskFilter.create(),
            ];
        }

        const pathKeys = MovementPathTracker.tileset(path);

        const isHexagonal = !!canvas!.grid?.isHexagonal;

        const w = this.token.document.width ?? 1;

        const maxRangeFromArrs =
            ranges && ranges.length ? ranges[ranges.length - 1].value : 0;
        const priorMovement = this.token.movementBudgetHandler.priorTurnCost;
        const maxRange = Math.max(0, maxRangeFromArrs - priorMovement);

        const fillFn = isHexagonal
            ? w > 1
                ? drawHexTilesLarge
                : drawHexTilesSmall
            : w > 1
            ? drawSquareTilesLarge
            : drawSquareTilesSmall;

        const fillGfx = fillFn(
            gridSize,
            this.token,
            colorConfig,
            this._fillGraphics,
            w,
            path,
            pathKeys,
            ranges,
            maxRange,
            localData
        );

        fillGfx.zIndex = -2;

        layer.addChild(fillGfx);
    }

    private _initTileSprite(layer: CanvasLayer) {
        this._tileFilter ??= new TileRegionFilter();
        this._tileSprite ??= (() => {
            const s = new PIXI.Sprite(PIXI.Texture.EMPTY);
            disablePixiInteraction(s);
            s.filters = [
                this._tileFilter!,
                new WaveBandsFilter(),
                foundry.canvas.rendering.filters.VisionMaskFilter.create(),
            ];
            s.filterArea = canvas!.app!.renderer.screen;
            layer.addChild(s);
            s.zIndex = -2;
            return s;
        })();
    }

    private _initStrokeSprite(layer: CanvasLayer) {
        this._strokeFilter ??= new TileStrokeFilter();
        this._strokeSprite ??= (() => {
            const s = new PIXI.Sprite(PIXI.Texture.EMPTY);
            disablePixiInteraction(s);
            s.filters = [
                this._strokeFilter!,
                foundry.canvas.rendering.filters.VisionMaskFilter.create(),
            ];
            s.filterArea = canvas!.app!.renderer.screen;
            layer.addChild(s);
            s.zIndex = -1;
            return s;
        })();
    }

    private _paintFillShader(
        layer: CanvasLayer,
        colorConfig: ColorConfig,
        gridSize: number,
        path: CostOffset[],
        ranges: MovementRange[],
        localData?: LocalPaintData
    ) {
        this._initTileSprite(layer);
        this._initStrokeSprite(layer);
        if (
            !this._tileSprite ||
            !this._tileFilter ||
            !this._strokeSprite ||
            !this._strokeFilter
        )
            return;

        const maxRangeFromArrs =
            ranges && ranges.length ? ranges[ranges.length - 1].value : 0;
        const priorMovement = this.token.movementBudgetHandler.priorTurnCost;
        const maxRange = Math.max(0, maxRangeFromArrs - priorMovement);
        const w = this.token.document.width ?? 1;

        const { costMap, tileSet } = buildPaintedCostMap(path, w);
        const has = (x: number, y: number) => tileSet.has(`${x},${y}`);

        const dims = canvas!.dimensions!;
        this._tileSprite.position.set(0, 0);
        this._tileSprite.width = dims.width;
        this._tileSprite.height = dims.height;

        const cols = Math.ceil(dims.width / gridSize);
        const rows = Math.ceil(dims.height / gridSize);
        const reachableMaskBuf = new Uint8Array(cols * rows * 4);
        const reachableColorBuf = new Uint8Array(cols * rows * 4);

        const strokeMaskBuf = new Uint8Array(cols * rows * 4);

        const pathMaskBuf = new Uint8Array(cols * rows * 4);
        const pathColorBuf = new Uint8Array(cols * rows * 4);

        const getIdx = (j: number, i: number) => (i * cols + j) * 4;

        const combinedTiles = localData?.basePaintedTiles ?? path;

        const base = this.token.pathStateManager.basePaintedTiles;
        for (const { j, i } of base) {
            const idx = getIdx(j, i);

            strokeMaskBuf[idx + 0] = 255;
            strokeMaskBuf[idx + 1] = 0;
            strokeMaskBuf[idx + 2] = 0;
            strokeMaskBuf[idx + 3] = 255;
        }

        const pathIndex = new Map<string, number>();
        path.forEach((p, idx) => pathIndex.set(`${p.j},${p.i}`, idx));

        const idxOf = (jj: number, ii: number) =>
            pathIndex.get(`${jj},${ii}`) ?? -1;
        const consec = (a: number, b: number) =>
            a >= 0 && b >= 0 && Math.abs(a - b) === 1;

        const tilesForPath = path.map((p) => {
            const entry = costMap.get(`${p.j},${p.i}`);
            const cost = entry?.cost ?? Infinity;

            const valid = entry?.validRange ?? false;

            const iTop = idxOf(p.j, p.i - 1);
            const iRight = idxOf(p.j + 1, p.i);
            const iBottom = idxOf(p.j, p.i + 1);
            const iLeft = idxOf(p.j - 1, p.i);

            let cornerMask = 0;
            if (consec(iTop, iLeft)) cornerMask |= 1; // NW
            if (consec(iTop, iRight)) cornerMask |= 2; // NE
            if (consec(iBottom, iLeft)) cornerMask |= 4; // SW
            if (consec(iBottom, iRight)) cornerMask |= 8; // SE

            return {
                j: p.j,
                i: p.i,
                wx: (p.j + 0.5) * gridSize,
                wy: (p.i + 0.5) * gridSize,
                cost,
                valid,
                cornerMask,
            };
        });

        for (const { j, i } of combinedTiles) {
            const inTrail = has(j, i);

            const idx = getIdx(j, i);
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

            const iTop = idxOf(j, i - 1);
            const iRight = idxOf(j + 1, i);
            const iBottom = idxOf(j, i + 1);
            const iLeft = idxOf(j - 1, i);

            let cornerMask = 0;
            if (consec(iTop, iLeft)) cornerMask |= 1; // NW
            if (consec(iTop, iRight)) cornerMask |= 2; // NE
            if (consec(iBottom, iLeft)) cornerMask |= 4; // SW
            if (consec(iBottom, iRight)) cornerMask |= 8; // SE

            if (!inTrail) {
                reachableMaskBuf[idx + 0] = 255;
                reachableMaskBuf[idx + 1] = w > 1 ? 0 : cornerMask;
                reachableMaskBuf[idx + 2] = 0;
                reachableMaskBuf[idx + 3] = 255;

                reachableColorBuf[idx + 0] = (rgb >> 16) & 255;
                reachableColorBuf[idx + 1] = (rgb >> 8) & 255;
                reachableColorBuf[idx + 2] = rgb & 255;
                reachableColorBuf[idx + 3] = Math.round(alpha * 255);
            } else {
                pathMaskBuf[idx + 0] = 255;
                pathMaskBuf[idx + 1] = w > 1 ? 0 : cornerMask;
                pathMaskBuf[idx + 2] = 0;
                pathMaskBuf[idx + 3] = 255;

                pathColorBuf[idx + 0] = (rgb >> 16) & 255;
                pathColorBuf[idx + 1] = (rgb >> 8) & 255;
                pathColorBuf[idx + 2] = rgb & 255;
                pathColorBuf[idx + 3] = Math.round(alpha * 255);
            }
        }

        const maskTex = PIXI.Texture.fromBuffer(reachableMaskBuf, cols, rows);
        const colorTex = PIXI.Texture.fromBuffer(reachableColorBuf, cols, rows);

        const pathMaskTex = PIXI.Texture.fromBuffer(pathMaskBuf, cols, rows);
        const pathColorTex = PIXI.Texture.fromBuffer(pathColorBuf, cols, rows);
        const strokeMaskTex = PIXI.Texture.fromBuffer(
            strokeMaskBuf,
            cols,
            rows
        );

        [maskTex, colorTex, strokeMaskTex, pathMaskTex, pathColorTex].forEach(
            (t) => {
                t.baseTexture.mipmap = PIXI.MIPMAP_MODES.OFF;
                t.baseTexture.scaleMode = PIXI.SCALE_MODES.NEAREST;
            }
        );

        const strokeU = this._strokeFilter.uniforms;
        this._strokeFilter.setMask(strokeMaskTex, cols, rows);
        strokeU.uGrid = gridSize;
        strokeU.uPad = 0.05;
        strokeU.uRadius = 0.08;
        strokeU.uStroke = 3.0;

        const { rgb: strokeRgb, alpha: strokeAlpha } = colorStringToRGBAlpha(
            game.settings?.get(MODULE_ID, STROKE_COLOR) ?? DEFAULT_STROKE_COLOR
        );

        strokeU.uStrokeColor[0] = ((strokeRgb >> 16) & 255) / 255.0;
        strokeU.uStrokeColor[1] = ((strokeRgb >> 8) & 255) / 255.0;
        strokeU.uStrokeColor[2] = (strokeRgb & 255) / 255.0;
        strokeU.uStrokeColor[3] = strokeAlpha;

        const u = this._tileFilter.uniforms;

        this._tileFilter.setMask(maskTex, cols, rows);
        this._tileFilter.setColorTex(colorTex);
        u.uGrid = gridSize;
        u.uPad = 0.03;
        u.uRadius = 0.08;
        u.uStroke = gridSize * 0.03;
        u.uInset = gridSize * 0.02;

        const tileInstances = tilesForPath.map((t) => ({
            cx: t.wx + ((w - 1) * gridSize) / 2,
            cy: t.wy + ((w - 1) * gridSize) / 2,
            valid: t.valid,
            cornerMask: w > 1 ? 0 : t.cornerMask,
        }));

        const segments: PathSegment[] = tilesForPath.map((t) => ({
            x: t.wx + ((w - 1) * gridSize) / 2,
            y: t.wy + ((w - 1) * gridSize) / 2,
            valid: t.valid,
        }));

        const colorValid = rgbIntToRGBA(
            colorConfig.active.rgb,
            colorConfig.active.alpha
        );
        const colorInvalid = rgbIntToRGBA(
            colorConfig.invalid.rgb,
            colorConfig.invalid.alpha
        );

        if (!this._pathRenderer) {
            this._pathRenderer = new PathRenderer(layer, gridSize, {
                colorValid,
                colorInvalid,
                tokenSize: w,
            });
            this._pathRenderer.attach(layer);
        }

        this._pathRenderer.update(segments, tileInstances);

        this._tileSprite.visible = combinedTiles.length > 0;
        this._strokeSprite.visible = combinedTiles.length > 0;
    }

    private _updateLabelTransform: (() => void) | null = null;

    private getUpdateLabelTransform(removing?: boolean) {
        if (removing) {
            if (this._updateLabelTransform) return this._updateLabelTransform;
            else return null;
        } else {
            if (this._updateLabelTransform) return null;
            else {
                const cb = () => {
                    if (!this._textContainer || !this.token?.mesh) return;

                    const baseRotation = isAutoRotateEnabled()
                        ? this.token.mesh.rotation
                        : this.token.document.lockRotation
                        ? 0
                        : this.token.document._source.rotation *
                          PIXI.DEG_TO_RAD;

                    this.updateTextContainerRotation(baseRotation);
                };

                return cb;
            }
        }
    }

    public updateTextContainerRotation(rotation: number) {
        if (!this._textContainer) return;
        const { scaleX: textScaleX, scaleY: textScaleY } =
            this.token.document.texture;
        const { scaleX, scaleY } = getTokenRenderScale(this.token);

        const baseHeight = this.token.h;
        const halfGrid = (canvas!.grid?.sizeY ?? 100) / 2;

        const flipX = Math.sign(textScaleX ?? 1);
        const flipY = Math.sign(textScaleY ?? 1);

        const angle = -rotation * flipY * flipX;

        const offsetY = -baseHeight / 2 - halfGrid;

        const scaledOffsetY = offsetY / scaleY;

        const x = -scaledOffsetY * Math.sin(angle);
        const y = scaledOffsetY * Math.cos(angle);

        this._textContainer.position.set(x, y);

        this._textContainer.scale.set(1 / scaleX, 1 / scaleY);

        this._textContainer.rotation = angle;
    }

    private startUpdateLabelTransform() {
        const cb = this.getUpdateLabelTransform();
        if (cb) {
            canvas!.app?.ticker.add(cb);
            this._updateLabelTransform = cb;
        }
    }

    private killUpdateLabelTransform() {
        const cb = this.getUpdateLabelTransform(true);
        if (cb) {
            canvas!.app?.ticker.remove(cb);
            this._updateLabelTransform = null;
        }
    }

    removePaint() {
        this._textContainer?.removeChildren();
        this._fillGraphics?.clear();
        this._strokeGraphics?.clear();
        this._pathRenderer?.update([], []);
        this._reticuleSprite?.destroy();
        this._reticuleSprite = null;
        this._tileSprite?.destroy();
        this._tileSprite = null;
        this._strokeSprite?.destroy();
        this._strokeSprite = null;

        this.killUpdateLabelTransform();
    }
}

export function handleBroadcastPaint(
    tokenId: string,
    colorConfig: ColorConfig,
    tiles: CostOffset[],
    data: MovementData
) {
    const token = canvas!.tokens?.get(tokenId) as AerisToken | undefined;
    if (!token) return;

    token.gridPainter.paint(colorConfig, tiles, data);
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

function expandPreviewDistTopLeft(
    src: Map<string, number>,
    token: Token
): Map<string, number> {
    const baseOffsets = getOccupiedTiles(token);
    const anchorOffset = getTopLeftTile(baseOffsets);

    const out = new Map<string, number>();

    if (canvas!.grid?.isSquare) {
        const shape = baseOffsets.map((o) => ({
            j: o.j - anchorOffset.j,
            i: o.i - anchorOffset.i,
        }));

        for (const [key, dist] of src) {
            const [j0, i0] = key.split(",").map(Number); // top-left anchor per step
            for (const r of shape) {
                const k = `${j0 + r.j},${i0 + r.i}`;
                const prev = out.get(k);
                if (prev === undefined || dist < prev) out.set(k, dist);
            }
        }
        return out;
    } else if (canvas!.grid?.isHexagonal) {
        const hexGrid = canvas!.grid as HexagonalGrid;
        const anchorCube = hexGrid.offsetToCube(anchorOffset);
        const shapeCubes = baseOffsets.map((o) => {
            const cube = hexGrid.offsetToCube(o);
            return {
                dq: cube.q - anchorCube.q,
                dr: cube.r - anchorCube.r,
                ds: cube.s - anchorCube.s,
            };
        });

        for (const [key, dist] of src) {
            const [j0, i0] = key.split(",").map(Number);
            const c0 = hexGrid.offsetToCube({ j: j0, i: i0 });
            for (const d of shapeCubes) {
                const tile = hexGrid.cubeToOffset({
                    q: c0.q + d.dq,
                    r: c0.r + d.dr,
                    s: c0.s + d.ds,
                });
                const k = `${tile.j},${tile.i}`;
                const prev = out.get(k);
                if (prev === undefined || dist < prev) out.set(k, dist);
            }
        }
        return out;
    }

    return out;
}

function appendPathWithFootprintToLocalData(
    localData: {
        basePaintedTiles: Offset[];
        basePaintedKeys: Set<string>;
    },
    path: { j: number; i: number }[],
    token: Token.Implementation
): void {
    const grid = canvas!.grid!;
    const baseOffsets = getOccupiedTiles(token);
    if (!baseOffsets.length) return;

    if (grid.isSquare) {
        const anchor = getTopLeftTile(baseOffsets);
        const shape = baseOffsets.map((o) => ({
            j: o.j - anchor.j,
            i: o.i - anchor.i,
        }));

        for (const { j: j0, i: i0 } of path) {
            for (const r of shape) {
                const j = j0 + r.j,
                    i = i0 + r.i;
                const key = `${j},${i}`;
                if (!localData.basePaintedKeys.has(key)) {
                    localData.basePaintedKeys.add(key);
                    localData.basePaintedTiles.push({ j, i });
                }
            }
        }
        return;
    }

    if (grid.isHexagonal) {
        const hex = grid as HexagonalGrid;
        const anchor = getTopLeftTile(baseOffsets);
        const aC = hex.offsetToCube(anchor);
        const shapeCubes = baseOffsets.map((o) => {
            const c = hex.offsetToCube(o);
            return { dq: c.q - aC.q, dr: c.r - aC.r, ds: c.s - aC.s };
        });

        for (const { j: j0, i: i0 } of path) {
            const c0 = hex.offsetToCube({ j: j0, i: i0 });
            for (const d of shapeCubes) {
                const tile = hex.cubeToOffset({
                    q: c0.q + d.dq,
                    r: c0.r + d.dr,
                    s: c0.s + d.ds,
                });
                const key = `${tile.j},${tile.i}`;
                if (!localData.basePaintedKeys.has(key)) {
                    localData.basePaintedKeys.add(key);
                    localData.basePaintedTiles.push(tile);
                }
            }
        }
    }
}
