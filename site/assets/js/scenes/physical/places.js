// The three places the physical story visits, as data: where each sits in
// the shared region, where its microphones stand and which way they face,
// what makes its noise, where its threat comes from, and the housing drawn
// for it. A fourth place is one more record here.
//
// Microphones face outward, toward where a threat would come from, so a
// place's own noise mostly arrives from behind them.

import { AIRFIELD, GEN, ROUTES } from '../region/index.js';

const unit = ([x, y]) => { const n = Math.hypot(x, y); return [x / n, y / n]; };
const away = (from, to) => unit([to[0] - from[0], to[1] - from[1]]);
const PASSING_REACH = 115;
const BOUNCE = 9;

export function buildPlaces(world) {
  const { x: ax, y: ay, w: aw } = AIRFIELD;
  const [px, py] = world.anchors.airliner;
  const sub = world.subs.D1;
  const airportCentre = [ax + aw / 2, ay + 45];
  const subCentre = [sub.x, sub.y];

  const airportPoles = [[ax - 20, ay + 60], [ax + 60, ay + 112], [ax + 250, ay + 108], [ax + aw + 22, ay + 40], [ax + 170, ay - 22]]
    .map((at) => ({ at, heading: away(airportCentre, at) }));
  const plantPoles = [[GEN.x + 120, GEN.y - 120], [GEN.x - 120, GEN.y - 120], [GEN.x - 120, GEN.y + 100], [GEN.x + 120, GEN.y + 100]]
    .map((at) => ({ at, heading: away([GEN.x, GEN.y], at) }));
  const subPoles = [[-40, -30], [0, -34], [40, -30], [40, 34], [0, 38], [-40, 34]]
    .map(([dx, dy]) => ({ at: [sub.x + dx, sub.y + dy], heading: unit([dx, dy]) }));
  const road = nearestRoad([sub.x, sub.y], PASSING_REACH);
  const toMic = away(road.closest, subPoles[0].at);

  return {
    airport: {
      label: 'Airport',
      tagAt: [...airportCentre, 40],
      poles: airportPoles,
      chosen: 0,
      shape: 'horn',
      sources: [
        { kind: 'air', at: [px, py, 4], reach: 130, period: 1600 },
        { kind: 'air', at: [ax + 160, ay + 80, 6], reach: 60, period: 1300 },
      ],
      threat: { from: [ax - 230, ay + 150, 40], to: [ax - 90, ay + 90, 26] },
    },
    plant: {
      label: 'Power station',
      tagAt: [GEN.x, GEN.y, 90],
      poles: plantPoles,
      chosen: 0,
      shape: 'scoop',
      nextShape: 'chamber',
      sources: [
        { kind: 'air', at: [GEN.x + 42, GEN.y + 5, 20], reach: 150, period: 2000 },
        { kind: 'air', at: [GEN.x - 60, GEN.y - 50, 50], reach: 110, period: 1400 },
        { kind: 'air', at: [GEN.x + 10, GEN.y - 70, 50], reach: 110, period: 1500 },
      ],
      threat: { from: [GEN.x + 235, GEN.y - 235, 100], to: [GEN.x + 165, GEN.y - 165, 70] },
    },
    substation: {
      label: 'Substation',
      tagAt: [sub.x, sub.y, 50],
      poles: subPoles,
      chosen: 0,
      shape: 'bulb',
      sub,
      sources: [
        { kind: 'air', at: sub.transformer, reach: 90, period: 1100 },
      ],
      threat: { from: [sub.x - 220, sub.y - 190, 50], to: [sub.x - 80, sub.y - 65, 30] },
      road: road.stretch,
      traffic: [...road.closest, 1],
      wall: [sub.x + 14, sub.y + 9, 4],
      asphalt: [road.closest[0] + toMic[0] * BOUNCE, road.closest[1] + toMic[1] * BOUNCE, 0],
      approaches: [
        [[sub.x - 270, sub.y - 240, 60], [sub.x - 50, sub.y - 40, 30]],
        [[sub.x - 110, sub.y - 290, 70], [sub.x - 10, sub.y - 50, 30]],
        [[sub.x - 300, sub.y - 90, 50], [sub.x - 55, sub.y - 10, 30]],
      ],
      centre: subCentre,
    },
  };
}

// The stretch of road nearest a point, `reach` either side of the closest
// spot, cut to the road leg it lies on; where a passing car is heard.
function nearestRoad([x, y], reach) {
  let best = null;
  for (const { points } of ROUTES) {
    for (let k = 1; k < points.length; k++) {
      const [a, b] = [points[k - 1], points[k]];
      const length = Math.hypot(b[0] - a[0], b[1] - a[1]);
      const dir = [(b[0] - a[0]) / length, (b[1] - a[1]) / length];
      const along = Math.max(0, Math.min(length, (x - a[0]) * dir[0] + (y - a[1]) * dir[1]));
      const closest = [a[0] + dir[0] * along, a[1] + dir[1] * along];
      const distance = Math.hypot(x - closest[0], y - closest[1]);
      if (!best || distance < best.distance) best = { distance, closest, a, dir, along, length };
    }
  }
  const at = (d) => [best.a[0] + best.dir[0] * d, best.a[1] + best.dir[1] * d];
  return { closest: best.closest, stretch: [at(Math.max(0, best.along - reach)), at(Math.min(best.length, best.along + reach))] };
}
