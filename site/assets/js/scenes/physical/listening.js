// The microphones: poles at each place's edge, each with an amber listening
// lobe spreading outward from the microphone. The airport's first pole stands from
// the opening; the rest appear with their place. At the substation the
// candidate positions appear and one is chosen (model); then each place's
// chosen pole shows its housing in a callout (housing-per-mission), and the power
// station's housing is reprinted for the jet-powered threat (change-housing).

import { box, el, orientedBox, project } from '../../iso.js';
import { ease, lerp, seg } from '../../timeline.js';
import { spriteScale } from '../furniture.js';
import { drawShape } from './shapes.js';

const POLE_H = 15;
const HOUSING = { offset: 1.2, length: 5, size: 3.4 };
const LOBE = { reach: 60, spread: 0.55, narrowed: 0.35 };
const REGION_ZOOM = 1.1;

export function listeningTrack(world, places, at) {
  const lobes = el('g', { class: 'lobes' }, world.layers.effects);
  const layer = el('g', { class: 'microphones' }, world.layers.tags);
  const callouts = el('g', { class: 'callouts' }, world.layers.tags);
  const poles = [];
  const add = (place, pole, k, timing) => poles.push({
    place, ...pole, k, ...timing,
    g: drawPole(layer, pole.at, pole.heading),
    lobe: el('path', { class: 'lobe', d: '' }, lobes),
    drawnLobe: '',
  });

  const { airport, plant, substation } = places;
  airport.poles.forEach((pole, k) => add(airport, pole, k, k === 0
    ? { from: at('title'), lobeFrom: at('title', 0.3) }
    : { from: at('microphone', 0.1 + k * 0.1), lobeFrom: at('airport', 0.1) }));
  plant.poles.forEach((pole, k) => add(plant, pole, k, { from: at('power-station', 0.05 + k * 0.04), lobeFrom: at('power-station', 0.2) }));
  substation.poles.forEach((pole, k) => add(substation, pole, k, k === 0
    ? { from: at('substation', 0.05), lobeFrom: at('substation', 0.2) }
    : { from: at('model', 0.15 + k * 0.03), until: at('housing-per-mission', 0.2), candidate: true }));

  const chosen = [airport, plant, substation].map((place, k) => ({
    place,
    pole: poles.find((p) => p.place === place && p.k === place.chosen),
    amberFrom: place === substation ? at('model', 0.7) : at('housing-per-mission', 0.2),
    callout: buildCallout(callouts, place, k),
    calloutFrom: at('housing-per-mission', 0.2 + k * 0.12),
  }));

  return {
    render(f) {
      const s = spriteScale(f, 1.3);
      const grow = Math.min(3, Math.max(1, f.scale / REGION_ZOOM));
      const reprint = seg(f.t, at('change-housing', 0.45), at('change-housing', 0.85));
      for (const pole of poles) {
        const gone = pole.until === undefined ? 0 : seg(f.t, pole.until, pole.until + 0.1);
        const up = seg(f.t, pole.from, pole.from + 0.08) * (1 - gone);
        const faint = pole.candidate ? 0.55 : 1;
        pole.g.style.display = up > 0 ? '' : 'none';
        pole.g.style.opacity = (up * faint).toFixed(3);
        const listening = pole.lobeFrom === undefined ? 0 : seg(f.t, pole.lobeFrom, pole.lobeFrom + 0.1);
        const spread = pole.place === plant ? lerp(LOBE.spread, LOBE.narrowed, ease(reprint)) : LOBE.spread;
        const d = listening > 0 ? lobeD(pole.at, pole.heading, LOBE.reach * grow, spread) : '';
        if (d !== pole.drawnLobe) { pole.lobe.setAttribute('d', d); pole.drawnLobe = d; }
        pole.lobe.style.opacity = listening.toFixed(3);
      }
      for (const c of chosen) {
        c.pole.g.classList.toggle('is-chosen', f.t >= c.amberFrom);
        const v = ease(seg(f.t, c.calloutFrom, c.calloutFrom + 0.1));
        c.callout.g.style.display = v > 0 ? '' : 'none';
        if (!(v > 0)) continue;
        const [x, y] = project(...c.pole.at, POLE_H + 4);
        c.callout.g.style.opacity = v.toFixed(3);
        c.callout.g.setAttribute('transform', `translate(${x.toFixed(1)} ${(y - 30 * s).toFixed(1)}) scale(${(s * lerp(0.7, 1, v)).toFixed(2)})`);
        if (c.callout.next) renderReprint(c.callout, f.t, at, reprint);
      }
    },
  };
}

function drawPole(layer, [x, y], heading) {
  const g = el('g', { class: 'mic-pole' }, layer);
  box(g, { x: x - 0.6, y: y - 0.6, w: 1.2, d: 1.2, h: POLE_H, mat: 'metal' });
  const { offset, length, size } = HOUSING;
  orientedBox(g, { x: x + heading[0] * offset, y: y + heading[1] * offset, z: POLE_H, length, width: size, h: size, heading, mat: 'navy' });
  return g;
}

// A level sector from the front of the microphone housing, `spread`
// radians either side of its heading.
function lobeD([px, py], [hx, hy], reach, spread) {
  const front = HOUSING.offset + HOUSING.length / 2;
  const [x, y, z] = [px + hx * front, py + hy * front, POLE_H + HOUSING.size / 2];
  const a = Math.atan2(hy, hx);
  const points = [[x, y, z]];
  for (let k = 0; k <= 10; k++) {
    const t = a - spread + (2 * spread * k) / 10;
    points.push([x + Math.cos(t) * reach, y + Math.sin(t) * reach, z]);
  }
  return points.map((p, k) => `${k ? 'L' : 'M'}${project(...p).map((v) => v.toFixed(1)).join(' ')}`).join('') + 'Z';
}

// A card over a chosen pole showing its housing's silhouette and listening
// arc. The power station's card also holds the reprinted housing.
function buildCallout(layer, place, k) {
  const g = el('g', { class: 'callout' }, layer);
  el('path', { d: 'M-24 -18H24V14H4L0 19L-4 14H-24Z', class: 'callout-card' }, g);
  el('path', { d: 'M16 -9A12 12 0 0 1 16 9', class: 'callout-arc' }, g);
  const old = drawShape(g, place.shape);
  old.setAttribute('transform', 'translate(-3 -2)');
  if (!place.nextShape) return { g };
  const clip = el('clipPath', { id: `reprint-${k}` }, g);
  const reveal = el('rect', { x: -22, y: 10, width: 44, height: 0 }, clip);
  const next = drawShape(el('g', { 'clip-path': `url(#reprint-${k})` }, g), place.nextShape);
  next.setAttribute('transform', 'translate(-3 -2)');
  const head = el('path', { d: 'M-18 0H14', class: 'print-head' }, g);
  return { g, old, next, reveal, head };
}

function renderReprint(callout, t, at, reprint) {
  const fade = seg(t, at('change-housing', 0.3), at('change-housing', 0.45));
  callout.old.style.opacity = (1 - fade).toFixed(3);
  const top = lerp(10, -14, reprint);
  callout.reveal.setAttribute('y', top.toFixed(1));
  callout.reveal.setAttribute('height', (10 - top).toFixed(1));
  const printing = reprint > 0 && reprint < 1;
  callout.head.style.display = printing ? '' : 'none';
  callout.head.setAttribute('transform', `translate(0 ${top.toFixed(1)})`);
}
