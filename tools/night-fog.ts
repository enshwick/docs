// Renders the night's fog and haze to images once, so no browser has to draw
// the noise filters on every page load. The images are committed under
// src/assets/night/; run `bun tools/night-fog.ts` after changing a layer here.
import sharp from 'sharp';

/** The colour the fog is drawn in: `--color-fog` in tokens.css. */
const FOG = '#cccaeb';

/** One layer: its file name and the SVG body drawn in a 2000 x 1000 box. */
interface Layer {
  readonly name: string;
  readonly body: string;
}

const wisp = (
  id: string,
  frequency: string,
  octaves: number,
  seed: number,
  matrix: string,
  blur: number,
): string =>
  `<filter id="${id}" x="0" y="0" width="100%" height="100%">
    <feTurbulence type="fractalNoise" baseFrequency="${frequency}" numOctaves="${octaves}" seed="${seed}"/>
    <feColorMatrix type="matrix" values="${matrix}"/>
    <feGaussianBlur stdDeviation="${blur}"/>
  </filter>`;

const band = (id: string, stops: ReadonlyArray<readonly [number, number]>): string => {
  const marks = stops
    .map(([at, alpha]) => `<stop offset="${at}" stop-color="#fff" stop-opacity="${alpha}"/>`)
    .join('');

  return `<linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1">${marks}</linearGradient>`;
};

const FRONT_MATRIX = '0 0 0 0 0.80  0 0 0 0 0.79  0 0 0 0 0.92  0 0 0 1.9 -0.95';

const LAYERS: readonly Layer[] = [
  {
    name: 'fog-back',
    body: `<defs>
      ${wisp('w', '0.0016 0.006', 4, 23, '0 0 0 0 0.62  0 0 0 0 0.60  0 0 0 0 0.86  0 0 0 2.1 -1.05', 10)}
      ${band('b', [
        [0, 0],
        [0.44, 0],
        [0.66, 0.8],
        [0.86, 0.3],
        [1, 0.9],
      ])}
      <mask id="m"><rect width="2000" height="1000" fill="url(#b)"/></mask>
    </defs>
    <rect width="2000" height="1000" fill="${FOG}" filter="url(#w)" mask="url(#m)"/>`,
  },
  {
    name: 'haze',
    body: `<defs>
      <filter id="s" x="0" y="0" width="100%" height="100%">
        <feTurbulence type="fractalNoise" baseFrequency="0.0035 0.008" numOctaves="4" seed="41" result="n"/>
        <feTurbulence type="turbulence" baseFrequency="0.006 0.012" numOctaves="2" seed="5" result="curl"/>
        <feDisplacementMap in="n" in2="curl" scale="140" xChannelSelector="R" yChannelSelector="G" result="d"/>
        <feColorMatrix in="d" type="matrix" values="0 0 0 0 0.78  0 0 0 0 0.76  0 0 0 0 0.90  0 0 0 3.2 -1.75"/>
        <feGaussianBlur stdDeviation="3"/>
      </filter>
      <radialGradient id="l" cx="30%" cy="62%" r="30%"><stop offset="0" stop-color="#fff" stop-opacity=".9"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>
      <radialGradient id="r" cx="78%" cy="70%" r="26%"><stop offset="0" stop-color="#fff" stop-opacity=".8"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>
      <radialGradient id="t" cx="55%" cy="22%" r="20%"><stop offset="0" stop-color="#fff" stop-opacity=".35"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>
      <mask id="m">
        <rect width="2000" height="1000" fill="url(#l)"/>
        <rect width="2000" height="1000" fill="url(#r)"/>
        <rect width="2000" height="1000" fill="url(#t)"/>
      </mask>
    </defs>
    <rect width="2000" height="1000" fill="${FOG}" filter="url(#s)" mask="url(#m)"/>`,
  },
  {
    name: 'fog-front',
    body: `<defs>
      ${wisp('w', '0.0022 0.009', 5, 7, FRONT_MATRIX, 6)}
      ${band('b', [
        [0, 0],
        [0.55, 0],
        [0.8, 0.9],
        [1, 0.7],
      ])}
      <mask id="m"><rect width="2000" height="1000" fill="url(#b)"/></mask>
    </defs>
    <rect width="2000" height="1000" fill="${FOG}" filter="url(#w)" mask="url(#m)"/>`,
  },
];

/** The rendered size: the fog is soft, so half the drawing box is plenty once stretched. */
const WIDTH = 1200;
const HEIGHT = 600;

await Promise.all(
  LAYERS.map(async (layer) => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 2000 1000" preserveAspectRatio="none">${layer.body}</svg>`;
    const out = new URL(`../src/assets/night/${layer.name}.webp`, import.meta.url);

    await sharp(Buffer.from(svg), { density: 72 })
      .webp({ quality: 82, alphaQuality: 90, effort: 6 })
      .toFile(out.pathname);
    process.stdout.write(`${layer.name}.webp\n`);
  }),
);
