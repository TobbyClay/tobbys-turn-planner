const fs = `
    precision highp float;
    varying vec2 vTextureCoord;
    uniform vec4 outputFrame, uM; uniform vec2 uT;
    uniform sampler2D uMask, uColorTex; uniform vec2 uMaskSize;
    uniform float uGrid, uPad, uRadius, uInset;
    uniform float uEdgeOnly;  // 0 = fill, 1 = only edge
    uniform float uEdgeWidth; // px width when uEdgeOnly=1

    float sdBox(vec2 p, vec2 b){ 
        vec2 q = abs(p)-b;
        return length(max(q,0.0))+min(max(q.x,q.y),0.0); 
    }

    float occ(vec2 ij){ 
        return texture2D(uMask,(ij+0.5)/uMaskSize).r; 
    }

    vec4 getCornerDiagonals(vec2 ij) {
        // Get the raw green channel value (0-255 range, normalized to 0-1)
        float encoded = texture2D(uMask, (ij+0.5)/uMaskSize).g;
        
        // Convert back to integer (0-255 range)
        float mask = floor(encoded * 255.0 + 0.5);
        
        return vec4(
            mod(mask, 2.0),                    // bit 0: top-left diagonal
            mod(floor(mask / 2.0), 2.0),       // bit 1: top-right diagonal
            mod(floor(mask / 4.0), 2.0),       // bit 2: bottom-left diagonal
            mod(floor(mask / 8.0), 2.0)        // bit 3: bottom-right diagonal
        );
    }

    float sdfCell(vec2 ij, vec2 uv){
        vec2 p = uv - 0.5; // p is in range [-0.5, 0.5], centered on cell
        vec4 corners = getCornerDiagonals(ij);
        
        // Create a rounded rectangle
        vec2 boxSize = vec2(0.5 - uPad);
        float baseSDF = sdBox(p, boxSize - uRadius) - uRadius;

        // Cut depth - how far into the rectangle the diagonal cut goes
        float cutDepth = 0.4; 
        
        if (corners.x > 0.5) { // Top-left corner - cut along line x + y = -cutDepth
            float diagonalLine = p.x + p.y + 1.0 - cutDepth;
            baseSDF = max(baseSDF, -diagonalLine);
        }
        
        if (corners.y > 0.5) { // Top-right corner - cut along line -x + y = -cutDepth
            float diagonalLine = -p.x + p.y + 1.0 - cutDepth;
            baseSDF = max(baseSDF, -diagonalLine);
        }
        
        if (corners.z > 0.5) { // Bottom-left corner - cut along line x - y = -cutDepth  
            float diagonalLine = p.x - p.y + 1.0 - cutDepth;
            baseSDF = max(baseSDF, -diagonalLine);
        }
        
        if (corners.w > 0.5) { // Bottom-right corner - cut along line -x - y = -cutDepth
            float diagonalLine = -p.x - p.y + 1.0 - cutDepth;
            baseSDF = max(baseSDF, -diagonalLine);
        }
        
        return baseSDF;
    }


    void main(){

        vec2 sp = outputFrame.xy+vTextureCoord*outputFrame.zw;
        float a = uM.x,b=uM.y,c=uM.z,d=uM.w; vec2 s=sp-uT; float det=a*d-b*c;
        vec2 world = vec2(( d*s.x-c*s.y)/det,(-b*s.x+a*s.y)/det);
        vec2 gw = world/uGrid, cell=floor(gw), uv=fract(gw);

        if (occ(cell)<0.5) discard;

        float dWorld = sdfCell(cell, uv) * uGrid;

        #ifdef GL_OES_standard_derivatives
        #extension GL_OES_standard_derivatives : enable
        float w = fwidth(dWorld)+1e-6;
        #else
        vec2 colX=vec2(d,-b)/det, colY=vec2(-c,a)/det;
        float w=max(1e-6,0.5*(length(colX)+length(colY)));
        #endif

        float aFill = 1.0 - smoothstep(-uInset - w, -uInset + w, dWorld);

        vec4 fillCol = texture2D(uColorTex, (cell + 0.5) / uMaskSize);
        float Af     = fillCol.a * aFill;
        vec3  rgb    = fillCol.rgb;

        gl_FragColor = vec4(rgb * Af, Af); // PMA
    }
`;

export class TileRegionFilter extends PIXI.Filter {
    constructor() {
        super(undefined, fs, {
            uM: new Float32Array([1, 1, 1, 1]),
            uT: new Float32Array([0, 0]),
            uMask: PIXI.Texture.EMPTY,
            uColorTex: PIXI.Texture.EMPTY,
            uMaskSize: new Float32Array([1, 1]),
            uGrid: 100,
            uPad: 0.05,
            uRadius: 0.08,
            uInset: 1.0,
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
    setColorTex(tex: PIXI.Texture) {
        const bt = tex.baseTexture;
        bt.mipmap = PIXI.MIPMAP_MODES.OFF;
        bt.scaleMode = PIXI.SCALE_MODES.NEAREST;
        this.uniforms.uColorTex = tex;
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
        u.uM[0] = wt.a;
        u.uM[1] = wt.b;
        u.uM[2] = wt.c;
        u.uM[3] = wt.d;
        u.uT[0] = wt.tx;
        u.uT[1] = wt.ty;
        u.uTime = performance.now() * 0.001;
        super.apply(fm, input, output, clear);
    }
}
