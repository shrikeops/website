// radar: a radar beside the airport sends out pulses, and a red locator mark
// closes in on it. No strike on screen.

import { box, el, project } from '../../iso.js';
import { ease, lerp, seg, window01 } from '../../timeline.js';
import { AIRFIELD } from '../region/index.js';
import { showSprite, spriteScale } from '../furniture.js';

const MAST = 12;
const PULSES = 3;

export function radarTrack(world, at) {
  const [x, y] = [AIRFIELD.x - 70, AIRFIELD.y - 20];
  const top = project(x, y, MAST + 3);
  const g = el('g', { class: 'radar' }, world.layers.tags);
  box(g, { x: x - 1.5, y: y - 1.5, w: 3, h: MAST, d: 3, mat: 'metal' });
  const dish = el('g', { transform: `translate(${top[0].toFixed(1)} ${top[1].toFixed(1)})` }, g);
  const face = el('ellipse', { cx: 0, cy: 0, rx: 5, ry: 3, class: 'radar-dish' }, dish);
  const pulses = Array.from({ length: PULSES }, () => el('ellipse', { cx: top[0].toFixed(1), cy: top[1].toFixed(1), class: 'radar-pulse' }, world.layers.effects));
  const locator = el('g', { class: 'locator' }, world.layers.tags);
  el('circle', { r: 8, class: 'locator-mark' }, locator);
  el('path', { d: 'M-13 0H-4M4 0H13M0 -13V-4M0 4V13', class: 'locator-mark' }, locator);
  const closing = [0, 1].map(() => el('circle', { class: 'locator-ring' }, locator));
  let level = 0;

  return {
    render(f) {
      level = window01(f.t, at('radar', 0.02), at('microphone', 0.12), 0.1);
      g.style.display = level > 0 ? '' : 'none';
      g.style.opacity = level.toFixed(3);
      const lock = ease(seg(f.t, at('radar', 0.25), at('radar', 0.8)));
      const mark = seg(f.t, at('radar', 0.22), at('radar', 0.32)) * level;
      showSprite(locator, mark, top, spriteScale(f, 1.2));
      closing.forEach((ring, i) => ring.setAttribute('r', lerp(70 + i * 30, 10 + i * 5, lock).toFixed(1)));
    },
    tick(f) {
      face.setAttribute('rx', (5 * Math.abs(Math.cos(f.now / 700)) + 1).toFixed(2));
      pulses.forEach((pulse, i) => {
        const k = (f.now / 1400 + i / PULSES) % 1;
        pulse.setAttribute('rx', (k * 150 * 1.41).toFixed(1));
        pulse.setAttribute('ry', (k * 150 * 0.71).toFixed(1));
        pulse.style.opacity = ((1 - k) * level).toFixed(3);
      });
    },
  };
}
