// What happens at each targeted substation. Attack pass: a short-circuit
// flash, then a red glow, and a red tag with the strike's offset in the
// minute. Identification pass: no flash; an amber tag when the drones are
// heard, then a grey glow once the operator switches the substation off.

import { el, project } from '../../iso.js';
import { seeded } from '../../random.js';
import { seg } from '../../timeline.js';
import { buildTag } from '../furniture.js';
import { STRIKE_OFFSETS } from './script.js';

export function strikesTrack(world, schedule, at) {
  const rand = seeded(4242);
  const nightFrom = at('cascade', 0.25);
  const sites = Object.values(world.subs).map((sub) => {
    const glow = el('ellipse', { cx: project(sub.x, sub.y)[0], cy: project(sub.x, sub.y)[1], rx: 46, ry: 23, class: 'sub-glow' }, world.layers.glows);
    const fx = el('g', { class: 'flash' }, world.layers.effects);
    const burst = el('circle', { r: 10, class: 'burst' }, fx);
    const arc = el('path', { d: arcsD(rand), class: 'arc' }, fx);
    const firstOfPlace = sub.id.endsWith('1');
    const tag = firstOfPlace ? buildTag(world.layers.tags, STRIKE_OFFSETS[sub.place], 'strike-tag') : null;
    return { sub, plan: schedule.subs[sub.id], glow, fx, burst, arc, tag, flashAt: project(sub.x - 10, sub.y - 8, 16), tagAt: project(sub.x + 20, sub.y - 30, 44) };
  });

  return {
    render(f) {
      const s = Math.max(1, f.scale * 0.8);
      for (const site of sites) {
        const { plan } = site;
        const q = f.identified ? -1 : (f.sigma - plan.flashAt) / 0.14;
        const flashing = q > 0 && q < 1;
        site.fx.style.display = flashing ? '' : 'none';
        if (flashing) {
          site.fx.setAttribute('transform', `translate(${site.flashAt[0].toFixed(1)} ${site.flashAt[1].toFixed(1)}) scale(${s.toFixed(2)})`);
          site.burst.setAttribute('r', (6 + 30 * q).toFixed(1));
          site.burst.style.opacity = ((1 - q) ** 1.5).toFixed(3);
          site.arc.style.opacity = (q < 0.7 ? 0.6 + 0.4 * Math.sin(q * 60) : 0).toFixed(3);
        }
        const glowSize = Math.max(1, s * 0.6);
        site.glow.setAttribute('rx', (46 * glowSize).toFixed(1));
        site.glow.setAttribute('ry', (23 * glowSize).toFixed(1));
        site.glow.classList.toggle('is-off', f.identified);
        if (f.identified) {
          const settled = 1 - 0.75 * seg(f.sigma, plan.offAt + 0.3, plan.offAt + 1);
          site.glow.style.opacity = (0.55 * seg(f.sigma, plan.offAt, plan.offAt + 0.05) * settled).toFixed(3);
        } else {
          const since = f.sigma - plan.flashAt;
          site.glow.style.opacity = (since > 0 ? 0.55 * Math.exp(-since * 1.6) + 0.22 : 0).toFixed(3);
        }
        if (site.tag) {
          const from = f.identified ? plan.heardAt : plan.flashAt;
          const shown = seg(f.sigma, from, from + 0.06) * (f.identified ? 1 - seg(f.sigma, at('coordination', 0.9), at('coordination', 1)) : 1 - 0.4 * seg(f.sigma, nightFrom, nightFrom + 0.3));
          site.tag.classList.toggle('is-heard', f.identified);
          site.tag.style.opacity = shown.toFixed(2);
          site.tag.setAttribute('transform', `translate(${site.tagAt[0].toFixed(1)} ${site.tagAt[1].toFixed(1)}) scale(${(f.scale * 0.95).toFixed(2)})`);
        }
      }
    },
  };
}

function arcsD(rand) {
  let d = '';
  for (let k = 0; k < 6; k++) {
    const angle = rand() * Math.PI * 2;
    let px = 0, py = 0;
    d += 'M0 0';
    for (let j = 0; j < 4; j++) {
      px += Math.cos(angle) * 5 + (rand() - 0.5) * 7;
      py += Math.sin(angle) * 3 + (rand() - 0.5) * 6;
      d += `L${px.toFixed(1)} ${py.toFixed(1)}`;
    }
  }
  return d;
}
