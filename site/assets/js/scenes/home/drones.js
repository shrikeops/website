// The attack drones: two per targeted substation. Each flies from its van,
// trailing a conductive line, hovers, then comes down and drops the line
// across the equipment. The flight is the same in both passes; only the
// moment it comes down differs (script.js).

import { el, project } from '../../iso.js';
import { seeded } from '../../random.js';
import { ease, lerp, seg } from '../../timeline.js';
import { droneSprite } from '../furniture.js';
import { VANS } from './props.js';

export function dronesTrack(world, schedule) {
  const rand = seeded(909);
  const drones = [];
  for (const sub of Object.values(world.subs)) {
    const plan = schedule.subs[sub.id];
    const van = VANS[sub.place];
    for (const side of [-1, 1]) {
      const target = [sub.x - 10 + side * 9, sub.y - 4 - side * 6];
      const shadow = el('ellipse', { rx: 5, ry: 2.5, class: 'drone-shadow' }, world.layers.trails);
      const trail = el('path', { class: 'drone-trail' }, world.layers.trails);
      const tether = el('path', { class: 'tether' }, world.layers.drones);
      const sprite = droneSprite(world.layers.drones);
      drones.push({ van, target, plan, trail, trailU: -1, path: flightSamples(van, target), tether, shadow, sprite, phase: rand() * 6, hidden: false });
    }
  }

  function update(f) {
    const s = Math.max(1, f.scale * 0.85);
    for (const drone of drones) {
      const { fly } = drone.plan;
      const strikeWindow = f.identified ? drone.plan.strike.identified : drone.plan.strike.attack;
      const u = ease(seg(f.sigma, ...fly));
      const strike = seg(f.sigma, ...strikeWindow);
      const gone = seg(strike, 0.62, 0.9);
      const launched = f.sigma > fly[0];
      const trailFade = 1 - seg(f.sigma, strikeWindow[1] + 0.6, strikeWindow[1] + 1.4);
      if (u !== drone.trailU) {
        drone.trail.setAttribute('d', flightSoFar(drone, u));
        drone.trailU = u;
      }
      drone.trail.style.opacity = launched ? (0.55 * trailFade).toFixed(3) : '0';
      const hide = !launched || gone >= 1;
      if (hide !== drone.hidden) {
        for (const node of [drone.sprite.g, drone.tether, drone.shadow]) node.style.display = hide ? 'none' : '';
        drone.hidden = hide;
      }
      if (hide) continue;
      const hover = u >= 1 ? Math.sin(f.now / 420 + drone.phase) * 1.6 * (1 - strike) : 0;
      let [x, y, z] = flightPoint(drone.van, drone.target, u);
      const descend = ease(seg(strike, 0, 0.55));
      z = lerp(z, 34, descend) + hover - gone * 20;
      const [sx, sy] = project(x, y, z);
      drone.sprite.g.setAttribute('transform', `translate(${sx.toFixed(1)} ${sy.toFixed(1)}) scale(${s.toFixed(2)})`);
      drone.sprite.g.style.opacity = (1 - gone).toFixed(3);
      const spin = Math.sin(f.now / 30 + drone.phase);
      for (const r of drone.sprite.rotors) r.setAttribute('rx', (4.4 * (0.75 + 0.25 * spin)).toFixed(2));
      const heading = [drone.target[0] - drone.van[0], drone.target[1] - drone.van[1]];
      const len = Math.hypot(...heading) || 1;
      const trailBack = lerp(16, 2, descend);
      const endZ = lerp(z - 30, 17, ease(seg(strike, 0.3, 0.6)));
      const end = project(x - (heading[0] / len) * trailBack, y - (heading[1] / len) * trailBack, endZ);
      const mid = [(sx + end[0]) / 2 + Math.sin(f.now / 500 + drone.phase) * 2, (sy + end[1]) / 2 + 5];
      drone.tether.setAttribute('d', `M${sx.toFixed(1)} ${(sy + 2 * s).toFixed(1)}Q${mid[0].toFixed(1)} ${mid[1].toFixed(1)} ${end[0].toFixed(1)} ${end[1].toFixed(1)}`);
      drone.tether.style.opacity = (1 - gone).toFixed(3);
      const [gx, gy] = project(x, y, 0);
      drone.shadow.setAttribute('cx', gx.toFixed(1));
      drone.shadow.setAttribute('cy', gy.toFixed(1));
      drone.shadow.setAttribute('rx', (5 * s).toFixed(1));
      drone.shadow.setAttribute('ry', (2.5 * s).toFixed(1));
      drone.shadow.style.opacity = (0.22 * (1 - gone)).toFixed(3);
    }
  }

  return { render: update, tick: update };
}

export function hoverPoint(target) {
  return [target[0], target[1], 56];
}

function flightPoint(van, target, u) {
  const p0 = [van[0], van[1], 4];
  const p1 = [van[0], van[1], 95];
  const p2 = [target[0] + (van[0] - target[0]) * 0.25, target[1] + (van[1] - target[1]) * 0.25, 80];
  const p3 = hoverPoint(target);
  const v = 1 - u;
  return [0, 1, 2].map((i) => v * v * v * p0[i] + 3 * v * v * u * p1[i] + 3 * v * u * u * p2[i] + u * u * u * p3[i]);
}

const SAMPLES = 32;

function flightSamples(van, target) {
  return Array.from({ length: SAMPLES + 1 }, (_, k) => project(...flightPoint(van, target, k / SAMPLES)));
}

// The trail is redrawn up to where the drone is, so it always ends at the
// drone. (A dash-offset reveal breaks here: the trail keeps a constant
// screen width, and Chrome then measures its dashes in screen pixels.)
function flightSoFar(drone, u) {
  if (u <= 0) return '';
  const whole = Math.floor(u * SAMPLES);
  const points = drone.path.slice(0, whole + 1);
  points.push(project(...flightPoint(drone.van, drone.target, u)));
  return points.map(([sx, sy], k) => `${k ? 'L' : 'M'}${sx.toFixed(1)} ${sy.toFixed(1)}`).join('');
}
