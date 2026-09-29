// Sound paths at the substation. why-hard: the same noise reaches the microphone
// several ways, directly and by bouncing off the concrete control building
// and the asphalt. model: the threat's likely approaches draw in from outside,
// and paths run from them to every candidate microphone position.

import { el, project } from '../../iso.js';
import { lerp, seg, window01 } from '../../timeline.js';
import { buildTag, showSprite, spriteScale } from '../furniture.js';

const MIC_Z = 17;

export function pathsTrack(world, places, at) {
  const { substation: place } = places;
  const layer = el('g', { class: 'sound-paths' }, world.layers.effects);
  const tags = el('g', {}, world.layers.tags);
  const mic = [...place.poles[place.chosen].at, MIC_Z];

  const echoes = [
    { points: [place.traffic, mic], cls: 'path-direct', from: 0.15 },
    { points: [place.sub.transformer, mic], cls: 'path-direct', from: 0.25 },
    { points: [place.traffic, place.asphalt, mic], cls: 'path-echo', from: 0.35, label: 'asphalt' },
    { points: [place.traffic, place.wall, mic], cls: 'path-echo', from: 0.5, label: 'concrete' },
  ].map((echo) => ({
    ...echo,
    node: el('path', { d: polylineD(echo.points), class: `sound-path ${echo.cls}` }, layer),
    tag: echo.label ? buildTag(tags, echo.label, 'surface-tag') : null,
    tagAt: echo.label ? project(...echo.points[1]) : null,
  }));

  const approaches = place.approaches.map(([from, to]) => ({ from: project(...from), to: project(...to), node: el('path', { class: 'approach' }, layer) }));
  const candidates = place.poles.map((pole) => project(...pole.at, MIC_Z));
  const listens = approaches.flatMap((approach) => candidates.map((c) => el('path', { d: `M${approach.to.map((v) => v.toFixed(1)).join(' ')}L${c.map((v) => v.toFixed(1)).join(' ')}`, class: 'candidate-path' }, layer)));

  return {
    render(f) {
      const s = spriteScale(f, 1.2);
      const echoesOut = 1 - seg(f.t, at('model'), at('model', 0.15));
      for (const echo of echoes) {
        const v = seg(f.t, at('why-hard', echo.from), at('why-hard', echo.from + 0.1)) * echoesOut;
        echo.node.style.opacity = v.toFixed(3);
        if (!echo.tag) continue;
        showSprite(echo.tag, v, [echo.tagAt[0], echo.tagAt[1] - 12 * s], s);
      }
      const leave = 1 - seg(f.t, at('housing-per-mission'), at('housing-per-mission', 0.2));
      approaches.forEach((approach, k) => {
        const drawn = seg(f.t, at('model', 0.1 + k * 0.06), at('model', 0.35 + k * 0.06));
        const end = [lerp(approach.from[0], approach.to[0], drawn), lerp(approach.from[1], approach.to[1], drawn)];
        approach.node.setAttribute('d', drawn > 0 ? `M${approach.from.map((v) => v.toFixed(1)).join(' ')}L${end.map((v) => v.toFixed(1)).join(' ')}` : '');
        approach.node.style.opacity = leave.toFixed(3);
      });
      const listening = window01(f.t, at('model', 0.4), at('housing-per-mission', 0.2), 0.12);
      for (const node of listens) node.style.opacity = (0.8 * listening).toFixed(3);
    },
  };
}

function polylineD(points) {
  return points.map((p, k) => `${k ? 'L' : 'M'}${project(...p).map((v) => v.toFixed(1)).join(' ')}`).join('');
}
