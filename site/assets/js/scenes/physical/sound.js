// What each place sounds like: expanding rings from every source, heavy
// blue-grey for aircraft and machinery, grey for road traffic, thin red for
// the threat. The threats and the departing airliner move with the reader;
// the rings themselves are ambient. Each ring is centred where its source
// was when the ring left it, so a moving car's rings bunch up ahead of it.

import { el, project } from '../../iso.js';
import { ease, lerp, seg, window01 } from '../../timeline.js';
import { AIRFIELD, carPosition, drawAirliner, drawCar, placeVehicle } from '../region/index.js';
import { droneSprite } from '../furniture.js';

const RINGS = 3;
const REACH = { traffic: 60, threat: 42 };
const PERIOD = { traffic: 1200, threat: 900 };
const CAR_CROSSING_MS = 10000;
const WIRE = 18;

export function soundTrack(world, places, at) {
  const ringLayer = el('g', { class: 'rings' }, world.layers.effects);
  const movers = el('g', { class: 'movers' }, world.layers.tags);
  const { airport, plant, substation } = places;
  const sources = [];
  const addSource = (kind, reach, period, centreAt, gate) => {
    const rings = Array.from({ length: RINGS }, () => el('ellipse', { class: `ring ring-${kind}` }, ringLayer));
    const source = { kind, reach, period, centreAt, gate, level: 0, shown: false, rings };
    sources.push(source);
    return source;
  };

  // Which place is heard, by beat. The whole-region beats hear all three, softly.
  const heard = {
    airport: (t) => Math.max(window01(t, at('airport'), at('airport', 1), 0.1), 0.5 * regionWide(t)),
    plant: (t) => Math.max(window01(t, at('power-station'), at('power-station', 1), 0.1), window01(t, at('change-housing'), at('change-housing', 1), 0.1), 0.5 * regionWide(t)),
    substation: (t) => Math.max(window01(t, at('substation'), at('model', 1), 0.1), 0.5 * regionWide(t)),
  };
  function regionWide(t) {
    return Math.max(window01(t, at('three-places', 0.3), at('three-places', 1), 0.1), window01(t, at('housing-per-mission'), at('housing-per-mission', 1), 0.1));
  }

  for (const [name, place] of Object.entries({ airport, plant, substation })) {
    for (const s of place.sources) {
      const centre = project(...s.at);
      addSource(s.kind, s.reach, s.period, () => centre, heard[name]);
    }
  }

  const accessCar = world.cars[world.cars.length - 1];
  addSource('traffic', REACH.traffic, PERIOD.traffic, (time) => { const p = carPosition(accessCar, time); return project(p.x, p.y, 1); }, heard.airport);

  const departure = { g: el('g', { class: 'departure' }, movers), at: null };
  drawAirliner(departure.g, 0, 0);
  addSource('air', 150, 1500, () => departure.at, (t) => (departure.at ? heard.airport(t) : 0));
  const service = { g: el('g', { class: 'car' }, movers), paint: 'white', heading: '' };

  const threats = [
    { place: airport, sprite: droneSprite(movers), window: ['airport', 0.1, 'airport', 0.8], shown: (t) => window01(t, at('airport', 0.05), at('airport', 1), 0.06) },
    { place: plant, sprite: shahedSprite(movers), window: ['power-station', 0.1, 'power-station', 0.9], shown: (t) => Math.max(window01(t, at('power-station', 0.05), at('power-station', 1), 0.06), window01(t, at('change-housing', 0.05), at('change-housing', 1), 0.06)) },
    { place: substation, sprite: droneSprite(movers), window: ['substation', 0.1, 'substation', 0.85], shown: (t) => window01(t, at('substation', 0.05), at('model', 0.3), 0.06), wire: el('path', { class: 'tether' }, movers) },
  ];
  for (const threat of threats) {
    threat.at = null;
    addSource('threat', REACH.threat, PERIOD.threat, () => threat.at, (t) => threat.shown(t));
  }

  const passing = { g: el('g', { class: 'car' }, movers), paint: 'roof2', heading: '', gate: 0 };
  const road = substation.road;
  const carAt = (time) => {
    const u = 1 - Math.abs(((time / CAR_CROSSING_MS) % 2) - 1);
    return [lerp(road[0][0], road[1][0], u), lerp(road[0][1], road[1][1], u)];
  };
  const passingGate = (t) => window01(t, at('why-hard'), at('why-hard', 1), 0.08);
  addSource('traffic', REACH.traffic, PERIOD.traffic, (time) => project(...carAt(time), 1), passingGate);

  return {
    render(f) {
      const s = Math.max(1, f.scale * 0.85);
      renderDeparture(departure, f.t, at);
      renderService(service, f.t, at);
      for (const threat of threats) renderThreat(threat, f.t, at, s);
      passing.gate = passingGate(f.t);
      passing.g.style.display = passing.gate > 0 ? '' : 'none';
      passing.g.style.opacity = passing.gate.toFixed(3);
      for (const source of sources) source.level = source.gate(f.t);
      threats[1].sprite.g.dataset.variant = f.t >= at('change-housing') ? 'jet' : 'piston';
    },
    tick(f) {
      if (passing.gate > 0) {
        const [x, y] = carAt(f.now);
        const ahead = carAt(f.now + 50);
        const heading = [ahead[0] - x, ahead[1] - y];
        const n = Math.hypot(...heading) || 1;
        placeVehicle(passing, x, y, [heading[0] / n, heading[1] / n], drawCar);
      }
      for (const source of sources) {
        if (!(source.level > 0) && !source.shown) continue;
        source.shown = source.level > 0;
        source.rings.forEach((ring, i) => {
          const k = (f.now / source.period + i / RINGS) % 1;
          const centre = source.centreAt(f.now - k * source.period);
          if (!centre || !(source.level > 0)) { ring.style.opacity = '0'; return; }
          const r = Math.max(1, k * source.reach);
          ring.setAttribute('cx', centre[0].toFixed(1));
          ring.setAttribute('cy', centre[1].toFixed(1));
          ring.setAttribute('rx', (r * 1.41).toFixed(1));
          ring.setAttribute('ry', (r * 0.71).toFixed(1));
          ring.style.opacity = ((1 - k) * source.level).toFixed(3);
        });
      }
    },
  };
}

// airport: an airliner rolls down the runway and climbs away behind the
// listening poles.
function renderDeparture(departure, t, at) {
  const shown = window01(t, at('airport', 0.02), at('airport', 1), 0.05);
  departure.g.style.display = shown > 0 ? '' : 'none';
  if (!(shown > 0)) { departure.at = null; return; }
  const roll = ease(seg(t, at('airport', 0.05), at('airport', 0.95)));
  const x = lerp(AIRFIELD.x + 30, AIRFIELD.x + AIRFIELD.w + 60, roll);
  const z = Math.max(0, x - (AIRFIELD.x + AIRFIELD.w - 60)) * 0.4;
  const [sx, sy] = project(x, AIRFIELD.y + 11, z);
  departure.g.style.opacity = shown.toFixed(3);
  departure.g.setAttribute('transform', `translate(${sx.toFixed(1)} ${sy.toFixed(1)})`);
  departure.at = [sx, sy];
}

function renderService(vehicle, t, at) {
  const shown = window01(t, at('airport', 0.02), at('airport', 1), 0.05);
  vehicle.g.style.display = shown > 0 ? '' : 'none';
  if (!(shown > 0)) return;
  const u = seg(t, at('airport', 0.1), at('airport', 0.9));
  placeVehicle(vehicle, lerp(AIRFIELD.x + 70, AIRFIELD.x + 200, u), AIRFIELD.y + 24, [1, 0], drawCar);
}

function renderThreat(threat, t, at, s) {
  const shown = threat.shown(t);
  threat.sprite.g.style.display = shown > 0 ? '' : 'none';
  if (threat.wire) threat.wire.style.display = shown > 0 ? '' : 'none';
  if (!(shown > 0)) { threat.at = null; return; }
  const [a, pa, b, pb] = threat.window;
  const inWindow = t < at('change-housing') ? seg(t, at(a, pa), at(b, pb)) : seg(t, at('change-housing', 0.1), at('change-housing', 0.9));
  const u = ease(inWindow);
  const { from, to } = threat.place.threat;
  const p = [0, 1, 2].map((i) => lerp(from[i], to[i], u));
  const [sx, sy] = project(...p);
  threat.sprite.g.style.opacity = shown.toFixed(3);
  const [fx, fy] = project(...from), [tx, ty] = project(...to);
  const angle = (Math.atan2(ty - fy, tx - fx) * 180) / Math.PI;
  const turn = threat.sprite.turns ? ` rotate(${angle.toFixed(1)})` : '';
  threat.sprite.g.setAttribute('transform', `translate(${sx.toFixed(1)} ${sy.toFixed(1)}) scale(${s.toFixed(2)})${turn}`);
  threat.at = [sx, sy];
  if (threat.wire) {
    const [wx, wy] = project(p[0], p[1], p[2] - WIRE);
    threat.wire.setAttribute('d', `M${sx.toFixed(1)} ${(sy + 2 * s).toFixed(1)}Q${(sx + 3 * s).toFixed(1)} ${((sy + wy) / 2).toFixed(1)} ${wx.toFixed(1)} ${wy.toFixed(1)}`);
  }
}

// A delta-wing attack drone seen from above, nose to the right. The piston
// version has a pusher propeller; the jet version an engine on its back.
function shahedSprite(parent) {
  const g = el('g', { class: 'shahed' }, parent);
  el('path', { d: 'M12 0L-8 -11L-6 -2.5L-10 -2.5L-10 2.5L-6 2.5L-8 11Z', class: 'shahed-body' }, g);
  el('path', { d: 'M-7 -10.5L-9 -13M-7 10.5L-9 13', class: 'shahed-fin' }, g);
  el('ellipse', { cx: -11, cy: 0, rx: 1.4, ry: 5, class: 'shahed-prop' }, g);
  el('rect', { x: -9, y: -1.6, width: 8, height: 3.2, rx: 1.5, class: 'shahed-jet' }, g);
  return { g, turns: true };
}
