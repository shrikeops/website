// cheap-flaws: what finding a flaw costs, as price tags that float up beside the
// town hall's deck in the order the copy gives them.

import { el } from '../../iso.js';
import { ease, lerp, seg } from '../../timeline.js';
import { buildTag, showSprite, spriteScale } from '../furniture.js';
import { deckCenter } from './panels.js';

const COSTS = [
  { price: '$1,000', caption: '21 flaws, FFmpeg', from: 0.12 },
  { price: '$20', caption: 'per flaw, WordPress plugins', from: 0.32 },
  { price: 'under $10', caption: 'one flaw, our testing', from: 0.52 },
];

export function costsTrack(world, at) {
  const layer = el('g', { class: 'costs' }, world.layers.tags);
  const deck = deckCenter(world);
  const tags = COSTS.map((cost) => {
    const g = el('g', { class: 'cost' }, layer);
    buildTag(g, cost.price, 'price-tag');
    const caption = el('text', { x: 0, y: 17, 'text-anchor': 'middle', class: 'cost-caption' }, g);
    caption.textContent = cost.caption;
    return { ...cost, g };
  });

  return {
    render(f) {
      const s = spriteScale(f);
      const leave = 1 - seg(f.t, at('cheap-flaws', 0.9), at('ai-at-scale', 0.1));
      tags.forEach((tag, i) => {
        const arrive = ease(seg(f.t, at('cheap-flaws', tag.from), at('cheap-flaws', tag.from + 0.1)));
        const v = arrive * leave;
        const y = deck[1] - 30 * s + i * 36 * s + lerp(14, 0, arrive) * s;
        showSprite(tag.g, v, [deck[0] + 30 + 62 * s, y], s);
      });
    },
  };
}
