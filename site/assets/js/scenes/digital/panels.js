// The public systems every organization in the region exposes, one small
// panel above each public building, tied to its roof by a thin stem. The
// town hall's panel is a deck: its five systems unfold from it in act 2
// (systems.js) and fold back into it at the end. The opening shows the
// panels faint (title); the attackers' sweep scans every one, town A first and
// then its neighbours, and pins the ones with a way in (compounds); the ending
// turns them amber as Meerkat Watch watches them (who). Seen from across
// the region, panels grow about their roof so they stay readable.

import { el, project } from '../../iso.js';
import { PLACES } from '../region/index.js';
import { seeded } from '../../random.js';
import { ease, lerp, seg } from '../../timeline.js';
import { flawPin, showSprite, spriteScale } from '../furniture.js';


const PANEL = { w: 22, h: 14 };
const DECK = { w: 30, h: 20 };
const STEM = 12;
const SCAN = 0.1;
const WAY_IN = 0.3;
const SPACING = 30;
const REGION_ZOOM = 1.1;
const MAX_GROWTH = 3;

// Public buildings region.js draws without a window record, by the anchor
// on their roof.
const UNRECORDED = ['fireHallRoof', 'waterTop'];
const RINGS = 2;

export function deckCenter(world) {
  const [hx, hy] = project(...world.anchors.townHallRoof);
  return [hx, hy - STEM - DECK.h / 2];
}

export function panelsTrack(world, at) {
  const rand = seeded(907);
  const layer = el('g', { class: 'public-panels' }, world.layers.tags);
  const marks = el('g', {}, world.layers.tags);
  const deck = { roof: project(...world.anchors.townHallRoof), place: 'A', distance: 0, deck: true };
  const panels = [deck, ...publicBuildings(world)]
    .sort((a, b) => a.roof[1] - b.roof[1])
    .map((target) => {
      const jitter = rand();
      const scanFrom = target.place === 'A'
        ? at('compounds', 0.2 + jitter * 0.06)
        : at('compounds', Math.min(0.72, 0.42 + seg(target.distance, 500, 1100) * 0.26 + jitter * 0.04));
      return {
        ...target,
        ...buildPanel(layer, marks, target),
        scanFrom,
        wayIn: target.deck || rand() < WAY_IN,
        watchFrom: at('who', 0.25 + seg(target.distance, 0, 1100) * 0.38 + jitter * 0.04),
      };
    });
  const sweeps = buildSweeps(world, panels, el('g', { class: 'sweeps' }, world.layers.effects));

  return {
    render(f) {
      const s = spriteScale(f);
      const grow = Math.min(MAX_GROWTH, Math.max(1, f.scale / REGION_ZOOM));
      const pinsLeave = 1 - seg(f.t, at('beyond-the-website'), at('beyond-the-website', 0.2));
      const deckShown = Math.max(1 - seg(f.t, at('beyond-the-website', 0.25), at('beyond-the-website', 0.42)), seg(f.t, at('who', 0.15), at('who', 0.25)));
      for (const p of panels) {
        const scan = seg(f.t, p.scanFrom, p.scanFrom + SCAN);
        const scanning = scan > 0 && scan < 1;
        const watched = seg(f.t, p.watchFrom, p.watchFrom + 0.06);
        const faint = f.t < at('beyond-the-website') ? 0.6 : 0.45;
        const shown = p.deck ? deckShown * lerp(0.7, 1, watched) : lerp(faint, 1, watched);
        p.g.style.display = shown > 0.01 ? '' : 'none';
        p.g.style.opacity = shown.toFixed(3);
        p.g.setAttribute('transform', `translate(${p.roof[0].toFixed(1)} ${p.roof[1].toFixed(1)}) scale(${grow.toFixed(3)})`);
        p.g.classList.toggle('is-attacked', scanning);
        p.g.classList.toggle('is-watched', watched > 0.5);
        p.scan.style.display = scanning ? '' : 'none';
        if (scanning) p.scan.setAttribute('y', (p.top + lerp(0, p.size.h - 3, ease(scan))).toFixed(1));
        const pin = p.wayIn ? seg(f.t, p.scanFrom + SCAN * 0.7, p.scanFrom + SCAN) * pinsLeave : 0;
        showSprite(p.pin, pin, [p.roof[0] + (p.size.w / 2) * grow, p.roof[1] + p.top * grow], s, true);
      }
      for (const sweep of sweeps) renderSweep(sweep, f.t);
    },
  };
}

// Panels are too small to read from across the region, so each town's scan
// also shows as red rings sweeping out over it while its panels are scanned.
// A town's ground is a square of half-size place.size, which projects to a
// diamond twice as wide as it is tall.
function buildSweeps(world, panels, layer) {
  return PLACES.map((place) => {
    const own = panels.filter((p) => p.place === place.id);
    const centre = project(place.x, place.y);
    const reach = place.size * 2.3;
    return {
      centre, reach,
      from: Math.min(...own.map((p) => p.scanFrom)),
      to: Math.max(...own.map((p) => p.scanFrom)) + SCAN,
      rings: Array.from({ length: RINGS }, () => el('ellipse', { cx: centre[0].toFixed(1), cy: centre[1].toFixed(1), class: 'sweep-ring' }, layer)),
    };
  });
}

function renderSweep(sweep, t) {
  const u = seg(t, sweep.from, sweep.to);
  sweep.rings.forEach((ring, i) => {
    const k = seg(u, i * 0.3, i * 0.3 + 0.7);
    ring.style.display = k > 0 && k < 1 ? '' : 'none';
    if (!(k > 0 && k < 1)) return;
    ring.setAttribute('rx', (sweep.reach * k).toFixed(1));
    ring.setAttribute('ry', (sweep.reach * k * 0.5).toFixed(1));
    ring.style.opacity = (1 - k).toFixed(3);
  });
}

// Every recorded building except houses and the town hall (which has the
// deck), plus the unrecorded public buildings, thinned so no two panels sit
// on top of each other.
function publicBuildings(world) {
  const candidates = [
    ...world.buildings.filter((b) => b.kind !== 'house' && b.role !== 'town-hall').map((b) => ({ x: b.x, y: b.y, top: b.top, place: b.place })),
    ...UNRECORDED.map((name) => { const [x, y, top] = world.anchors[name]; return { x, y, top, place: 'A' }; }),
  ];
  const kept = [];
  for (const c of candidates) {
    if (kept.some((k) => Math.hypot(k.x - c.x, k.y - c.y) < SPACING)) continue;
    kept.push(c);
  }
  return kept.map((c) => ({ roof: project(c.x, c.y, c.top), place: c.place, distance: Math.hypot(c.x, c.y), deck: false }));
}

// Drawn about the roof point, so the whole panel and its stem can grow.
function buildPanel(layer, marks, { deck }) {
  const size = deck ? DECK : PANEL;
  const top = -STEM - size.h;
  const g = el('g', { class: deck ? 'panel panel--deck' : 'panel' }, layer);
  el('path', { d: `M0 0V${-STEM}`, class: 'panel-stem' }, g);
  const card = (dx, dy) => el('rect', { x: -size.w / 2 + dx, y: top + dy, width: size.w, height: size.h, rx: 2, class: 'panel-frame' }, g);
  if (deck) { card(5, -5); card(2.5, -2.5); }
  card(0, 0);
  el('path', { d: `M${-size.w / 2} ${top + 3.5}H${size.w / 2}`, class: 'panel-rule' }, g);
  el('path', { d: `M${-size.w / 2 + 3} ${top + 7}h${size.w * 0.55}M${-size.w / 2 + 3} ${top + 10.5}h${size.w * 0.35}`, class: 'panel-lines' }, g);
  const scan = el('rect', { x: -size.w / 2, y: top, width: size.w, height: 3, class: 'panel-scan' }, g);
  return { g, scan, size, top, pin: flawPin(marks) };
}
