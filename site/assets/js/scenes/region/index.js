// The fictional region the Home, Digital and Physical stories play out in:
// five places on one grid, a generating station across a lake, an airport on
// the southern edge, and the lines and roads between them. The region is
// scenery; each page adds its own objects as props, and its tracks find what
// they need through the anchors, substations, lines and buildings returned
// here.

import { el, project } from '../../iso.js';
import { PLACES, SWITCHING, GEN } from './layout.js';
import {
  drawGround, buildTown, drawForests, buildSubstations, buildSwitching, buildGenerator, buildAirport, buildLines,
} from './scenery.js';
import { buildCars } from './traffic.js';

export { PLACES, LINES, ROUTES, AIRFIELD, GEN } from './layout.js';
export { drawAirliner } from './scenery.js';
export {
  LANE_OFFSET, routeLegs, pointOnRoute, carPosition, updateCars, everydayLifeTrack, placeVehicle, drawCar, headlights,
} from './traffic.js';

// props are a page's own objects ({ x, y, draw(layer) }), painted in depth
// order with the scenery so they sit behind what stands in front of them.
export function buildRegion(svg, { props = [] } = {}) {
  const layers = {};
  for (const name of ['ground', 'cars', 'objects', 'wires', 'flows', 'glows', 'trails', 'drones', 'effects', 'tags']) {
    layers[name] = el('g', { class: `layer-${name}` }, svg);
  }
  const objects = [];
  const ctx = {
    ground: layers.ground,
    buildings: [],
    anchors: {},
    addObject: (x, y, draw) => objects.push({ depth: x + y, draw }),
  };

  const nodes = { G: GEN.node, ...SWITCHING };
  for (const place of PLACES) place.subs.forEach((s, i) => { nodes[`${place.id}${i + 1}`] = s; });

  drawGround(layers.ground, nodes);
  for (const place of PLACES) buildTown(place, ctx);
  drawForests(ctx.addObject, nodes);
  const subs = buildSubstations(ctx);
  buildSwitching(ctx);
  const gen = buildGenerator(ctx);
  buildAirport(ctx);
  const lines = buildLines(layers, ctx.addObject, nodes);
  for (const prop of props) ctx.addObject(prop.x, prop.y, prop.draw);

  objects.sort((a, b) => a.depth - b.depth).forEach((o) => o.draw(layers.objects));

  const cars = buildCars(layers.cars);
  return {
    layers, nodes, subs, lines, gen, cars,
    buildings: ctx.buildings,
    anchors: ctx.anchors,
    extent: gridExtent(nodes),
  };
}

// The whole grid in one shot, for pages that pull back to the region.
export function regionView(world) {
  const { x0, x1, y0, y1 } = world.extent;
  return { cx: (x0 + x1) / 2, cy: (y0 + y1) / 2 + 20, w: (x1 - x0) * 1.06, h: (y1 - y0) * 1.2, minCrop: 1 };
}

function gridExtent(nodes) {
  const corners = PLACES.flatMap((p) => [[p.x - p.size, p.y + p.size], [p.x + p.size, p.y - p.size], [p.x - p.size, p.y - p.size], [p.x + p.size, p.y + p.size]]);
  const pts = [...Object.values(nodes), ...corners].map(([x, y]) => project(x, y));
  const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
  return { x0: Math.min(...xs), x1: Math.max(...xs), y0: Math.min(...ys), y1: Math.max(...ys) };
}
