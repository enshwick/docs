import { StarLight } from '../site/star-light.ts';

/** One star as the canvas draws it, read from its SVG circle. */
interface CanvasStar {
  readonly x: number;
  readonly y: number;
  readonly radius: number;
  readonly opacity: number;
  readonly light: StarLight;
}

/**
 * The stars drawn on one canvas instead of animating every SVG circle: animated SVG repaints the
 * whole star field on the main thread each frame. The canvas reads the stars from the SVG that sits
 * beside it (the fallback without JS), hides the SVG, and draws at most 30 frames a second, none
 * while the tab is hidden. Time is the wall clock, so a star keeps its phase from page to page. With
 * reduced motion it does nothing and the SVG stays, still.
 */
export class StarCanvas {
  private static readonly frameGap = 1000 / 30;
  private static readonly reducedMotion = '(prefers-reduced-motion: reduce)';

  private readonly context: CanvasRenderingContext2D;
  private readonly stars: readonly CanvasStar[];
  private readonly box: { readonly width: number; readonly height: number };
  private readonly colour: string;
  private last = 0;

  private constructor(
    private readonly canvas: HTMLCanvasElement,
    svg: SVGSVGElement,
    context: CanvasRenderingContext2D,
  ) {
    this.context = context;
    const view = svg.viewBox.baseVal;
    this.box = { width: view.width, height: view.height };
    this.stars = [...svg.querySelectorAll('circle')].map((circle) => StarCanvas.read(circle));
    this.colour = getComputedStyle(svg.querySelector('circle') ?? svg).fill || '#e9e1d3';
  }

  /** Starts a canvas for every star field on the page. */
  public static startAll(): void {
    if (window.matchMedia(StarCanvas.reducedMotion).matches) {
      return;
    }
    for (const canvas of document.querySelectorAll<HTMLCanvasElement>('[data-star-canvas]')) {
      const svg = canvas.previousElementSibling;
      const context = canvas.getContext('2d');
      if (!(svg instanceof SVGSVGElement) || context === null) {
        continue;
      }
      new StarCanvas(canvas, svg, context).start(svg);
    }
  }

  private static read(circle: SVGCircleElement): CanvasStar {
    const style = circle.style;
    const seconds = (name: string): number =>
      Math.abs(Number(style.getPropertyValue(name).replace('s', '')) || 0);
    const mark = /ew-star--f([123])/u.exec(circle.getAttribute('class') ?? '')?.[1];
    const pattern = mark === '1' ? 1 : mark === '2' ? 2 : mark === '3' ? 3 : undefined;
    return {
      x: circle.cx.baseVal.value,
      y: circle.cy.baseVal.value,
      radius: circle.r.baseVal.value,
      opacity: Number(circle.getAttribute('opacity') ?? '1'),
      light: new StarLight(
        seconds('--b') || 10,
        seconds('--bd'),
        pattern === undefined
          ? undefined
          : {
              pattern,
              period: seconds('--t') || 2,
              delay: seconds('--td'),
            },
      ),
    };
  }

  private start(svg: SVGSVGElement): void {
    this.resize();
    new ResizeObserver(() => {
      this.resize();
    }).observe(this.canvas.parentElement ?? this.canvas);
    this.canvas.hidden = false;
    svg.style.display = 'none';
    const frame = (now: number): void => {
      if (now - this.last >= StarCanvas.frameGap) {
        this.last = now;
        this.draw(Date.now() / 1000);
      }
      requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  }

  private resize(): void {
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    const { clientWidth, clientHeight } = this.canvas;
    this.canvas.width = Math.round(clientWidth * ratio);
    this.canvas.height = Math.round(clientHeight * ratio);
    this.draw(Date.now() / 1000);
  }

  /** Draws every star, the field fitted as `xMidYMid slice` fits the SVG. */
  private draw(seconds: number): void {
    const { width, height } = this.canvas;
    const scale = Math.max(width / this.box.width, height / this.box.height);
    const left = (width - this.box.width * scale) / 2;
    const top = (height - this.box.height * scale) / 2;
    const context = this.context;
    context.clearRect(0, 0, width, height);
    context.fillStyle = this.colour;
    for (const star of this.stars) {
      context.globalAlpha = star.opacity * star.light.at(seconds);
      context.beginPath();
      context.arc(
        left + star.x * scale,
        top + star.y * scale,
        Math.max(star.radius * scale, 0.6),
        0,
        Math.PI * 2,
      );
      context.fill();
    }
  }
}
