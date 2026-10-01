// The About page's scene: the world map, Greg's path across it, cartoon
// Greg changing outfit with each chapter, and the shrike at the end.

import { storyScene } from '../base.js';
import { perchTrack } from '../furniture.js';
import { seg } from '../../timeline.js';
import { buildWorldMap, place } from './worldmap.js';
import { journeyTrack, PLACES } from './journey.js';
import { mountGreg } from './greg.js';

const OUTFITS = [
  ['title', 'shrikeops'], ['army', 'army'], ['afghanistan', 'afghanistan'], ['degree', 'graduation'],
  ['amnesty', 'amnesty'], ['shopify', 'hoodie'], ['citizenships', 'shrikeops'],
];

export function createAboutScene(stage, beatIds) {
  return storyScene(stage, beatIds, 'about', ({ svg, at }) => {
    const map = buildWorldMap(svg);
    return {
      paletteKeys: [[at('title'), 'day']],
      cameraKeys: buildCameraKeys(at, map),
      tracks: [regionTrack(map), journeyTrack(map, at), gregTrack(stage, at), perchTrack(stage, [{ arrive: [at('shrike', 0.15), at('shrike', 0.55)] }])],
    };
  });
}

// The coarse world data is fine from afar; close to Belleville, the 1:10m
// Lake Ontario region takes over.
function regionTrack(map) {
  return {
    render(f) {
      map.layers.region.style.opacity = (1 - seg(f.view.w, 60, 140)).toFixed(3);
    },
  };
}

// Cartoon Greg stands at the stage's right edge, so close shots put their
// subject left of centre.
const leftOfGreg = (target) => ({ ...target, cx: target.cx + target.w * 0.12 });

function around(points, pad, minW, minH) {
  const xs = points.map((p) => p[0]), ys = points.map((p) => p[1]);
  const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
  return { cx: (x0 + x1) / 2, cy: (y0 + y1) / 2, w: Math.max(minW, (x1 - x0) * pad), h: Math.max(minH, (y1 - y0) * pad), minCrop: 0.8 };
}

function buildCameraKeys(at, map) {
  const { x0, x1, y0, y1 } = map.extent;
  const world = { cx: (x0 + x1) / 2, cy: (y0 + y1) / 2, w: (x1 - x0) * 1.04, h: (y1 - y0) * 1.12, minCrop: 1 };
  const australia = leftOfGreg(around([place(134, -27)], 1, 330, 210));
  const asia = leftOfGreg(around([PLACES.army.at, PLACES.tarinKowt.at], 1.5, 400, 280));
  const afghanistan = leftOfGreg(around([PLACES.tarinKowt.at, PLACES.kandahar.at], 1, 70, 48));
  const pacific = leftOfGreg(around([PLACES.army.at, PLACES.ottawa.at], 1.25, 600, 360));
  const ottawa = leftOfGreg({ ...around([PLACES.ottawa.at], 1, 150, 100), cy: PLACES.ottawa.at[1] + 8 });
  const ontario = leftOfGreg(around([PLACES.belleville.at, PLACES.napanee.at, place(-79.4, 43.65)], 1.3, 26, 18));
  return [
    [at('title'), world], [at('title', 0.5), world],
    [at('army', 0.4), australia], [at('army', 0.9), australia],
    [at('afghanistan', 0.15), asia], [at('afghanistan', 0.55), asia], [at('afghanistan', 0.9), afghanistan],
    [at('degree', 0.3), australia], [at('degree', 0.8), australia],
    [at('amnesty', 0.2), pacific], [at('amnesty', 0.7), pacific],
    [at('shopify', 0.3), ottawa], [at('shopify', 0.8), ottawa],
    [at('citizenships', 0.3), world], [at('citizenships', 0.8), world],
    [at('belleville', 0.35), ontario], [at('contact', 1), ontario],
  ];
}

function gregTrack(stage, at) {
  const holder = stage.querySelector('.greg-stage');
  const greg = mountGreg(holder);
  return {
    render(f) {
      let outfit = OUTFITS[0][1];
      for (const [id, name] of OUTFITS) if (f.t >= at(id)) outfit = name;
      greg.wear(outfit);
      holder.style.opacity = (1 - seg(f.t, at('shrike', 0.05), at('shrike', 0.3))).toFixed(3);
    },
  };
}

