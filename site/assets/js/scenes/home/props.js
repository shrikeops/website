// The home story's own objects in the shared region: the attackers' vans,
// the microphone housing at each substation that the identification pass
// switches on, and where the incendiary devices ignite. They are props the
// home page adds to the scenery; the other pages never draw them.

import { box, el, orientedBox, project } from '../../iso.js';
import { PLACES } from '../region/index.js';

export const VANS = { A: [330, -72], B: [930, -80], C: [-150, 610], D: [760, 380], E: [-740, -110] };

// Inside the forest west of town A, along the edge that faces the town.
export const FIRE_POINTS = [[-236, 85], [-224, 110], [-220, 135], [-228, 160], [-242, 185], [-266, 205]];

export function housingAt({ x, y }) {
  return [x + 38, y - 28, 17];
}

export function homeProps() {
  const vans = Object.values(VANS).map(([x, y]) => ({ x, y, draw: (layer) => drawVan(layer, x, y) }));
  const housings = PLACES.flatMap((place) => place.subs.map(([x, y]) => {
    const at = housingAt({ x, y });
    return { x: at[0], y: at[1], draw: (layer) => drawHousing(layer, at) };
  }));
  return [...vans, ...housings];
}

function drawVan(layer, x, y) {
  const g = el('g', {}, layer);
  box(g, { x: x - 5, y: y - 3, w: 10, d: 6, h: 5.5, mat: 'navy' });
  box(g, { x: x + 5, y: y - 3, w: 3.5, d: 6, h: 3.5, mat: 'navy' });
}

// The passive sensor: a pole with a small directional housing, hidden until
// the identification pass switches it on.
function drawHousing(layer, [x, y, z]) {
  const g = el('g', { class: 'housing' }, layer);
  box(g, { x: x - 0.6, y: y - 0.6, w: 1.2, d: 1.2, h: z, mat: 'metal' });
  orientedBox(g, { x, y, z, length: 5, width: 3.4, h: 3.4, heading: [0.6, 0.8], mat: 'navy' });
  const [ex, ey] = project(x + 1.5, y + 2, z + 1.7);
  el('circle', { cx: ex.toFixed(1), cy: ey.toFixed(1), r: 1.2, class: 'housing-eye' }, g);
}
