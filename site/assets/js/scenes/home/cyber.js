// The digital side of the attack. Attack pass: red scans find a way into
// each public system (six in town A, one marker per other town), the
// markers wait, then the false alerts go out: bursts over every town,
// phone notifications over the houses, the town siren. Identification
// pass: amber scans find the same flaws first, the markers flip to fixed,
// and the attackers' later scans find nothing.

import { el, project } from '../../iso.js';
import { seeded } from '../../random.js';
import { ease, lerp, seg, window01 } from '../../timeline.js';
import { fixedCheck, flawPin } from '../furniture.js';

const CIVIC = ['utility', 'townHall', 'fireHall', 'police', 'water', 'siren'];
const OTHER_PLACES = ['B', 'C', 'D', 'E'];
const PHONES = 22;

export function cyberTrack(world, at) {
  const scans = el('g', { class: 'scans' }, world.layers.effects);
  const pins = el('g', { class: 'pins' }, world.layers.tags);
  const targets = [
    ...CIVIC.map((name, k) => ({ anchor: world.anchors[name], order: k })),
    ...OTHER_PLACES.map((id, k) => ({ anchor: world.anchors[`place-${id}`], order: k + 1, town: true })),
  ].map((target) => ({ ...target, ...buildMarker(pins, scans, target.anchor) }));

  const rand = seeded(311);
  const houses = world.buildings.filter((b) => b.place === 'A' && b.kind === 'house');
  const phones = Array.from({ length: PHONES }, (_, i) => {
    const b = houses[Math.floor(rand() * houses.length)];
    return { node: phoneBubble(pins), at: project(b.x, b.y, 14), order: i };
  });
  const siren = buildSiren(world.layers.effects, world.anchors.siren);
  let gates = { bursts: 0, siren: 0, burstsShown: false, sirenShown: false };

  function attackState(target, sigma) {
    const scanFrom = at('reconnaissance', 0.08 + target.order * 0.12);
    const scan = seg(sigma, scanFrom, scanFrom + 0.14);
    const shown = seg(sigma, scanFrom + 0.14, scanFrom + 0.19) * (1 - seg(sigma, at('gridlock', 0.4), at('gridlock', 0.8)));
    const size = lerp(1, 0.55, seg(sigma, at('waiting', 0.1), at('waiting', 0.5)));
    return { scan, scanClass: 'scan-attack', pin: shown, check: 0, size };
  }

  function identifiedState(target, sigma) {
    const auditFrom = at('reconnaissance', 0.04 + target.order * 0.08);
    const attackFrom = at('waiting', 0.08 + target.order * 0.08);
    const found = seg(sigma, auditFrom + 0.12, auditFrom + 0.16);
    const fixedFrom = at('reconnaissance', 0.72 + target.order * 0.035);
    const fixed = seg(sigma, fixedFrom, fixedFrom + 0.05);
    const fade = 1 - seg(sigma, at('weather', 0.05), at('weather', 0.3));
    const attackerScan = seg(sigma, attackFrom, attackFrom + 0.12);
    const auditing = sigma < attackFrom;
    return {
      scan: auditing ? seg(sigma, auditFrom, auditFrom + 0.12) : attackerScan,
      scanClass: auditing ? 'scan-audit' : 'scan-attack',
      pin: found * (1 - fixed),
      check: fixed * fade,
      size: 1,
    };
  }

  return {
    render(f) {
      const screen = f.scale * 0.9;
      for (const target of targets) {
        const s = f.identified ? identifiedState(target, f.sigma) : attackState(target, f.sigma);
        const scanning = s.scan > 0 && s.scan < 1;
        target.scan.style.display = scanning ? '' : 'none';
        if (scanning) {
          target.scan.setAttribute('class', `scan-line ${s.scanClass}`);
          const y = lerp(target.top[1] - 6, target.base[1] + 4, ease(s.scan));
          target.scan.setAttribute('transform', `translate(${target.top[0].toFixed(1)} ${y.toFixed(1)})`);
        }
        const pop = (v) => lerp(0.6, 1, ease(v));
        target.pin.style.opacity = s.pin.toFixed(3);
        target.pin.setAttribute('transform', `translate(${target.top[0].toFixed(1)} ${target.top[1].toFixed(1)}) scale(${(screen * s.size * pop(s.pin)).toFixed(2)})`);
        target.check.style.opacity = s.check.toFixed(3);
        target.check.setAttribute('transform', `translate(${target.top[0].toFixed(1)} ${target.top[1].toFixed(1)}) scale(${(screen * pop(s.check)).toFixed(2)})`);
        target.ringScale = screen;
      }
      const alerts = !f.identified;
      gates = {
        ...gates,
        bursts: alerts ? window01(f.sigma, at('false-alerts', 0.02), at('false-alerts', 0.62), 0.05) : 0,
        siren: alerts ? window01(f.sigma, at('false-alerts', 0.5), at('gridlock', 0.6), 0.04) : 0,
      };
      const phonesOut = 1 - seg(f.sigma, at('gridlock', 0.5), at('gridlock', 0.85));
      for (const phone of phones) {
        const v = alerts ? seg(f.sigma, at('false-alerts', 0.5 + phone.order * 0.018), at('false-alerts', 0.54 + phone.order * 0.018)) * phonesOut : 0;
        phone.node.style.opacity = v.toFixed(3);
        phone.node.setAttribute('transform', `translate(${phone.at[0].toFixed(1)} ${phone.at[1].toFixed(1)}) scale(${(screen * lerp(0.7, 1, ease(v))).toFixed(2)})`);
      }
      siren.scale = f.scale;
    },
    tick(f) {
      if (gates.bursts > 0 || gates.burstsShown) {
        gates.burstsShown = gates.bursts > 0;
        for (const target of targets) {
          const k = (f.now / 1400 + target.order * 0.17) % 1;
          target.ring.style.opacity = ((1 - k) * gates.bursts).toFixed(3);
          target.ring.setAttribute('transform', `translate(${target.top[0].toFixed(1)} ${target.top[1].toFixed(1)}) scale(${(target.ringScale * (0.6 + 2.6 * k)).toFixed(2)})`);
        }
      }
      if (!(gates.siren > 0 || gates.sirenShown)) return;
      gates.sirenShown = gates.siren > 0;
      siren.rings.forEach((ring, i) => {
        const k = (f.now / 1100 + i / siren.rings.length) % 1;
        ring.style.opacity = ((1 - k) * 0.9 * gates.siren).toFixed(3);
        ring.setAttribute('rx', (4 + k * 34).toFixed(1));
        ring.setAttribute('ry', (2 + k * 17).toFixed(1));
      });
    },
  };
}

function buildMarker(pins, scans, [x, y, z]) {
  const top = project(x, y, z);
  const base = project(x, y, 0);
  const scan = el('path', { d: 'M-20 0H20', class: 'scan-line' }, scans);
  const ring = el('ellipse', { rx: 8, ry: 4, class: 'alert-ring' }, pins);
  const pin = flawPin(pins);
  const check = fixedCheck(pins);
  return { top, base, scan, ring, pin, check, ringScale: 1 };
}

function phoneBubble(layer) {
  const g = el('g', { class: 'phone-alert' }, layer);
  el('rect', { x: -10, y: -15, width: 20, height: 12, rx: 3.5 }, g);
  el('path', { d: 'M-3 -3L0 1L3 -3Z' }, g);
  el('circle', { cx: -5.4, cy: -9, r: 1.9, class: 'phone-alert-dot' }, g);
  el('path', { d: 'M-2 -10.6H6M-2 -7.4H4', class: 'phone-alert-lines' }, g);
  return g;
}

function buildSiren(layer, [x, y, z]) {
  const [cx, cy] = project(x, y, z + 1);
  const rings = [0, 1, 2].map(() => el('ellipse', { cx: cx.toFixed(1), cy: cy.toFixed(1), rx: 4, ry: 2, class: 'siren-ring' }, layer));
  return { rings, scale: 1 };
}
