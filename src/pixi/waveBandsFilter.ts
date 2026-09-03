const waveFS = `
precision highp float;
varying vec2 vTextureCoord;
uniform sampler2D uSampler;          // input from previous pass
uniform vec4  outputFrame, uM; 
uniform vec2  uT;
uniform float uTime;
uniform float uGrid;
uniform vec2  uWaveDir;              // in grid-cell space
uniform float uWaveFreq;             // bands per cell
uniform float uWaveSpeed;            // cells per second
uniform float uAmp;                  // 0..1 modulation
uniform float uAffectsAlpha;         // 0=rgb only, 1=rgb+alpha

void main(){
  // sample previous pass
  vec4 col = texture2D(uSampler, vTextureCoord);

  // un-premultiply
  vec3 src = (col.a > 0.0) ? col.rgb / col.a : col.rgb;

  // screen->world mapping (same as your other filters)
  vec2 sp = outputFrame.xy + vTextureCoord * outputFrame.zw;
  float a=uM.x,b=uM.y,c=uM.z,d=uM.w;
  vec2 s = sp - uT; float det = a*d - b*c;
  vec2 world = vec2((d*s.x - c*s.y)/det, (-b*s.x + a*s.y)/det);

  // world -> grid coords
  vec2 gw = world / uGrid;
  vec2 dir = normalize(uWaveDir);
  float coord = dot(gw, dir);

  // animated wave
  float phase = 6.2831853 * (coord * uWaveFreq - uTime * uWaveSpeed);
  float wave  = 1.0 + uAmp * sin(phase);

  // apply
  float aOut = col.a * mix(1.0, wave, clamp(uAffectsAlpha, 0.0, 1.0));
  vec3  rgb  = src * wave;

  // re-premultiply
  gl_FragColor = vec4(rgb * aOut, aOut);
}
`;

export class WaveBandsFilter extends PIXI.Filter {
    constructor() {
        super(undefined, waveFS, {
            uM: new Float32Array([1, 1, 1, 1]),
            uT: new Float32Array([0, 0]),
            uTime: 0,
            uGrid: 100,
            uWaveDir: new Float32Array([1, 1]),
            uWaveFreq: 0.2,
            uWaveSpeed: 0.4,
            uAmp: 0.1,
            uAffectsAlpha: 0.0, // tubes usually rgb-only
        });
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
        u.uGrid = canvas.grid?.size ?? 100;
        super.apply(fm, input, output, clear);
    }
}
