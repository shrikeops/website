// The identification pass's physical side: microphone housings at every
// targeted substation, sound arcs from the hovering drones to the housings,
// and the alerts that run from all five places to the grid operator.

import { el, partialCurve, project } from '../../iso.js';
import { seg } from '../../timeline.js';
import { buildTag } from '../furniture.js';
import { housingAt } from './props.js';

const ARCS = 3;

export function identificationTrack(svg, world, schedule, at) {
  const layer = el('g', { class: 'identification' }, world.layers.effects);
  const listeners = Object.values(world.subs).map((sub) => {
    const plan = schedule.subs[sub.id];
    return {
      plan,
      from: project(sub.x - 10, sub.y - 4, 56),
      to: project(...housingAt(sub)),
      arcs: Array.from({ length: ARCS }, () => el('path', { class: 'sound-arc' }, layer)),
      gate: 0,
    };
  });
  const operatorAt = project(...world.anchors.operator);
  const alerts = Object.values(world.subs).filter((sub) => sub.id.endsWith('1')).map((sub) => {
    const [sx, sy] = project(sub.x, sub.y, 24);
    const cx = (sx + operatorAt[0]) / 2, cy = Math.min(sy, operatorAt[1]) - 160;
    const path = el('path', { class: 'alert-path' }, layer);
    return { path, curve: [[sx, sy], [cx, cy], operatorAt], plan: schedule.subs[sub.id], drawn: -1 };
  });
  const operatorTag = buildTag(world.layers.tags, 'Grid operator', 'operator-tag');

  return {
    render(f) {
      svg.dataset.housings = (f.identified && f.t >= at('the-evening')) ? 'on' : '';
      for (const listener of listeners) {
        const { plan } = listener;
        listener.gate = f.identified && f.sigma > plan.fly[1] - 0.25 && f.sigma < plan.offAt ? 1 : 0;
        if (!listener.gate) for (const arc of listener.arcs) arc.style.opacity = '0';
      }
      const fade = 1 - seg(f.sigma, at('coordination', 0.85), at('coordination', 0.97));
      let strongest = 0;
      for (const alert of alerts) {
        const drawn = f.identified ? seg(f.sigma, alert.plan.heardAt, alert.plan.heardAt + 0.12) : 0;
        if (drawn !== alert.drawn) {
          alert.path.setAttribute('d', drawn > 0 ? partialCurve(alert.curve, drawn) : '');
          alert.drawn = drawn;
        }
        alert.path.style.opacity = (drawn > 0 ? fade : 0).toFixed(3);
        strongest = Math.max(strongest, drawn * fade);
      }
      operatorTag.style.opacity = strongest.toFixed(3);
      operatorTag.setAttribute('transform', `translate(${operatorAt[0].toFixed(1)} ${(operatorAt[1] - 16 * f.scale).toFixed(1)}) scale(${(f.scale * 0.95).toFixed(2)})`);
    },
    tick(f) {
      for (const listener of listeners) {
        if (!listener.gate) continue;
        const [cx, cy] = listener.from;
        const dx = listener.to[0] - cx, dy = listener.to[1] - cy;
        const angle = Math.atan2(dy, dx), reach = Math.hypot(dx, dy);
        listener.arcs.forEach((arc, i) => {
          const k = (f.now / 1000 + i / ARCS) % 1;
          const r = Math.max(1, k * reach);
          const a0 = angle - 0.5, a1 = angle + 0.5;
          arc.setAttribute('d', `M${(cx + r * Math.cos(a0)).toFixed(1)} ${(cy + r * Math.sin(a0)).toFixed(1)}A${r.toFixed(1)} ${r.toFixed(1)} 0 0 1 ${(cx + r * Math.cos(a1)).toFixed(1)} ${(cy + r * Math.sin(a1)).toFixed(1)}`);
          arc.style.opacity = (1 - k).toFixed(3);
        });
      }
    },
  };
}
