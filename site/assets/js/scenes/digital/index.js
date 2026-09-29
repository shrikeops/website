// The Digital page's scene: the home page's region, seen from town A's town
// hall. Every public building shows the systems it exposes as a panel; the
// tracks draw the attackers' sweep and Meerkat Watch's work on the town
// hall's systems, over the region's everyday traffic and power.

import { storyScene } from '../base.js';
import { buildRegion, everydayLifeTrack, regionView } from '../region/index.js';
import { buildReadout, legendTrack, platesTrack } from '../furniture.js';
import { seg } from '../../timeline.js';
import { panelsTrack } from './panels.js';
import { hub, systemsTrack } from './systems.js';
import { noiseTrack } from './noise.js';
import { replayTrack } from './replay.js';
import { costsTrack } from './costs.js';

const WEEKS = 26;

export function createDigitalScene(stage, beatIds) {
  return storyScene(stage, beatIds, 'digital', ({ svg, at }) => {
    const world = buildRegion(svg);
    return {
      paletteKeys: [[at('title'), 'day']],
      cameraKeys: buildCameraKeys(at, world),
      tracks: [
        everydayLifeTrack(world),
        panelsTrack(world, at),
        costsTrack(world, at),
        systemsTrack(world, at),
        noiseTrack(world, at),
        replayTrack(world, at),
        platesTrack(stage, at, PLATE_MOTION),
        legendTrack(stage, at, { from: at('title', 0.5), fade: 0.3 }),
        hudTrack(stage, at),
      ],
    };
  });
}

function buildCameraKeys(at, world) {
  const [hx, hy] = hub(world);
  const town = { cx: hx - 10, cy: hy + 20, w: 640, h: 400, minCrop: 0.75 };
  const hall = { cx: hx + 40, cy: hy - 30, w: 330, h: 210, minCrop: 0.8 };
  const townWide = { cx: 0, cy: 10, w: 900, h: 560, minCrop: 0.8 };
  const region = regionView(world);
  const systems = { cx: hx + 4, cy: hy - 64, w: 420, h: 290, minCrop: 0.8 };
  const watching = { cx: hx + 4, cy: hy - 50, w: 560, h: 360, minCrop: 0.8 };
  return [
    [at('title'), town], [at('title', 0.55), town],
    [at('cheap-flaws', 0.25), hall], [at('ai-at-scale', 1), hall],
    [at('compounds', 0.18), townWide], [at('compounds', 0.36), townWide], [at('compounds', 0.62), region], [at('hamilton', 1), region],
    [at('beyond-the-website', 0.3), systems], [at('keep-watching', 1), systems],
    [at('no-certificate', 0.6), watching],
    [at('who', 0.35), region],
  ];
}

function hudTrack(stage, at) {
  const readout = buildReadout(stage.querySelector('.readout'));
  return {
    render(f) {
      const weeks = seg(f.t, at('keep-watching', 0.04), at('keep-watching', 0.96));
      readout.show(f.t >= at('keep-watching') && f.t < at('no-certificate', 0.2) ? { label: 'Keep watching', value: `Week ${1 + Math.min(WEEKS - 1, Math.floor(weeks * WEEKS))}` } : null);
    },
  };
}

// Evidence cards whose drawing moves with the reader.
const PLATE_MOTION = {
  'prompts'(plate, p) {
    plate.querySelectorAll('.prompt-line').forEach((line, i, all) => { line.style.opacity = i < p * all.length ? '1' : '0'; });
  },
  'network-down'(plate, p) {
    plate.querySelectorAll('.net-node, .net-link').forEach((node) => { node.classList.toggle('is-down', +node.dataset.down <= p); });
  },
};
