// The town hall's public systems as five cards, which unfold from its deck
// (beyond-the-website). Meerkat Watch's work plays out on them: the signed scope turns
// the tested cards amber and leaves the one outside it grey (permission); the
// proven flaw on the old test server (proof) is fixed and checked (reproduce); and
// in the weeks after, new flaws appear as the systems and Meerkat Watch
// change, and each is reported and fixed (keep-watching). At the end the cards fold
// back into the deck (who).

import { el, project } from '../../iso.js';
import { ease, lerp, seg, window01 } from '../../timeline.js';
import { buildTag, fixedCheck, flawPin, showSprite, spriteScale } from '../furniture.js';
import { deckCenter } from './panels.js';

const CARD = { w: 64, h: 40 };
const LABEL_FONT = 8;

// Offsets are from the point above the town hall where the stems meet.
export const SYSTEMS = [
  { id: 'website', label: 'Website', offset: [-128, -58], draw: drawWebsite },
  { id: 'login', label: 'Staff login', offset: [-76, -124], draw: drawLogin },
  { id: 'files', label: 'File share', offset: [0, -158], draw: drawFiles, outOfScope: true },
  { id: 'remote', label: 'Remote access', offset: [76, -124], draw: drawRemote },
  { id: 'server', label: 'Old test server', offset: [128, -58], draw: drawServer },
];

// A finding's cause tag sits above or below its card, shifted clear of the
// neighbouring cards' labels.
const FINDINGS = [
  { card: 'server', found: ['proof', 0.55], fixed: ['reproduce', 0.84], clear: ['keep-watching', 0.1] },
  { card: 'website', cause: 'Plugin update', tagAt: [-16, 'above'], found: ['keep-watching', 0.16], fixed: ['keep-watching', 0.25], clear: ['keep-watching', 0.32] },
  { card: 'login', cause: 'Staff change', tagAt: [0, 'above'], found: ['keep-watching', 0.36], fixed: ['keep-watching', 0.45], clear: ['keep-watching', 0.52] },
  { card: 'remote', cause: 'New flaw published', tagAt: [16, 'above'], found: ['keep-watching', 0.56], fixed: ['keep-watching', 0.65], clear: ['keep-watching', 0.72] },
  { card: 'server', cause: 'Meerkat Watch improved', tagAt: [-24, 'below'], found: ['keep-watching', 0.76], fixed: ['keep-watching', 0.85], clear: ['keep-watching', 0.92], watch: true },
];

export function hub(world) {
  return project(...world.anchors.townHallRoof);
}

export function cardCenter(world, id) {
  const [hx, hy] = hub(world);
  const [dx, dy] = SYSTEMS.find((s) => s.id === id).offset;
  return [hx + dx, hy + dy];
}

export function systemsTrack(world, at) {
  const [hx, hy] = hub(world);
  const deck = deckCenter(world);
  const layer = el('g', { class: 'systems' }, world.layers.tags);
  const stems = el('g', {}, layer);
  const scope = buildScope(layer, [hx, hy - 64]);
  const cardLayer = el('g', {}, layer);
  const tags = el('g', {}, layer);
  const marks = el('g', {}, layer);
  let inScope = 0;
  const cards = SYSTEMS.map((system, k) => ({
    ...system,
    k,
    outOfScope: Boolean(system.outOfScope),
    order: system.outOfScope ? -1 : inScope++,
    center: cardCenter(world, system.id),
    stem: el('path', { class: 'sys-stem' }, stems),
    ...buildCard(cardLayer, system),
  }));
  const byId = Object.fromEntries(cards.map((c) => [c.id, c]));
  const findings = FINDINGS.map((finding) => ({
    ...finding,
    pin: flawPin(marks),
    check: fixedCheck(marks),
    tag: finding.cause ? buildTag(tags, finding.cause, finding.watch ? 'cause-tag cause-tag--watch' : 'cause-tag') : null,
  }));
  const proof = buildTag(tags, 'Proven: can be used', 'proof-tag');

  const scopeAt = (card) => at('permission', card.outOfScope ? 0.52 : 0.3 + card.order * 0.05);

  function scanBand(card, t) {
    if (card.outOfScope) return -1;
    const tested = seg(t, at('permission', 0.58 + card.order * 0.03), at('permission', 0.92 + card.order * 0.02)) * 2;
    if (tested > 0 && tested < 2) return tested % 1;
    const weekly = seg(t, at('keep-watching', 0.04), at('keep-watching', 0.96));
    if (weekly > 0 && weekly < 1) return (weekly * 12 + card.order * 0.2) % 1;
    return -1;
  }

  return {
    render(f) {
      const s = spriteScale(f);
      for (const card of cards) {
        const unfold = ease(seg(f.t, at('beyond-the-website', 0.25 + card.k * 0.06), at('beyond-the-website', 0.5 + card.k * 0.06)));
        const u = unfold * (1 - ease(seg(f.t, at('who', 0.02), at('who', 0.2))));
        const x = lerp(deck[0], card.center[0], u), y = lerp(deck[1], card.center[1], u);
        const scale = lerp(0.35, 1, u);
        card.g.style.display = card.stem.style.display = u > 0 ? '' : 'none';
        card.g.style.opacity = seg(u, 0, 0.2).toFixed(3);
        card.g.setAttribute('transform', `translate(${x.toFixed(1)} ${y.toFixed(1)}) scale(${scale.toFixed(3)})`);
        card.stem.setAttribute('d', `M${x.toFixed(1)} ${(y + (CARD.h / 2) * scale).toFixed(1)}L${hx.toFixed(1)} ${hy.toFixed(1)}`);
        card.labels.style.opacity = (seg(f.t, at('beyond-the-website', 0.6 + card.k * 0.05), at('beyond-the-website', 0.7 + card.k * 0.05)) * seg(u, 0.8, 1)).toFixed(3);
        const scoped = f.t >= scopeAt(card);
        card.g.classList.toggle('is-scope', scoped && !card.outOfScope);
        card.g.classList.toggle('is-out', scoped && card.outOfScope);
        card.stem.classList.toggle('is-out', scoped && card.outOfScope);
        card.note?.classList.toggle('is-on', scoped);
        const band = scanBand(card, f.t);
        card.scan.style.display = band >= 0 ? '' : 'none';
        if (band >= 0) card.scan.setAttribute('y', lerp(-CARD.h / 2, CARD.h / 2 - 5, band).toFixed(1));
        card.flaw = false;
      }
      renderScope(scope, cards, f.t, at, scopeAt);
      for (const finding of findings) {
        const card = byId[finding.card];
        const found = at(...finding.found), fixed = at(...finding.fixed), clear = at(...finding.clear);
        const pin = seg(f.t, found, found + 0.02) * (1 - seg(f.t, fixed, fixed + 0.02));
        const check = seg(f.t, fixed, fixed + 0.02) * (1 - seg(f.t, clear, clear + 0.03));
        const [cx, cy] = [card.center[0] + CARD.w / 2 - 2, card.center[1] - CARD.h / 2 - 1];
        showSprite(finding.pin, pin, [cx, cy], s, true);
        showSprite(finding.check, check, [cx, cy], s, true);
        if (pin > 0.5) card.flaw = true;
        if (finding.tag) {
          const [dx, side] = finding.tagAt;
          const y = side === 'above' ? card.center[1] - CARD.h / 2 - 12 * s : belowLabel(card.center, s);
          showSprite(finding.tag, window01(f.t, found - 0.03, clear, 0.02), [card.center[0] + dx, y], s);
        }
      }
      for (const card of cards) card.g.classList.toggle('is-flaw', card.flaw);
      const server = byId.server.center;
      showSprite(proof, window01(f.t, at('proof', 0.66), at('reproduce', 0.3), 0.03), [server[0], belowLabel(server, s)], s);
    },
  };
}

function belowLabel([, cy], s) {
  return cy + CARD.h / 2 + 18 + 9 * s;
}


function buildCard(layer, system) {
  const { w, h } = CARD;
  const g = el('g', { class: 'sys' }, layer);
  el('rect', { x: -w / 2, y: -h / 2, width: w, height: h, rx: 4, class: 'sys-frame' }, g);
  el('path', { d: `M${-w / 2} ${-h / 2 + 7}H${w / 2}`, class: 'sys-rule' }, g);
  for (const dx of [-27, -23, -19]) el('circle', { cx: dx, cy: -h / 2 + 3.6, r: 1.1, class: 'sys-dot' }, g);
  system.draw(el('g', { class: 'sys-art' }, g));
  const scan = el('rect', { x: -w / 2, y: -h / 2, width: w, height: 5, class: 'sys-scan' }, g);
  const labels = el('g', {}, g);
  labelPill(labels, system.label, h / 2 + 10, 'sys-label');
  const note = system.outOfScope ? labelPill(labels, 'Out of scope', h / 2 + 22, 'sys-note') : null;
  return { g, scan, labels, note };
}

// A label on a paper pill, sized from the monospaced font's 0.6 em advance.
function labelPill(layer, text, y, cls) {
  const g = el('g', { class: cls }, layer);
  const width = text.length * LABEL_FONT * 0.6 + 8;
  el('rect', { x: -width / 2, y: y - 6.5, width, height: 12, rx: 6 }, g);
  const label = el('text', { x: 0, y: y + 2.8, 'text-anchor': 'middle' }, g);
  label.textContent = text;
  return g;
}

function drawWebsite(g) {
  el('path', { d: 'M-26 -7.5h36M-26 -3h24', class: 'sys-text' }, g);
  for (const x of [-26, -14, -2]) el('rect', { x, y: 2, width: 9, height: 9, rx: 1.5, class: 'sys-plugin' }, g);
}

function drawLogin(g) {
  el('rect', { x: -20, y: -9, width: 40, height: 6, rx: 1.5, class: 'sys-field' }, g);
  el('rect', { x: -20, y: -1, width: 40, height: 6, rx: 1.5, class: 'sys-field' }, g);
  el('rect', { x: -9, y: 8, width: 18, height: 6, rx: 3, class: 'sys-button' }, g);
}

function drawFiles(g) {
  for (const x of [-24, -6, 12]) el('path', { d: `M${x} -6h5l2 2.5h7v13h-14z`, class: 'sys-folder' }, g);
}

function drawRemote(g) {
  el('rect', { x: -26, y: -10, width: 52, height: 25, rx: 2, class: 'sys-terminal' }, g);
  el('path', { d: 'M-22 -5l3 2.5-3 2.5M-15 0h10M-22 7h24', class: 'sys-terminal-text' }, g);
}

function drawServer(g) {
  for (const y of [-10, -2, 6]) {
    el('rect', { x: -22, y, width: 44, height: 6, rx: 1, class: 'sys-rack' }, g);
    el('circle', { cx: 17, cy: y + 3, r: 1.1, class: 'sys-led' }, g);
  }
}

// The signed scope: one row per system, ticked or crossed as each card
// takes its colour.
function buildScope(layer, [x, y]) {
  const g = el('g', { class: 'scope-doc' }, layer);
  el('rect', { x: -16, y: -21, width: 32, height: 42, rx: 2, class: 'scope-paper' }, g);
  const title = el('text', { x: -12, y: -13.5, class: 'scope-title' }, g);
  title.textContent = 'SCOPE';
  const marks = SYSTEMS.map((system, i) => {
    const row = -8 + i * 5.2;
    el('rect', { x: -12, y: row - 1.8, width: 3.4, height: 3.4, rx: 0.6, class: 'scope-box' }, g);
    el('path', { d: `M-6 ${row}h${system.outOfScope ? 12 : 16}`, class: 'scope-line' }, g);
    const d = system.outOfScope ? `M-11.6 ${row - 1.4}l2.6 2.6m0 -2.6l-2.6 2.6` : `M-11.8 ${row}l1 1.1 2 -2.4`;
    return el('path', { d, class: system.outOfScope ? 'scope-cross' : 'scope-tick' }, g);
  });
  el('path', { d: 'M-11 16c2.5 -4 4.5 2 7 -1.5s4 2 6.5 -1.5 3 1.5 5.5 0', class: 'scope-sign' }, g);
  return { g, marks, x, y };
}

function renderScope(scope, cards, t, at, scopeAt) {
  const arrive = ease(seg(t, at('permission', 0.05), at('permission', 0.25)));
  const shown = arrive * (1 - seg(t, at('proof'), at('proof', 0.12)));
  scope.g.style.display = shown > 0 ? '' : 'none';
  if (!(shown > 0)) return;
  scope.g.style.opacity = shown.toFixed(3);
  scope.g.setAttribute('transform', `translate(${scope.x.toFixed(1)} ${(scope.y - 50 * (1 - arrive)).toFixed(1)})`);
  cards.forEach((card, i) => { scope.marks[i].style.opacity = t >= scopeAt(card) ? '1' : '0'; });
}
