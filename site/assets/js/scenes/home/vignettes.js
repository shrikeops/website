// Act 1 illustrations, set in the same region before the scenario starts.
// drones: a small drone sets a parked airliner alight; thousands against
// millions. ai: an AI scan finds a flaw in the town's website for $10.

import { el, project } from '../../iso.js';
import { ease, lerp, seg, window01 } from '../../timeline.js';
import { buildTag, droneSprite } from '../furniture.js';

export function vignettesTrack(world, at) {
  const layer = el('g', { class: 'vignettes' }, world.layers.tags);
  const airport = buildAirport(layer, world.anchors.airliner);
  const website = buildWebsite(layer, world.anchors.townHall);

  return {
    render(f) {
      renderAirport(airport, f, at);
      renderWebsite(website, f, at);
    },
    tick(f) {
      if (airport.visible) {
        const spin = Math.sin(f.now / 30);
        for (const r of airport.drone.rotors) r.setAttribute('rx', (4.4 * (0.75 + 0.25 * spin)).toFixed(2));
        const flicker = 1 + 0.1 * Math.sin(f.now / 80);
        airport.flameInner.setAttribute('transform', `scale(${(2 - flicker).toFixed(3)} ${flicker.toFixed(3)})`);
      }
    },
  };
}

function buildAirport(layer, [x, y]) {
  const g = el('g', { class: 'vignette' }, layer);
  const drone = droneSprite(g);
  const flame = el('g', { class: 'fire' }, g);
  el('ellipse', { cx: 0, cy: 0, rx: 10, ry: 5, class: 'fire-glow' }, flame);
  const flameInner = el('g', {}, flame);
  el('path', { d: 'M0 0C-5 -1-6 -7-1.5 -13C-1 -9 2 -9 2 -12C6 -7 5 -1 0 0Z', class: 'flame-outer' }, flameInner);
  el('path', { d: 'M0 0C-3 -1-3 -4-0.8 -8C0 -6 1.5 -6 1.5 -7.5C3.6 -4.5 3 -1 0 0Z', class: 'flame-inner' }, flameInner);
  const droneTag = buildTag(g, '$1,000s', 'price-tag');
  const planeTag = buildTag(g, '$1,000,000s', 'price-tag');
  return { g, drone, flame, flameInner, droneTag, planeTag, plane: [x, y], visible: false };
}

function renderAirport(v, f, at) {
  const shown = window01(f.t, at('drones', 0.08), at('drones', 0.98), 0.08);
  v.visible = shown > 0;
  v.g.style.display = v.visible ? '' : 'none';
  if (!v.visible) return;
  v.g.style.opacity = shown.toFixed(3);
  const u = ease(seg(f.t, at('drones', 0.12), at('drones', 0.55)));
  const [px, py] = v.plane;
  const x = lerp(px - 75, px + 4, u), y = lerp(py + 43, py - 2, u);
  const z = lerp(4, 16, Math.min(1, u * 2.5)) + Math.sin(u * Math.PI) * 18;
  const [sx, sy] = project(x, y, z);
  v.drone.g.setAttribute('transform', `translate(${sx.toFixed(1)} ${sy.toFixed(1)})`);
  const burn = ease(seg(f.t, at('drones', 0.55), at('drones', 0.72)));
  const [fx, fy] = project(px + 4, py, 6.2);
  v.flame.style.opacity = burn.toFixed(3);
  v.flame.setAttribute('transform', `translate(${fx.toFixed(1)} ${fy.toFixed(1)}) scale(${lerp(0.3, 1, burn).toFixed(2)})`);
  v.drone.g.style.opacity = (1 - seg(f.t, at('drones', 0.6), at('drones', 0.7))).toFixed(3);
  const tagScale = f.scale * 0.95;
  v.droneTag.style.opacity = seg(f.t, at('drones', 0.22), at('drones', 0.3)).toFixed(3);
  v.droneTag.setAttribute('transform', `translate(${(sx + 30 * tagScale).toFixed(1)} ${(sy - 10 * tagScale).toFixed(1)}) scale(${tagScale.toFixed(2)})`);
  const [tx, ty] = project(px - 20, py, 30);
  v.planeTag.style.opacity = seg(f.t, at('drones', 0.6), at('drones', 0.68)).toFixed(3);
  v.planeTag.setAttribute('transform', `translate(${(tx - 24 * tagScale).toFixed(1)} ${ty.toFixed(1)}) scale(${tagScale.toFixed(2)})`);
}

function buildWebsite(layer, [x, y, z]) {
  const [ax, ay] = project(x, y, z);
  const g = el('g', { class: 'vignette browser', transform: `translate(${ax.toFixed(1)} ${(ay - 44).toFixed(1)})` }, layer);
  el('path', { d: 'M0 29V44', class: 'browser-stem' }, g);
  el('rect', { x: -45, y: -29, width: 90, height: 58, rx: 5, class: 'browser-frame' }, g);
  el('path', { d: 'M-45 -20H45', class: 'browser-rule' }, g);
  for (const dx of [-39, -34, -29]) el('circle', { cx: dx, cy: -24.5, r: 1.4, class: 'browser-dot' }, g);
  const widths = [62, 48, 70, 54, 40, 60];
  const lines = widths.map((w, i) => el('rect', { x: -37, y: -14 + i * 6.8, width: w, height: 2.6, rx: 1.3, class: 'browser-line' }, g));
  const clip = el('clipPath', { id: 'browser-clip' }, g);
  el('rect', { x: -45, y: -20, width: 90, height: 49 }, clip);
  const scan = el('rect', { x: -45, y: -20, width: 90, height: 7, class: 'browser-scan', 'clip-path': 'url(#browser-clip)' }, g);
  const tag = buildTag(g, '$10', 'price-tag');
  tag.setAttribute('transform', 'translate(40 -34)');
  return { g, lines, flawed: lines[3], scan, tag };
}

function renderWebsite(v, f, at) {
  const shown = window01(f.t, at('ai', 0.08), at('ai', 0.96), 0.1);
  v.g.style.display = shown > 0 ? '' : 'none';
  if (!shown) return;
  v.g.style.opacity = shown.toFixed(3);
  const scan = seg(f.t, at('ai', 0.22), at('ai', 0.62));
  v.scan.style.opacity = (scan > 0 && scan < 1 ? 1 : 0).toFixed(0);
  v.scan.setAttribute('y', lerp(-22, 26, scan).toFixed(1));
  v.flawed.classList.toggle('is-flaw', f.t > at('ai', 0.45));
  v.tag.style.opacity = seg(f.t, at('ai', 0.55), at('ai', 0.62)).toFixed(3);
}
