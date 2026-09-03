const strokeFS = `
    precision highp float;
    varying vec2 vTextureCoord;
    uniform vec4 outputFrame, uM; uniform vec2 uT;
    uniform sampler2D uMask; uniform vec2 uMaskSize;
    uniform float uGrid, uPad, uRadius, uStroke;
    uniform vec4  uStrokeColor;
    uniform float uStrokePx;
    uniform float uTime;
    uniform float uPulseFreqHz;
    uniform float uPulseAmpPx;

    float sdBox(vec2 p, vec2 b){ 
        vec2 q = abs(p) - b;
        return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0); 
    }

    float sdCircle(vec2 p, float r){ 
        return length(p) - r;
    }

    float occ(vec2 ij){
        vec2 p = clamp(ij, vec2(0.0), uMaskSize - 1.0);
        return texture2D(uMask, (p + 0.5) / uMaskSize).r;
    }

    int iabs(int v){ return v < 0 ? -v : v; }
    int imin(int a, int b){ return a < b ? a : b; }

    // Compute SDF for the entire shape
    float sdfShape(vec2 world){
        vec2 gw   = world / uGrid;
        vec2 cell = floor(gw);

        if (occ(cell) > 0.5) return -1.0; // inside

        float minDist = 1e9;
        float reach   = (uRadius + uGrid*0.5) / uGrid; // cells that can matter
        int   R       = int(ceil(reach));
        const int MAX_R = 6;                 // raise = thicker
        R = imin(R, MAX_R);

        vec2 box = vec2(uGrid*0.5 - uGrid*uPad) - uRadius;

        for (int y = -MAX_R; y <= MAX_R; y++){
            if (iabs(y) > R) continue;
            for (int x = -MAX_R; x <= MAX_R; x++){
            if (iabs(x) > R) continue;
            vec2 tc = cell + vec2(float(x), float(y));
            if (occ(tc) <= 0.5) continue;

            vec2 p = world - (tc + 0.5) * uGrid;
            float d = sdBox(p, box) - uRadius;  // rounded cell
            minDist = min(minDist, d);
            }
        }
        return minDist;
    }

    void main(){
        vec2 sp = outputFrame.xy + vTextureCoord * outputFrame.zw;
        float a = uM.x, b = uM.y, c = uM.z, d = uM.w; 
        vec2 s = sp - uT; 
        float det = a * d - b * c;
        vec2 world = vec2((d * s.x - c * s.y) / det, (-b * s.x + a * s.y) / det);
        
        float shapeSDF = sdfShape(world);
        
        #ifdef GL_OES_standard_derivatives
        #extension GL_OES_standard_derivatives : enable
        float w = fwidth(shapeSDF) + 1e-6;     // world units per pixel
        #else
        vec2 colX = vec2(d, -b) / det, colY = vec2(-c, a) / det;
        float w = max(1e-6, 0.5 * (length(colX) + length(colY)));
        #endif

        float pulse   = 0.2 + 0.8 * sin(6.2831853 * uPulseFreqHz * uTime);
        float t       = uStrokePx + uPulseAmpPx * pulse;

        float strokeAlpha = 0.0;
        if (shapeSDF > 0.0) {
            strokeAlpha = 1.0 - smoothstep(0.0, t, shapeSDF);
        }
        
        float A = uStrokeColor.a * strokeAlpha;
        gl_FragColor = vec4(uStrokeColor.rgb * A, A);
    }
`;

export class TileStrokeFilter extends PIXI.Filter {
    constructor() {
        super(undefined, strokeFS, {
            uM: new Float32Array([1, 1, 1, 1]),
            uT: new Float32Array([0, 0]),
            uMask: PIXI.Texture.EMPTY,
            uMaskSize: new Float32Array([1, 1]),
            uGrid: 100,
            uPad: 0.05,
            uRadius: 0.08,
            uStroke: 3.0, // Stroke width in world units
            uStrokeColor: new Float32Array([0.7, 0.9, 0.5, 1.0]),
            uStrokePx: 20,
            uTime: 0,
            uPulseFreqHz: 0.35,
            uPulseAmpPx: 6.0,
        });
    }

    setMask(tex: PIXI.Texture, cols: number, rows: number) {
        const bt = tex.baseTexture;
        bt.mipmap = PIXI.MIPMAP_MODES.OFF;
        bt.scaleMode = PIXI.SCALE_MODES.NEAREST;
        this.uniforms.uMask = tex;
        this.uniforms.uMaskSize[0] = cols;
        this.uniforms.uMaskSize[1] = rows;
    }

    apply(
        fm: PIXI.FilterSystem,
        input: PIXI.RenderTexture,
        output: PIXI.RenderTexture,
        clear: PIXI.CLEAR_MODES
    ) {
        const wt = canvas?.stage?.worldTransform;
        if (!wt) return;
        const u = this.uniforms;
        const gridSize = canvas.grid?.size ?? 100;
        u.uM[0] = wt.a;
        u.uM[1] = wt.b;
        u.uM[2] = wt.c;
        u.uM[3] = wt.d;
        u.uT[0] = wt.tx;
        u.uT[1] = wt.ty;
        u.uTime = performance.now() * 0.001;
        u.uGrid = gridSize;
        u.uStrokePx = gridSize * 0.3;
        u.uPulseAmpPx = gridSize * 0.1;
        super.apply(fm, input, output, clear);
    }
}
