// The soundprint inset: a sketch of each place's sound by pitch, low at the
// bottom and high at the top. A steady roar is a broad band, a hum is a comb
// of thin lines, and the threat's tones are red. An illustration, with no
// scale except the substation's sourced 120 Hz mark. At change-housing the power
// station's piston comb smears into the broad band of a jet.

import { el } from '../../iso.js';
import { seg, window01 } from '../../timeline.js';

const LEFT = 26, RIGHT = 234;

const PRINTS = {
  airport: {
    label: 'Airport',
    noise: { bands: [[22, 100, 0.34]], tones: [30, 38] },
    threat: { tones: [50, 58, 66, 74] },
  },
  plant: {
    label: 'Power station',
    noise: { bands: [[30, 66, 0.28]], tones: [98, 92, 86] },
    threat: { tones: [96, 90, 84, 78, 72, 66] },
    jet: { bands: [[18, 58, 0.45]] },
  },
  substation: {
    label: 'Substation',
    noise: { tones: [100, 90, 80, 70, 60, 50, 40, 30], mark: [100, '120 Hz'] },
    threat: { tones: [85, 75, 65, 55] },
  },
};

export function soundprintTrack(stage, at) {
  const root = stage.querySelector('.soundprint');
  const place = root.querySelector('.soundprint-place');
  const svg = root.querySelector('.soundprint-plot');
  el('path', { d: `M${LEFT - 2} 8V106`, class: 'axis' }, svg);
  label(svg, 2, 14, 'high');
  label(svg, 2, 104, 'low');
  const prints = Object.fromEntries(Object.entries(PRINTS).map(([name, print]) => [name, buildPrint(svg, print)]));

  const windows = {
    airport: (t) => window01(t, at('airport', 0.05), at('airport', 1), 0.1),
    plant: (t) => Math.max(window01(t, at('power-station', 0.05), at('power-station', 1), 0.1), window01(t, at('change-housing', 0.05), at('change-housing', 1), 0.1)),
    substation: (t) => window01(t, at('substation', 0.05), at('why-hard', 1), 0.1),
  };
  let shownName = '';

  return {
    render(f) {
      let strongest = 0, name = '';
      for (const [key, shown] of Object.entries(windows)) {
        const v = shown(f.t);
        prints[key].g.style.display = v > 0 ? '' : 'none';
        if (v > strongest) { strongest = v; name = key; }
      }
      root.style.opacity = strongest.toFixed(3);
      root.style.visibility = strongest > 0.01 ? 'visible' : 'hidden';
      if (name !== shownName) { place.textContent = name ? PRINTS[name].label : ''; shownName = name; }
      const jet = f.t >= at('change-housing') ? 1 : 0;
      prints.plant.threat.style.opacity = (1 - jet * seg(f.t, at('change-housing', 0.15), at('change-housing', 0.45))).toFixed(3);
      prints.plant.jet.style.opacity = (jet * seg(f.t, at('change-housing', 0.3), at('change-housing', 0.6))).toFixed(3);
    },
  };
}

function buildPrint(svg, print) {
  const g = el('g', {}, svg);
  const layer = (part, cls) => {
    const group = el('g', { class: cls }, g);
    for (const [top, bottom, opacity] of part?.bands ?? []) el('rect', { x: LEFT, y: top, width: RIGHT - LEFT, height: bottom - top, style: `opacity:${opacity}` }, group);
    for (const y of part?.tones ?? []) el('path', { d: `M${LEFT} ${y}H${RIGHT}` }, group);
    return group;
  };
  const noise = layer(print.noise, 'print-noise');
  if (print.noise.mark) label(svg, RIGHT, print.noise.mark[0] - 3, print.noise.mark[1], 'end', g);
  return { g, noise, threat: layer(print.threat, 'print-threat'), jet: layer(print.jet, 'print-jet') };
}

function label(svg, x, y, text, anchor = 'start', parent = svg) {
  const node = el('text', { x, y, 'text-anchor': anchor, class: 'legend' }, parent);
  node.textContent = text;
  return node;
}
