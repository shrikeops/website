// The incendiary fires along the forest edge. Attack pass: they grow while
// crews are tied up and smoke drifts over the town. Identification pass:
// they still ignite, then shrink once the fire trucks reach them.

import { el, project } from '../../iso.js';
import { ease, seg } from '../../timeline.js';
import { FIRE_POINTS } from './props.js';

const PUFFS = 4;

export function firesTrack(world, at) {
  const layer = el('g', { class: 'fires' }, world.layers.effects);
  const fires = FIRE_POINTS.map(([x, y], k) => {
    const [sx, sy] = project(x, y, 0);
    const g = el('g', { class: 'fire' }, layer);
    el('ellipse', { cx: 0, cy: 0, rx: 16, ry: 8, class: 'fire-glow' }, g);
    const flames = el('g', {}, g);
    el('path', { d: 'M0 0C-7 -1-8 -9-2 -18C-1 -12 3 -12 3 -16C8 -9 7 -1 0 0Z', class: 'flame-outer' }, flames);
    el('path', { d: 'M0 0C-4 -1-4 -6-1 -11C0 -8 2 -8 2 -10C5 -6 4 -1 0 0Z', class: 'flame-inner' }, flames);
    const puffs = Array.from({ length: PUFFS }, (_, i) => ({ node: el('circle', { class: 'smoke' }, layer), phase: i / PUFFS + k * 0.13 }));
    return { x, y, g, flames, puffs, order: k, at: [sx, sy], intensity: 0 };
  });

  function intensity(fire, f) {
    const k = fire.order;
    if (!f.identified) return ease(seg(f.sigma, at('fires', 0.08 + k * 0.07), at('fires', 0.55 + k * 0.05)));
    const grow = ease(seg(f.sigma, at('fires', 0.05 + k * 0.04), at('fires', 0.4 + k * 0.03))) * 0.6;
    const out = 1 - ease(seg(f.sigma, at('fires', 0.55), at('fires', 0.92)));
    return grow * out;
  }

  return {
    render(f) {
      for (const fire of fires) {
        fire.intensity = intensity(fire, f);
        fire.g.style.display = fire.intensity > 0.01 ? '' : 'none';
        fire.g.setAttribute('transform', `translate(${fire.at[0].toFixed(1)} ${fire.at[1].toFixed(1)}) scale(${(0.4 + fire.intensity * 1.1).toFixed(2)})`);
        fire.g.style.opacity = Math.min(1, fire.intensity * 3).toFixed(3);
        if (fire.intensity <= 0.01) for (const puff of fire.puffs) puff.node.style.opacity = '0';
      }
    },
    tick(f) {
      for (const fire of fires) {
        if (fire.intensity <= 0.01) continue;
        const flicker = 1 + 0.09 * Math.sin(f.now / 90 + fire.order * 2) + 0.05 * Math.sin(f.now / 37 + fire.order);
        fire.flames.setAttribute('transform', `scale(${(2 - flicker).toFixed(3)} ${flicker.toFixed(3)})`);
        for (const puff of fire.puffs) {
          const k = (f.now / 5200 + puff.phase) % 1;
          const [px, py] = project(fire.x + k * 70, fire.y - k * 12, 14 + k * 60);
          puff.node.setAttribute('cx', px.toFixed(1));
          puff.node.setAttribute('cy', py.toFixed(1));
          puff.node.setAttribute('r', (5 + k * 16).toFixed(1));
          puff.node.style.opacity = ((1 - k) * 0.5 * fire.intensity).toFixed(3);
        }
      }
    },
  };
}
