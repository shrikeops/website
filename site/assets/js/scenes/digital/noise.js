// proof: the output of automated scanners, a swarm of grey dots (possible
// problems) around the systems in scope. It falls away, and only the proven
// flaw (systems.js) is left.

import { el } from '../../iso.js';
import { seeded } from '../../random.js';
import { ease, lerp, seg, window01 } from '../../timeline.js';
import { buildTag, showSprite, spriteScale } from '../furniture.js';
import { SYSTEMS, cardCenter } from './systems.js';

const PER_CARD = 14;

export function noiseTrack(world, at) {
  const rand = seeded(733);
  const layer = el('g', { class: 'noise' }, world.layers.tags);
  const dots = SYSTEMS.filter((s) => !s.outOfScope).flatMap((system) => {
    const [cx, cy] = cardCenter(world, system.id);
    return Array.from({ length: PER_CARD }, (_, i) => ({
      node: el('circle', { r: 3, class: 'noise-dot' }, layer),
      cx, cy,
      angle: (i / PER_CARD) * Math.PI * 2 + rand() * 0.4,
      rx: 38 + rand() * 14,
      ry: 26 + rand() * 10,
      arrive: 0.04 + rand() * 0.3,
      fall: 0.46 + rand() * 0.14,
    }));
  });
  const label = buildTag(world.layers.tags, 'Possible problems', 'noise-tag');
  const labelAt = cardCenter(world, 'login');

  return {
    render(f) {
      const swirl = 0.9 * seg(f.t, at('proof'), at('proof', 1));
      for (const dot of dots) {
        const shown = seg(f.t, at('proof', dot.arrive), at('proof', dot.arrive + 0.06));
        const fall = ease(seg(f.t, at('proof', dot.fall), at('proof', dot.fall + 0.24)));
        const v = shown * (1 - fall);
        dot.node.style.display = v > 0 ? '' : 'none';
        if (!(v > 0)) continue;
        const a = dot.angle + swirl;
        dot.node.setAttribute('cx', (dot.cx + Math.cos(a) * dot.rx).toFixed(1));
        dot.node.setAttribute('cy', (dot.cy + Math.sin(a) * dot.ry + 150 * fall * fall).toFixed(1));
        dot.node.setAttribute('r', lerp(1, 3, ease(shown)).toFixed(2));
        dot.node.style.opacity = v.toFixed(3);
      }
      const tag = window01(f.t, at('proof', 0.14), at('proof', 0.5), 0.04);
      const s = spriteScale(f);
      showSprite(label, tag, [labelAt[0], labelAt[1] - 38 - 10 * s], s);
    },
  };
}
