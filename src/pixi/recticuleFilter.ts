const fs = `
    precision highp float;

    varying vec2 vTextureCoord;
    uniform vec4 outputFrame;
    uniform vec4 uM;  // (a,b,c,d) from stage.worldTransform
    uniform vec2 uT;  // (tx,ty)

    uniform int   uCount;
    uniform vec4  uColor;
    uniform float uOuter, uInner, uStroke;
    uniform bool  uDrawConnectors;
    uniform vec2  uCenters[128];

    float sdRing(vec2 p, vec2 c, float r, float w){
        return abs(length(p - c) - r) - 0.5*w;
    }

    float sdSegment(vec2 p, vec2 a, vec2 b, float w){
        vec2 pa=p-a, ba=b-a;
        float h=clamp(dot(pa,ba)/dot(ba,ba),0.0,1.0);
        return length(pa - ba*h) - 0.5*w;
    }

    float distAt(vec2 wp){
        float dmin = 1e9;
        for (int i=0;i<128;i++){
            if (i>=uCount) break;
            vec2 c0 = uCenters[i];
            dmin = min(dmin, sdRing(wp, c0, uOuter, uStroke));
            dmin = min(dmin, sdRing(wp, c0, uInner, uStroke));
            if (uDrawConnectors && i<uCount-1){
            vec2 v = uCenters[i+1] - c0;
            float L = length(v);
            if (L > (2.0*uOuter + 0.5*uStroke)) {
                vec2 dir = v / L;
                vec2 a0 = c0 + dir * uOuter;
                vec2 b0 = uCenters[i+1] - dir * uOuter;
                dmin = min(dmin, sdSegment(wp, a0, b0, uStroke));
            }
            }
        }
        return dmin;
    }

    void main(){
        vec2 screenPx = outputFrame.xy + vTextureCoord * outputFrame.zw;

        float a=uM.x,b=uM.y,c=uM.z,d=uM.w;
        vec2  s = screenPx - uT;
        float det = a*d - b*c;                  // NOTE: no abs()
        vec2 worldPos = vec2(( d*s.x - c*s.y)/det, (-b*s.x + a*s.y)/det);

        // distance in world units
        float d0 = distAt(worldPos);

        // columns of inverse(screen->world) = ∂world/∂screen
        vec2 dx = vec2(d, -b) / det;            // 1px in X (world)
        vec2 dy = vec2(-c,  a) / det;           // 1px in Y (world)

        // --- AA width in screen pixels ---
        // Prefer derivatives if available (still GLSL ES 1.0)
        #ifdef GL_OES_standard_derivatives
        #extension GL_OES_standard_derivatives : enable
        float w = fwidth(d0);
        #else
        // Finite-difference fallback (4 extra distAt calls)
        float ddx = 0.5*(distAt(worldPos + dx) - distAt(worldPos - dx));
        float ddy = 0.5*(distAt(worldPos + dy) - distAt(worldPos - dy));
        float w = length(vec2(ddx, ddy)) + 1e-6;
        #endif

        float alpha = 1.0 - smoothstep(0.0, w, d0);
        if (alpha <= 0.0) discard;

        // Premultiplied alpha (Pixi expects PMA in filters)
        float A = uColor.a * alpha;
        gl_FragColor = vec4(uColor.rgb * A, A);
    }
`;

export class ReticuleFilter extends PIXI.Filter {
    constructor() {
        super(undefined, fs, {
            uCount: 0,
            uColor: new Float32Array([1, 1, 1, 1]),
            uOuter: 12,
            uInner: 3,
            uStroke: 2,
            uDrawConnectors: true,
            uCenters: new Float32Array(128 * 2),
            uM: new Float32Array([1, 1, 1, 1]),
            uT: new Float32Array([1, 1]),
        });
    }

    apply(
        fm: PIXI.FilterSystem,
        input: PIXI.RenderTexture,
        output: PIXI.RenderTexture,
        clear: PIXI.CLEAR_MODES
    ) {
        const u = this.uniforms;

        const wt = canvas?.stage?.worldTransform;
        if (!wt) return;

        u.uM[0] = wt.a;
        u.uM[1] = wt.b;
        u.uM[2] = wt.c;
        u.uM[3] = wt.d;
        u.uT[0] = wt.tx;
        u.uT[1] = wt.ty;

        super.apply(fm, input, output, clear);
    }
}
