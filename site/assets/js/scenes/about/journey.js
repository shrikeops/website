// Greg's path on the map: pins that drop in with a label, amber flight arcs
// drawn as the reader scrolls, the Shopify year strip, and the four
// citizenship countries. Everything is keyed to the About page's beat ids.

import { el } from '../../iso.js';
import { ease, lerp, seg, window01 } from '../../timeline.js';
import { place } from './worldmap.js';

export const PLACES = {
  army: { at: place(151.21, -33.87), label: 'Australian Army · 2004', left: true },
  tarinKowt: { at: place(65.87, 32.63), label: 'Tarin Kowt · 2010–11' },
  kandahar: { at: place(65.85, 31.51), label: 'Kandahar', below: true },
  ottawa: { at: place(-75.70, 45.42), label: 'Ottawa · 2012' },
  belleville: { at: place(-77.38, 44.16), label: 'Belleville', left: true },
  napanee: { at: place(-76.95, 44.25), label: 'Napanee limestone plain' },
};

export function journeyTrack(map, at) {
  const pins = Object.fromEntries(Object.entries(PLACES).map(([key, p]) => [key, buildPin(map.layers.pins, p)]));
  const arcs = [
    { from: 'army', to: 'tarinKowt', window: [at('afghanistan', 0.1), at('afghanistan', 0.55)] },
    { from: 'army', to: 'ottawa', window: [at('amnesty', 0.1), at('amnesty', 0.6)] },
    { from: 'ottawa', to: 'belleville', window: [at('belleville', 0.2), at('belleville', 0.5)] },
  ].map((arc) => ({
    ...arc,
    curve: arcCurve(PLACES[arc.from].at, PLACES[arc.to].at),
    path: el('path', { class: 'journey-arc' }, map.layers.arcs),
    dot: el('circle', { class: 'journey-dot' }, map.layers.arcs),
    drawn: -1,
  }));
  const years = buildYearStrip(map.layers.pins);

  const appear = {
    belleville: (t) => Math.max(1 - seg(t, at('title', 0.8), at('army', 0.1)), seg(t, at('belleville', 0.45), at('belleville', 0.6))),
    army: (t) => seg(t, at('army', 0.35), at('army', 0.5)),
    tarinKowt: (t) => seg(t, at('afghanistan', 0.5), at('afghanistan', 0.65)),
    kandahar: (t) => seg(t, at('afghanistan', 0.6), at('afghanistan', 0.75)),
    ottawa: (t) => seg(t, at('amnesty', 0.55), at('amnesty', 0.7)),
    napanee: (t) => seg(t, at('shrike', 0.3), at('shrike', 0.45)),
  };

  return {
    render(f) {
      const s = f.scale * 0.95;
      const labels = 1 - seg(f.view.w, 700, 1100);
      for (const [key, pin] of Object.entries(pins)) {
        const labelled = key === 'belleville' ? 1 : labels;
        for (const part of pin.label) part.style.opacity = labelled.toFixed(3);
        const v = appear[key](f.t);
        pin.g.style.display = v > 0 ? '' : 'none';
        pin.g.style.opacity = v.toFixed(3);
        const [x, y] = PLACES[key].at;
        pin.g.setAttribute('transform', `translate(${x.toFixed(2)} ${(y - (1 - ease(v)) * 24 * s).toFixed(2)}) scale(${s.toFixed(3)})`);
      }
      for (const arc of arcs) {
        const k = ease(seg(f.t, ...arc.window));
        if (k !== arc.drawn) {
          arc.path.setAttribute('d', k > 0 ? partialQuad(arc.curve, k) : '');
          arc.drawn = k;
        }
        const flying = k > 0 && k < 1;
        arc.dot.style.display = flying ? '' : 'none';
        if (flying) {
          const [x, y] = pointOnQuad(arc.curve, k);
          arc.dot.setAttribute('cx', x.toFixed(2));
          arc.dot.setAttribute('cy', y.toFixed(2));
          arc.dot.setAttribute('r', (4.5 * f.scale).toFixed(2));
        }
      }
      const strip = window01(f.t, at('shopify', 0.1), at('citizenships', 0.2), 0.08);
      years.g.style.display = strip > 0 ? '' : 'none';
      years.g.style.opacity = strip.toFixed(3);
      const [ox, oy] = PLACES.ottawa.at;
      years.g.setAttribute('transform', `translate(${ox.toFixed(2)} ${(oy + 14 * s).toFixed(2)}) scale(${s.toFixed(3)})`);
      years.fill(ease(seg(f.t, at('shopify', 0.2), at('shopify', 0.8))));
      const citizen = window01(f.t, at('citizenships', 0.15), at('belleville', 0.2), 0.12);
      for (const country of Object.values(map.countries)) country.style.opacity = (citizen * 0.85).toFixed(3);
    },
  };
}

function buildPin(layer, { label, below, left }) {
  const g = el('g', { class: 'pin' }, layer);
  el('path', { d: 'M0 0C-4 -6 -8 -10 -8 -15A8 8 0 1 1 8 -15C8 -10 4 -6 0 0Z', class: 'pin-body' }, g);
  el('circle', { cx: 0, cy: -15, r: 3.4, class: 'pin-dot' }, g);
  const width = 16 + label.length * 6.1;
  const x = left ? -12 - width : 12;
  const y = below ? 4 : -34;
  el('rect', { x, y, width, height: 18, rx: 9, class: 'pin-label' }, g);
  const text = el('text', { x: x + width / 2, y: y + 12.5, 'text-anchor': 'middle', class: 'pin-text' }, g);
  text.textContent = label;
  return { g, label: [g.children[2], g.children[3]] };
}

// Two stints at Shopify on a 2013–2026 strip under the Ottawa pin.
function buildYearStrip(layer) {
  const g = el('g', { class: 'year-strip' }, layer);
  const span = [2013, 2026.67], width = 150;
  const x = (year) => ((year - span[0]) / (span[1] - span[0])) * width - width / 2;
  el('rect', { x: -width / 2 - 8, y: 0, width: width + 16, height: 34, rx: 10, class: 'pin-label' }, g);
  el('rect', { x: -width / 2, y: 9, width, height: 6, rx: 3, class: 'year-track' }, g);
  const stints = [[2013.67, 2017.67], [2019.5, 2026.67]].map(([a, b]) => ({
    a, b, bar: el('rect', { x: x(a), y: 9, width: 0, height: 6, rx: 3, class: 'year-fill' }, g),
  }));
  for (const [year, anchor] of [[2013, 'start'], [2026, 'end']]) {
    const text = el('text', { x: anchor === 'start' ? -width / 2 : width / 2, y: 28, 'text-anchor': anchor, class: 'pin-text year-text' }, g);
    text.textContent = String(year);
  }
  const shopify = el('text', { x: 0, y: 28, 'text-anchor': 'middle', class: 'pin-text year-text' }, g);
  shopify.textContent = 'Shopify';
  return {
    g,
    fill(k) {
      const reached = lerp(span[0], span[1], k);
      for (const s of stints) s.bar.setAttribute('width', Math.max(0, x(Math.min(s.b, reached)) - x(s.a)).toFixed(2));
    },
  };
}

function arcCurve(a, b) {
  const lift = Math.hypot(b[0] - a[0], b[1] - a[1]) * 0.3;
  return [a, [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2 - lift], b];
}

function pointOnQuad([p0, p1, p2], k) {
  const u = 1 - k;
  return [u * u * p0[0] + 2 * u * k * p1[0] + k * k * p2[0], u * u * p0[1] + 2 * u * k * p1[1] + k * k * p2[1]];
}

// The first k of a quadratic curve (de Casteljau split).
function partialQuad([p0, p1, p2], k) {
  const mid = (a, b) => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k];
  const q0 = mid(p0, p1), end = mid(q0, mid(p1, p2));
  return `M${p0[0].toFixed(2)} ${p0[1].toFixed(2)}Q${q0[0].toFixed(2)} ${q0[1].toFixed(2)} ${end[0].toFixed(2)} ${end[1].toFixed(2)}`;
}
