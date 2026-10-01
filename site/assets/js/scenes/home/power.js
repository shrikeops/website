// Power on the grid: line flow, load and heat, line trips, window light,
// and the generating station's steam. In the attack pass the struck lines
// trip and the cascade blacks out the region. In the identification pass
// the targeted substations are switched off and only their neighbourhoods
// go dark.

import { el } from '../../iso.js';
import { LIT_WINDOW, GENERATOR_WINDOW, mix } from '../../palette.js';
import { lerp, pulse, seg } from '../../timeline.js';
import { BLACKOUT } from './script.js';

const POWER = '#f2c14e';
const HOT = '#f08a24';
const CASCADE = { 'G-S2': 0.12, 'S1-S3': 0.2, 'G-S1': 0.3 };
const OUTAGE_RADIUS = 120;

export function powerTrack(world, schedule, at) {
  const lines = world.lines.map((line) => ({
    line,
    offset: 0,
    speed: 0,
    attached: [line.from, line.to].map((id) => schedule.subs[id]).filter(Boolean),
  }));
  const subs = Object.values(world.subs);
  for (const b of world.buildings) b.nearTarget = subs.some((s) => Math.hypot(b.x - s.x, b.y - s.y) < OUTAGE_RADIUS);
  const flashesByPlace = {};
  for (const plan of Object.values(schedule.subs)) (flashesByPlace[plan.place] ??= []).push(plan.flashAt);
  const steam = buildSteam(world);

  function lineState(state, f) {
    const load = seg(f.sigma, at('weather', 0.2), at('weather', 0.9));
    if (f.identified) {
      const offAt = Math.min(...state.attached.map((p) => p.offAt));
      return { alive: f.sigma < offAt, heat: 0, load, trip: 0 };
    }
    const deadAt = state.attached.length
      ? Math.min(...state.attached.map((p) => p.flashAt))
      : at('cascade', CASCADE[state.line.id] ?? 0.25);
    const alive = f.sigma < deadAt;
    return { alive, load, heat: alive ? seg(f.sigma, schedule.firstFlash, schedule.firstFlash + 0.35) : 0, trip: pulse(f.sigma, deadAt, deadAt + 0.12) };
  }

  function blackout(b, sigma) {
    const base = BLACKOUT[b.place];
    const start = at('cascade', base + b.sweep * 0.08);
    let loss = seg(sigma, start, start + 0.03);
    for (const flashAt of flashesByPlace[b.place] ?? []) {
      const q = (sigma - flashAt) / 0.1;
      if (q > 0 && q < 1) loss = Math.max(loss, 0.7 * Math.sin(q * Math.PI) * (0.6 + 0.4 * Math.sin(q * 40)));
    }
    return loss;
  }

  function plannedOutage(b, sigma) {
    if (!b.nearTarget) return 0;
    const start = at('cascade', 0.15 + b.sweep * 0.12);
    return seg(sigma, start, start + 0.2);
  }

  function renderWindows(f) {
    for (const b of world.buildings) {
      const loss = f.identified ? plannedOutage(b, f.sigma) : blackout(b, f.sigma);
      let color = mix(f.windowOff, LIT_WINDOW, f.lights * (1 - loss));
      if (b.generator && !f.identified && loss > 0) color = mix(color, GENERATOR_WINDOW, loss * f.lights * 0.85);
      if (color !== b.shown) {
        b.windows.style.fill = color;
        b.shown = color;
      }
    }
  }

  return {
    render(f) {
      for (const state of lines) {
        const s = lineState(state, f);
        state.speed = s.alive ? lerp(0.016, 0.03, s.load) + 0.022 * s.heat : 0;
        const { flow, glow } = state.line;
        flow.style.stroke = mix(POWER, HOT, s.heat);
        flow.style.strokeWidth = `${lerp(1.5, 2.4, Math.max(s.load, s.heat)).toFixed(2)}px`;
        flow.style.opacity = s.alive ? '1' : '0';
        glow.style.opacity = s.trip.toFixed(3);
      }
      renderWindows(f);
      const stationDark = f.identified ? 0 : seg(f.sigma, at('cascade', BLACKOUT.G), at('cascade', BLACKOUT.G + 0.12));
      for (const puff of steam) puff.fade = 1 - stationDark;
    },
    tick(f) {
      for (const state of lines) {
        if (!state.speed) continue;
        state.offset -= f.dt * state.speed;
        state.line.flow.style.setProperty('--ambient-march', state.offset.toFixed(1));
      }
      for (const p of steam) {
        const k = (f.now / 9000 + p.phase) % 1;
        p.node.setAttribute('cx', (p.x + k * 26).toFixed(1));
        p.node.setAttribute('cy', (p.y - 6 - k * 60).toFixed(1));
        p.node.setAttribute('r', (9 + k * 18).toFixed(1));
        p.node.style.opacity = ((1 - k) * 0.55 * p.fade).toFixed(3);
      }
    },
  };
}

function buildSteam(world) {
  const puffs = [];
  for (const [mx, my] of world.gen.towers) {
    for (let k = 0; k < 5; k++) {
      puffs.push({ node: el('circle', { class: 'steam' }, world.layers.effects), x: mx, y: my, phase: k / 5, fade: 1 });
    }
  }
  return puffs;
}
