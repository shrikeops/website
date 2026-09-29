// reproduce: the report travels from the old test server to the owner beside the
// town hall. The owner replays its numbered steps: before the fix the
// replay gets in; after it, the replay is blocked, and the flaw's pin turns
// to a check (systems.js).

import { curvePoint, el, partialCurve, project } from '../../iso.js';
import { ease, lerp, seg, window01 } from '../../timeline.js';
import { buildTag, showSprite, spriteScale } from '../furniture.js';
import { cardCenter } from './systems.js';

// Where the owner stands: on the street along the town hall's east side.
const OWNER_FROM_HALL = [29, -1];
const STEPS = [0.3, 0.6, 0.9];
const BLOCKED_AT = 0.93;

export function replayTrack(world, at) {
  const layer = el('g', { class: 'replay' }, world.layers.tags);
  const path = el('path', { class: 'replay-path' }, layer);
  const stop = el('path', { d: 'M0 -6V6', class: 'replay-stop' }, layer);
  const steps = STEPS.map((_, i) => stepSprite(layer, i + 1));
  const owner = ownerSprite(layer);
  const report = reportSprite(layer);
  const getsIn = buildTag(layer, 'Gets in', 'result-tag result-tag--in');
  const blocked = buildTag(layer, 'Blocked', 'result-tag');
  const [hx, hy] = world.anchors.townHall;
  const feet = project(hx + OWNER_FROM_HALL[0], hy + OWNER_FROM_HALL[1]);
  const server = cardCenter(world, 'server');
  const target = [server[0] - 32, server[1] + 10];

  return {
    render(f) {
      const s = spriteScale(f);
      const shown = seg(f.t, at('reproduce'), at('reproduce', 0.06)) * (1 - seg(f.t, at('who', 0.1), at('who', 0.25)));
      showSprite(owner, shown, feet, s);
      const hand = [feet[0] + 14 * s, feet[1] - 10 * s];
      const trip = [server, [server[0] - 30, server[1] - 40], hand];
      const k = ease(seg(f.t, at('reproduce', 0.06), at('reproduce', 0.28)));
      const carried = seg(f.t, at('reproduce', 0.06), at('reproduce', 0.1)) * (1 - seg(f.t, at('keep-watching'), at('keep-watching', 0.1)));
      showSprite(report, carried, curvePoint(trip, k), s * lerp(1.4, 0.8, k));

      const curve = [[feet[0], feet[1] - 22 * s], [lerp(feet[0], target[0], 0.3), target[1] - 20], target];
      const first = seg(f.t, at('reproduce', 0.34), at('reproduce', 0.5));
      const second = seg(f.t, at('reproduce', 0.66), at('reproduce', 0.8)) * BLOCKED_AT;
      const inFirst = first > 0 && f.t < at('reproduce', 0.62);
      const inSecond = second > 0 && f.t < at('reproduce', 0.96);
      const drawn = inFirst ? first : inSecond ? second : 0;
      path.style.display = drawn > 0 ? '' : 'none';
      if (drawn > 0) path.setAttribute('d', partialCurve(curve, drawn));
      steps.forEach((step, i) => showSprite(step, drawn >= STEPS[i] ? 1 : 0, curvePoint(curve, STEPS[i]), s));
      const end = curvePoint(curve, BLOCKED_AT);
      stop.style.display = inSecond && second >= BLOCKED_AT ? '' : 'none';
      stop.setAttribute('transform', `translate(${end[0].toFixed(1)} ${end[1].toFixed(1)}) rotate(-35) scale(${s.toFixed(2)})`);
      showSprite(getsIn, window01(f.t, at('reproduce', 0.5), at('reproduce', 0.62), 0.02), [target[0] - 30 * s, target[1] - 16 * s], s);
      showSprite(blocked, window01(f.t, at('reproduce', 0.8), at('reproduce', 0.96), 0.02), [end[0] - 30 * s, end[1] - 16 * s], s);
    },
  };
}


function ownerSprite(layer) {
  const g = el('g', { class: 'owner' }, layer);
  el('ellipse', { cx: 0, cy: 0, rx: 6, ry: 2.4, class: 'owner-shadow' }, g);
  el('path', { d: 'M-5.5 0V-8.5C-5.5 -12.5 5.5 -12.5 5.5 -8.5V0Z', class: 'owner-body' }, g);
  el('circle', { cx: 0, cy: -16, r: 3.8, class: 'owner-head' }, g);
  buildTag(g, 'Owner', 'owner-tag').setAttribute('transform', 'translate(0 13)');
  return g;
}

function reportSprite(layer) {
  const g = el('g', { class: 'report' }, layer);
  el('rect', { x: -6, y: -7.5, width: 12, height: 15, rx: 1.2, class: 'report-paper' }, g);
  el('path', { d: 'M-3.5 -3.5h7M-3.5 0h7M-3.5 3.5h5', class: 'report-lines' }, g);
  return g;
}

function stepSprite(layer, n) {
  const g = el('g', { class: 'step' }, layer);
  el('circle', { r: 5.5 }, g);
  const text = el('text', { y: 2.6, 'text-anchor': 'middle' }, g);
  text.textContent = String(n);
  return g;
}
