import { FogClock } from '../site/fog-clock.ts';
import { FogGate, FogMode } from '../site/fog-gate.ts';

/**
 * The hero's fog as a WebGL shader: 3D noise moving through time, so clouds form, swell and break
 * up, a domain warp for the curl and soft light from the noise's slope. It draws at half the
 * canvas's size and at most 30 frames a second, and asks for no frames while the tab is hidden or
 * the hero is off screen. Without WebGL, or with reduced motion, it does nothing and the drawn SVG
 * fog stays.
 */
export class NightFog {
  private static readonly canvasSelector = '[data-fog-canvas]';
  private static readonly fogAttribute = 'fog';
  private static readonly fogDataAttribute = 'data-fog';
  private static readonly reducedMotion = '(prefers-reduced-motion: reduce)';
  private static readonly resolution = 0.5;

  private static readonly vertex = `#version 300 es
in vec2 corner;
void main() { gl_Position = vec4(corner, 0.0, 1.0); }`;

  private static readonly fragment = `#version 300 es
precision highp float;
uniform vec2 size;
uniform float time;
out vec4 color;

float hash(vec3 p) {
  p = fract(p * 0.3183099 + 0.1);
  p *= 17.0;
  return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
}

float noise(vec3 p) {
  vec3 i = floor(p);
  vec3 f = fract(p);
  vec3 u = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);
  return mix(
    mix(mix(hash(i), hash(i + vec3(1, 0, 0)), u.x),
        mix(hash(i + vec3(0, 1, 0)), hash(i + vec3(1, 1, 0)), u.x), u.y),
    mix(mix(hash(i + vec3(0, 0, 1)), hash(i + vec3(1, 0, 1)), u.x),
        mix(hash(i + vec3(0, 1, 1)), hash(i + vec3(1, 1, 1)), u.x), u.y),
    u.z);
}

float fbm(vec3 p) {
  float sum = 0.0;
  float amplitude = 0.5;
  for (int octave = 0; octave < 5; octave++) {
    sum += amplitude * noise(p);
    p = p * 2.03 + vec3(1.7, 9.2, 3.1);
    amplitude *= 0.5;
  }
  return sum;
}

float cloud(vec2 at, float t) {
  vec3 p = vec3(at.x * 1.6, at.y * 5.0, t);
  vec2 warp = vec2(fbm(p + vec3(0.0, 0.0, 0.0)), fbm(p + vec3(5.2, 1.3, 2.8)));
  return fbm(p + vec3(1.8 * warp, 0.0) + vec3(t * 0.6, 0.0, 0.0));
}

float puff(vec2 at, vec2 centre, vec2 radius) {
  vec2 d = (at - centre) / radius;
  return exp(-dot(d, d) * 2.2);
}

void main() {
  vec2 uv = gl_FragCoord.xy / size;
  float aspect = size.x / size.y;
  float fromTop = 1.0 - uv.y;
  vec2 at = vec2(uv.x * aspect, fromTop);
  float t = time * 0.018;

  float valleys = smoothstep(0.5, 0.82, fromTop) * (1.0 - 0.35 * smoothstep(0.9, 1.0, fromTop));
  float haze = max(max(puff(uv, vec2(0.30, 0.38), vec2(0.34, 0.16)),
                       puff(uv, vec2(0.78, 0.30), vec2(0.28, 0.14))),
                   0.35 * puff(uv, vec2(0.55, 0.78), vec2(0.22, 0.10)));
  float mask = max(valleys, haze * 0.85);

  float n = cloud(at, t);
  float density = smoothstep(0.42, 0.78, n) * mask;

  float e = 0.012;
  float slope = cloud(at + vec2(e, -e), t) - n;
  float light = clamp(0.62 + slope * 9.0, 0.35, 1.0);

  vec3 shade = vec3(0.62, 0.60, 0.86);
  vec3 lit = vec3(0.84, 0.83, 0.94);
  float alpha = density * 0.55;
  color = vec4(mix(shade, lit, light) * alpha, alpha);
}`;

  private readonly clock = new FogClock();
  private readonly program: WebGLProgram;
  private readonly sizeAt: WebGLUniformLocation | null;
  private readonly timeAt: WebGLUniformLocation | null;
  private frame: number | undefined;
  private pageVisible = document.visibilityState === 'visible';
  private onScreen = true;

  private constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly gl: WebGL2RenderingContext,
    program: WebGLProgram,
    private readonly gate: FogGate,
  ) {
    this.program = program;
    this.sizeAt = gl.getUniformLocation(program, 'size');
    this.timeAt = gl.getUniformLocation(program, 'time');
  }

  /** Starts the shader in the hero where the browser and the reader allow it. */
  public static start(): void {
    const canvas = document.querySelector<HTMLCanvasElement>(NightFog.canvasSelector);
    const night = canvas?.parentElement;

    if (canvas === null || night === null || night === undefined) {
      return;
    }

    const gl = canvas.getContext('webgl2', { premultipliedAlpha: true, antialias: false });
    const reducedMotion = window.matchMedia(NightFog.reducedMotion).matches;

    const gate = new FogGate({ webgl: gl !== null, reducedMotion });

    if (gate.mode !== FogMode.Shader || gl === null) {
      return;
    }

    const program = NightFog.link(gl);

    if (program === undefined) {
      return;
    }

    const fog = new NightFog(canvas, gl, program, gate);

    canvas.hidden = false;
    night.dataset[NightFog.fogAttribute] = FogMode.Shader;
    fog.watch(night);
  }

  private static link(gl: WebGL2RenderingContext): WebGLProgram | undefined {
    const program = gl.createProgram();
    const shaders = [
      NightFog.compile(gl, gl.VERTEX_SHADER, NightFog.vertex),
      NightFog.compile(gl, gl.FRAGMENT_SHADER, NightFog.fragment),
    ];

    for (const shader of shaders) {
      if (shader === undefined) {
        return undefined;
      }

      gl.attachShader(program, shader);
    }

    gl.linkProgram(program);

    if (gl.getProgramParameter(program, gl.LINK_STATUS) !== true) {
      return undefined;
    }

    const corners = gl.createBuffer();

    gl.bindBuffer(gl.ARRAY_BUFFER, corners);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);

    const corner = gl.getAttribLocation(program, 'corner');

    gl.enableVertexAttribArray(corner);
    gl.vertexAttribPointer(corner, 2, gl.FLOAT, false, 0, 0);

    return program;
  }

  private static compile(
    gl: WebGL2RenderingContext,
    kind: GLenum,
    source: string,
  ): WebGLShader | undefined {
    const shader = gl.createShader(kind);

    if (shader === null) {
      return undefined;
    }

    gl.shaderSource(shader, source);
    gl.compileShader(shader);

    return gl.getShaderParameter(shader, gl.COMPILE_STATUS) === true ? shader : undefined;
  }

  private watch(night: HTMLElement): void {
    new IntersectionObserver(([entry]) => {
      this.onScreen = entry?.isIntersecting ?? false;
      this.update();
    }).observe(night);

    document.addEventListener('visibilitychange', () => {
      this.pageVisible = document.visibilityState === 'visible';
      this.update();
    });

    this.canvas.addEventListener('webglcontextlost', () => {
      this.stop();
      night.removeAttribute(NightFog.fogDataAttribute);
      this.canvas.hidden = true;
    });

    this.update();
  }

  /** Asks for frames while the hero can be seen, and for none while it cannot. */
  private update(): void {
    const runs = this.gate.runs({ pageVisible: this.pageVisible, onScreen: this.onScreen });

    if (runs && this.frame === undefined) {
      this.clock.resume(performance.now());
      this.frame = requestAnimationFrame((now) => {
        this.draw(now);
      });
    } else if (!runs) {
      this.stop();
    }
  }

  private stop(): void {
    if (this.frame !== undefined) {
      cancelAnimationFrame(this.frame);
      this.frame = undefined;
      this.clock.pause(performance.now());
    }
  }

  private draw(now: number): void {
    if (this.clock.due(now)) {
      this.resize();
      this.gl.useProgram(this.program);
      this.gl.uniform2f(this.sizeAt, this.canvas.width, this.canvas.height);
      this.gl.uniform1f(this.timeAt, this.clock.elapsed(now) / 1000);
      this.gl.drawArrays(this.gl.TRIANGLES, 0, 3);
    }

    this.frame = requestAnimationFrame((next) => {
      this.draw(next);
    });
  }

  private resize(): void {
    const width = Math.max(1, Math.round(this.canvas.clientWidth * NightFog.resolution));
    const height = Math.max(1, Math.round(this.canvas.clientHeight * NightFog.resolution));

    if (this.canvas.width !== width || this.canvas.height !== height) {
      this.canvas.width = width;
      this.canvas.height = height;
      this.gl.viewport(0, 0, width, height);
    }
  }
}
