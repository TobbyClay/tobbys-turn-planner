import { WaveBandsFilter } from "./waveBandsFilter";
import { disablePixiInteraction } from "./disableInteraction";

interface PathTile {
    cx: number;
    cy: number;
    valid: boolean;
    cornerMask: number;
}

export interface PathSegment {
    x: number;
    y: number;
    valid: boolean;
}

interface PathStyle {
    colorValid: Float32Array;
    colorInvalid: Float32Array;
    tokenSize: number;
}

const MAX_SEGMENTS = 1024;
const VERTS_PER_SEGMENT = 4;
const INDICES_PER_SEGMENT = 6;

const MAX_VERTS = MAX_SEGMENTS * VERTS_PER_SEGMENT;
const MAX_INDICES = MAX_SEGMENTS * INDICES_PER_SEGMENT;

export class PathRenderer {
    private container: PIXI.Container;
    private tubeMesh: PIXI.Mesh<PIXI.Shader> | null = null;
    private tubeGeom: PIXI.Geometry | null = null;
    private tubeShader: PIXI.Shader | null = null;

    private style: PathStyle;
    private gridSize: number;

    private vPos: Float32Array;
    private vFlags: Float32Array;
    private vIndices: Uint16Array;
    private tubeIndexCount = 0;
    private vShape: Float32Array;
    private vTileCenters: Float32Array;
    private vTileMasks: Float32Array;
    private _tick?: (dt: number) => void;

    constructor(layer: PIXI.Container, gridSize: number, style: PathStyle) {
        this.container = new PIXI.Container();
        disablePixiInteraction(this.container);
        layer.addChild(this.container);

        this.gridSize = gridSize;
        this.style = style;

        this.vPos = new Float32Array(MAX_VERTS * 2);
        this.vFlags = new Float32Array(MAX_VERTS);
        this.vIndices = new Uint16Array(MAX_INDICES);
        this.vShape = new Float32Array(MAX_VERTS);
        this.vTileCenters = new Float32Array(MAX_VERTS * 2);
        this.vTileMasks = new Float32Array(MAX_VERTS);

        this.tubeGeom = new PIXI.Geometry()
            .addAttribute("aVertexPosition", this.vPos, 2)
            .addAttribute("aValid", this.vFlags, 1)
            .addAttribute("aShapeType", this.vShape, 1)
            .addAttribute("aTileCenter", this.vTileCenters, 2)
            .addAttribute("aTileMask", this.vTileMasks, 1)
            .addIndex(this.vIndices as unknown as number[]);

        this.tubeShader = this._makeTubeShader();

        this.tubeMesh = new PIXI.Mesh<PIXI.Shader>(
            this.tubeGeom,
            this.tubeShader
        );

        if (this.tubeMesh) {
            disablePixiInteraction(this.tubeMesh);
            this.container.addChild(this.tubeMesh);
            this.tubeMesh.filters = [
                new WaveBandsFilter(),
                foundry.canvas.rendering.filters.VisionMaskFilter.create(),
            ];
            this.tubeMesh.filterArea = canvas!.app!.renderer.screen;
            this.tubeMesh.zIndex = 0;
            //@ts-expect-error untyped
            this.tubeMesh.blendMode = PIXI.BLEND_MODES.MAX_COLOR;
        }

        const dimensions = canvas?.dimensions;
        if (!dimensions) return;
    }

    update(path: PathSegment[], tiles: PathTile[]): void {
        this._updateTubeGeometry(path, tiles);
        this._updateTubeShaderUniforms(tiles);
    }

    destroy(): void {
        const ticker = canvas?.app?.ticker ?? PIXI.Ticker.shared;
        if (this._tick) ticker.remove(this._tick);

        // --- Tube mesh / shader / geometry ---
        if (this.tubeMesh) {
            this.tubeMesh.filters = null;
            this.tubeMesh.parent?.removeChild(this.tubeMesh);
            this.tubeMesh.destroy({
                children: false,
                texture: false,
                baseTexture: false,
            });
            this.tubeMesh = null;
        }
        if (this.tubeShader) {
            this.tubeShader.destroy();
            this.tubeShader = null;
        }
        if (this.tubeGeom) {
            this.tubeGeom.destroy();
            this.tubeGeom = null;
        }

        if (this.container) {
            this.container.removeChildren();
            this.container.parent?.removeChild(this.container);
            this.container.destroy({ children: true });
        }
    }

    private _updateTubeGeometry(path: PathSegment[], tiles: PathTile[]): void {
        if (!this.tubeGeom) return;

        const hw = this.gridSize * 0.4 * 0.5 * this.style.tokenSize; // half-width of tube
        const halfTile = this.gridSize * 0.45 * this.style.tokenSize; // half-size of tile squares

        let vCount = 0,
            fCount = 0,
            iCount = 0,
            quad = 0;

        // --- Interleaved: tube segment + matching tile ---
        const segCount = path.length - 1;
        const tileCount = tiles.length;
        const maxCount = Math.max(segCount, tileCount);

        for (let k = 0; k < maxCount; k++) {
            // --- tube quad ---
            if (k < segCount) {
                const a = path[k];
                const b = path[k + 1];

                const dx = b.x - a.x;
                const dy = b.y - a.y;
                const len = Math.hypot(dx, dy) || 1;
                const nx = -dy / len;
                const ny = dx / len;

                this.vPos[vCount++] = a.x + nx * hw;
                this.vPos[vCount++] = a.y + ny * hw;
                this.vPos[vCount++] = a.x - nx * hw;
                this.vPos[vCount++] = a.y - ny * hw;
                this.vPos[vCount++] = b.x + nx * hw;
                this.vPos[vCount++] = b.y + ny * hw;
                this.vPos[vCount++] = b.x - nx * hw;
                this.vPos[vCount++] = b.y - ny * hw;

                const av = a.valid ? 1 : 0;
                const bv = b.valid ? 1 : 0;
                this.vFlags[fCount++] = av;
                this.vFlags[fCount++] = av;
                this.vFlags[fCount++] = bv;
                this.vFlags[fCount++] = bv;

                this.vShape[fCount - 4] = 0.0;
                this.vShape[fCount - 3] = 0.0;
                this.vShape[fCount - 2] = 0.0;
                this.vShape[fCount - 1] = 0.0;

                for (let v = 0; v < 4; v++) {
                    this.vTileCenters[(fCount - 4 + v) * 2] = 0.0;
                    this.vTileCenters[(fCount - 4 + v) * 2 + 1] = 0.0;
                    this.vTileMasks[fCount - 4 + v] = 0.0;
                }

                const base = quad * 4;
                this.vIndices[iCount++] = base;
                this.vIndices[iCount++] = base + 1;
                this.vIndices[iCount++] = base + 2;
                this.vIndices[iCount++] = base + 2;
                this.vIndices[iCount++] = base + 1;
                this.vIndices[iCount++] = base + 3;
                quad++;
            }

            // --- tile quad ---
            if (k < tileCount) {
                const t = tiles[k];

                this.vPos[vCount++] = t.cx - halfTile;
                this.vPos[vCount++] = t.cy - halfTile;
                this.vPos[vCount++] = t.cx + halfTile;
                this.vPos[vCount++] = t.cy - halfTile;
                this.vPos[vCount++] = t.cx - halfTile;
                this.vPos[vCount++] = t.cy + halfTile;
                this.vPos[vCount++] = t.cx + halfTile;
                this.vPos[vCount++] = t.cy + halfTile;

                const valid = t.valid ? 1 : 0;
                this.vFlags[fCount++] = valid;
                this.vFlags[fCount++] = valid;
                this.vFlags[fCount++] = valid;
                this.vFlags[fCount++] = valid;

                this.vShape[fCount - 4] = 1.0;
                this.vShape[fCount - 3] = 1.0;
                this.vShape[fCount - 2] = 1.0;
                this.vShape[fCount - 1] = 1.0;

                for (let v = 0; v < 4; v++) {
                    this.vTileCenters[(fCount - 4 + v) * 2] = t.cx;
                    this.vTileCenters[(fCount - 4 + v) * 2 + 1] = t.cy;
                    this.vTileMasks[fCount - 4 + v] = t.cornerMask;
                }

                const base = quad * 4;
                this.vIndices[iCount++] = base;
                this.vIndices[iCount++] = base + 1;
                this.vIndices[iCount++] = base + 2;
                this.vIndices[iCount++] = base + 1;
                this.vIndices[iCount++] = base + 3;
                this.vIndices[iCount++] = base + 2;
                quad++;
            }
        }

        // --- upload buffers ---
        this.tubeGeom.getBuffer("aVertexPosition")!.update();
        this.tubeGeom.getBuffer("aValid")!.update();
        this.tubeGeom.getBuffer("aShapeType")!.update();
        this.tubeGeom.getBuffer("aTileCenter")!.update();
        this.tubeGeom.getBuffer("aTileMask")!.update();
        this.tubeGeom.getIndex()!.update();

        this.tubeIndexCount = iCount;
        this.tubeMesh!.start = 0;
        this.tubeMesh!.size = this.tubeIndexCount;
        this.tubeMesh!.renderable = this.tubeIndexCount > 0;
    }

    private _makeTubeShader(): PIXI.Shader {
        const vs = `
            precision highp float;
            attribute vec2 aVertexPosition;
            attribute float aValid;
            varying float vValid;
            varying vec2 vWorldPos;

            attribute float aShapeType;
            varying float vShapeType;

            attribute vec2 aTileCenter;
            attribute float aTileMask;

            varying vec2 vTileCenter;
            varying float vTileMask;

            uniform mat3 translationMatrix;
            uniform mat3 projectionMatrix;
            void main() {
                vValid = aValid;
                vShapeType = aShapeType;
                vWorldPos = aVertexPosition;
                vTileCenter = aTileCenter;
                vTileMask = aTileMask;
                gl_Position = vec4((projectionMatrix * translationMatrix * vec3(aVertexPosition, 1.0)).xy, 0.0, 1.0);
            }
        `;
        const fs = `
            #ifdef GL_OES_standard_derivatives
            #extension GL_OES_standard_derivatives : enable
            #endif
            precision highp float;

            varying float vValid;
            varying float vShapeType;
            varying vec2  vTileCenter;
            varying float vTileMask;
            varying vec2  vWorldPos;

            uniform float uRadius;
            uniform float uPad;
            uniform float uAA;
            uniform float uSize;
            uniform vec2 uTileCenters[64];
            uniform float uTileMasks[64];
            uniform float uCut;
            uniform int uTileCount;
            uniform vec4 uColorValid;
            uniform vec4 uColorInvalid;
            uniform float uBand;
            uniform float uBias;
            uniform float uTileScale;

            float sdBox(vec2 p, vec2 b) { 
                vec2 q = abs(p) - b;
                return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0); 
            }

            float bit(float m, float n){
                return floor(mod(floor(m / exp2(n)), 2.0));
            }

            float tileSDF(vec2 p, float mask){
                // p is local [-0.5..0.5]
                vec2 boxSize = vec2(0.5) - uPad - uRadius;
                float d = sdBox(p, boxSize) - uRadius;

                float bNW = bit(mask, 0.0);
                float bNE = bit(mask, 1.0);
                float bSW = bit(mask, 2.0);
                float bSE = bit(mask, 3.0);

                float diagNW = ( p.x + p.y + 1.0 - uCut);
                float diagNE = (-p.x + p.y + 1.0 - uCut);
                float diagSW = ( p.x - p.y + 1.0 - uCut);
                float diagSE = (-p.x - p.y + 1.0 - uCut);

                if (bNW > 0.5) d = max(d, -diagNW);
                if (bNE > 0.5) d = max(d, -diagNE);
                if (bSW > 0.5) d = max(d, -diagSW);
                if (bSE > 0.5) d = max(d, -diagSE);

                return d;
            }

            bool isInsideTile(vec2 worldPos){
                float halfSize = 0.5 * uSize * uTileScale;
                for (int i = 0; i < 64; i++){
                    if (i >= uTileCount) break;

                    vec2 c = uTileCenters[i];
                    vec2 rel = worldPos - c;

                    // quick reject (AABB) to skip expensive SDF
                    if (abs(rel.x) > halfSize || abs(rel.y) > halfSize) continue;

                    vec2 p = rel / (uSize * uTileScale);             // -> [-0.5..0.5]
                    float d = tileSDF(p, uTileMasks[i]);
                    if (d < 0.0) return true;
                }
                return false;
            }

            void main() {
                
                float t = smoothstep(0.5 + uBias - uBand, 0.5 + uBias + uBand, vValid);
                vec4 c = mix(uColorInvalid, uColorValid, t);

                if (vShapeType > 0.5) {

                    if (!isInsideTile(vWorldPos)) {
                        discard;
                    }
                    gl_FragColor = vec4(c.rgb, c.a);
                } else {
                    gl_FragColor = vec4(c.rgb, c.a);
                }
            }

        `;

        return PIXI.Shader.from(vs, fs, {
            uColorValid: this.style.colorValid,
            uColorInvalid: this.style.colorInvalid,
            uSize: this.gridSize,
            uRadius: 0.08,
            uPad: 0.05,
            uAA: 1.0 / this.gridSize,
            uTileCenters: new Float32Array(128),
            uTileMasks: new Float32Array(64),
            uTileCount: 0,
            uBand: 0.11,
            uBias: 0.0,
            uCut: 0.4,
            uTileScale: this.style.tokenSize,
        });
    }

    private _updateTubeShaderUniforms(tiles: PathTile[]): void {
        if (!this.tubeShader) return;
        const centers = new Float32Array(128);
        const masks = new Float32Array(64);
        const count = Math.min(tiles.length, 64);

        for (let i = 0; i < count; i++) {
            centers[i * 2] = tiles[i].cx;
            centers[i * 2 + 1] = tiles[i].cy;
            masks[i] = tiles[i].cornerMask & 0x0f;
        }

        this.tubeShader.uniforms.uTileCenters = centers;
        this.tubeShader.uniforms.uTileMasks = masks;
        this.tubeShader.uniforms.uTileCount = count;
    }

    attach(parent: PIXI.Container) {
        parent.addChild(this.container);
    }
}
