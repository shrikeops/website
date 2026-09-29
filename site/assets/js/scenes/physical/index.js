// The Physical page's scene: the home page's region, visited at three
// places (the airport, the power station, a substation), each with its own
// noise, its own threat and microphones facing outward. Tracks draw the
// microphones, the sound, the paths at the substation, the radar of the
// opening, the soundprint inset and the method cards.

import { storyScene } from '../base.js';
import { buildRegion, everydayLifeTrack, regionView } from '../region/index.js';
import { buildTag, legendTrack, perchTrack, platesTrack, showSprite, spriteScale } from '../furniture.js';
import { project } from '../../iso.js';
import { ease, lerp, seg, window01 } from '../../timeline.js';
import { buildPlaces } from './places.js';
import { listeningTrack } from './listening.js';
import { soundTrack } from './sound.js';
import { pathsTrack } from './paths.js';
import { radarTrack } from './radar.js';
import { soundprintTrack } from './soundprint.js';
import { drawShape } from './shapes.js';

export function createPhysicalScene(stage, beatIds) {
  return storyScene(stage, beatIds, 'physical', ({ svg, at }) => {
    const world = buildRegion(svg);
    const places = buildPlaces(world);
    fillShapes(stage);
    return {
      paletteKeys: [[at('title'), 'day']],
      cameraKeys: buildCameraKeys(at, world, places),
      tracks: [
        everydayLifeTrack(world),
        radarTrack(world, at),
        listeningTrack(world, places, at),
        soundTrack(world, places, at),
        pathsTrack(world, places, at),
        placeTagsTrack(world, places, at),
        soundprintTrack(stage, at),
        platesTrack(stage, at, PLATE_MOTION),
        legendTrack(stage, at, { from: at('three-places'), to: at('change-housing', 1), fade: 0.15 }),
        perchTrack(stage, [
          { leave: [at('title', 0.45), at('title', 0.95)] },
          { arrive: [at('targets', 0.15), at('targets', 0.6)] },
        ]),
      ],
    };
  });
}

function buildCameraKeys(at, world, places) {
  const on = (x, y, z, w, h, minCrop = 0.75) => { const [cx, cy] = project(x, y, z); return { cx, cy, w, h, minCrop }; };
  const [ax, ay] = places.airport.poles[0].at;
  const { sub } = places.substation;
  const [gx, gy] = places.plant.tagAt;
  const region = regionView(world);
  const hero = on(ax + 90, ay - 20, 0, 560, 340);
  const radar = on(ax + 20, ay - 70, 10, 460, 290);
  const airfield = on(ax + 190, ay - 10, 0, 620, 370);
  const airport = on(ax + 110, ay - 10, 0, 680, 400);
  const plant = on(gx + 130, gy - 60, 40, 560, 340);
  const substation = on(sub.x - 60, sub.y - 90, 0, 420, 280);
  const approaches = on(sub.x - 90, sub.y - 110, 0, 580, 370);
  return [
    [at('title'), hero], [at('title', 0.5), hero],
    [at('radar', 0.3), radar], [at('radar', 0.9), radar],
    [at('microphone', 0.3), airfield], [at('gatwick', 1), airfield],
    [at('three-places', 0.3), region], [at('three-places', 0.9), region],
    [at('airport', 0.25), airport], [at('airport', 0.9), airport],
    [at('power-station', 0.25), plant], [at('power-station', 0.9), plant],
    [at('substation', 0.25), substation], [at('why-hard', 0.9), substation],
    [at('model', 0.3), approaches], [at('model', 0.9), approaches],
    [at('housing-per-mission', 0.3), region], [at('jet-shahed', 1), region],
    [at('change-housing', 0.25), plant], [at('print-measure', 1), plant],
    [at('where-we-are', 0.4), hero],
  ];
}

// The three places' names, over the whole-region views.
function placeTagsTrack(world, places, at) {
  const tags = Object.values(places).map((place) => ({ node: buildTag(world.layers.tags, place.label, 'place-tag'), at: project(...place.tagAt) }));
  return {
    render(f) {
      const shown = Math.max(window01(f.t, at('three-places', 0.2), at('three-places', 1), 0.1), window01(f.t, at('housing-per-mission'), at('housing-per-mission', 1), 0.1));
      const s = spriteScale(f, 1.3);
      tags.forEach((tag, k) => {
        const v = shown * seg(f.t, at('three-places', 0.2 + k * 0.1), at('three-places', 0.3 + k * 0.1));
        showSprite(tag.node, v, [tag.at[0], tag.at[1] + 22 * s], s);
      });
    },
  };
}


// Method cards take their housing silhouettes from shapes.js, so every
// housing on the page is drawn from one table.
function fillShapes(stage) {
  for (const slot of stage.querySelectorAll('[data-shape]')) drawShape(slot, slot.dataset.shape);
}

const PLATE_MOTION = {
  'wavefronts'(plate, p) {
    for (const front of plate.querySelectorAll('.wavefront')) {
      const [dx, dy] = front.dataset.from.split(' ').map(Number);
      const k = 1 - ease(seg(p, 0, 0.6));
      front.setAttribute('transform', `translate(${(dx * k).toFixed(1)} ${(dy * k).toFixed(1)})`);
    }
    for (const bar of plate.querySelectorAll('.meter-bar')) {
      const height = +bar.dataset.level * ease(seg(p, 0.45, 0.95));
      bar.setAttribute('y', (+bar.dataset.base - height).toFixed(1));
      bar.setAttribute('height', height.toFixed(1));
    }
  },
  'scores'(plate, p) {
    plate.querySelectorAll('.score-bar').forEach((bar, i) => {
      bar.setAttribute('width', (+bar.dataset.score * ease(seg(p, i * 0.12, i * 0.12 + 0.35))).toFixed(1));
    });
    plate.querySelector('.best').classList.toggle('is-on', p > 0.85);
  },
  'print-and-measure'(plate, p) {
    const printed = ease(seg(p, 0, 0.55));
    const reveal = plate.querySelector('.print-reveal');
    const top = lerp(+reveal.dataset.bottom, +reveal.dataset.top, printed);
    reveal.setAttribute('y', top.toFixed(1));
    reveal.setAttribute('height', (+reveal.dataset.bottom - top).toFixed(1));
    const head = plate.querySelector('.plate-print-head');
    head.setAttribute('transform', `translate(0 ${(top - +reveal.dataset.bottom).toFixed(1)})`);
    head.style.opacity = printed > 0 && printed < 1 ? '1' : '0';
    plate.querySelector('.measured').style.strokeDashoffset = (1 - ease(seg(p, 0.45, 0.9))).toFixed(3);
    plate.querySelector('.loop-back').style.opacity = seg(p, 0.85, 1).toFixed(3);
  },
};
