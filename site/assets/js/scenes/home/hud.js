// Everything on the stage that is page furniture rather than world: the
// scenario chips, the timeline rail, the readout (days, grid load, months,
// rewind), the spectrogram inset and the evidence cards.

import { el } from '../../iso.js';
import { ease, lerp, piecewise, seg, window01 } from '../../timeline.js';
import { buildReadout, platesTrack } from '../furniture.js';
import { railPoints } from './script.js';

const HUM_HZ = [120, 240, 360, 480, 600, 720];
const ROTOR_HZ = [170, 340, 510, 680];
const COLUMNS = 40;

export function hudTrack(stage, at) {
  const q = (selector) => stage.querySelector(selector);
  const chip = q('.stage-chip--scenario');
  const identifiedChip = q('.stage-chip--identified');
  const rail = q('.rail');
  const railStops = rail ? [...rail.children] : [];
  const readout = buildReadout(q('.readout'));
  const spectrogram = buildSpectrogram(q('.spectrogram'));
  const plates = platesTrack(stage, at, PLATE_MOTION);
  const rails = railPoints(at);

  function renderRail(f) {
    const shown = window01(f.t, at('scenario', 0.5), at('two-areas', 0.25), 0.1);
    rail.style.opacity = shown.toFixed(3);
    const progress = piecewise(rails, f.sigma);
    rail.style.setProperty('--rail', progress.toFixed(4));
    const current = Math.min(railStops.length - 1, Math.floor(progress * 3 + 0.02));
    railStops.forEach((stop, i) => stop.classList.toggle('is-current', i === current));
  }

  function renderReadout(f) {
    const active = f.t >= at('incidents', 0.9) && f.t < at('two-areas');
    let state = null;
    if (active && f.t >= at('rewind') && f.t < at('weeks-before')) state = { label: 'Rewind', value: '◀◀' };
    else if (active && f.sigma >= at('reconnaissance') && f.sigma < at('weather')) {
      state = { label: 'Weeks before', value: `Day ${1 + Math.floor(seg(f.sigma, at('reconnaissance', 0.05), at('waiting', 0.95)) * 23)}` };
    } else if (active && f.sigma >= at('weather') && f.sigma < at('pennsylvania')) {
      state = { label: 'Heat wave', value: 'Grid load', load: lerp(0.55, 0.97, seg(f.sigma, at('weather', 0.1), at('launch', 0.3))) };
    } else if (active && !f.identified && f.sigma >= at('months-after') && f.sigma < at('cost', 1)) {
      state = { label: 'Repairs', value: `Month ${1 + Math.floor(seg(f.sigma, at('months-after', 0.15), at('months-after', 0.9)) * 23)}` };
    }
    readout.show(state);
  }

  function renderSpectrogram(f) {
    const shown = window01(f.t, at('listening', 0.04), at('listening', 0.98), 0.08);
    spectrogram.root.style.opacity = shown.toFixed(3);
    spectrogram.root.style.visibility = shown > 0.01 ? 'visible' : 'hidden';
    if (shown <= 0.01) return;
    const p = seg(f.t, at('listening', 0.1), at('listening', 0.85));
    spectrogram.reveal.setAttribute('width', (p * spectrogram.width).toFixed(1));
    spectrogram.columns.forEach((column, c) => {
      const x = c / COLUMNS;
      column.style.opacity = (x < p ? seg(x, 0.28, 0.85) : 0).toFixed(3);
    });
    spectrogram.head.style.transform = `rotate(${(-16 * ease(seg(p, 0.35, 0.55))).toFixed(1)}deg)`;
  }


  return {
    render(f) {
      chip.style.opacity = window01(f.t, at('scenario'), at('two-areas', 0.3), 0.1).toFixed(3);
      identifiedChip.style.opacity = window01(f.t, at('rewind', 0.85), at('two-areas', 0.3), 0.1).toFixed(3);
      renderRail(f);
      renderReadout(f);
      renderSpectrogram(f);
      plates.render(f);
      stage.dataset.dark = f.dark ? 'true' : 'false';
    },
  };
}

// Evidence cards whose drawing moves with the reader.
const PLATE_MOTION = {
  'blackout-spread'(plate, p) {
    plate.querySelector('.blackout-spread')?.setAttribute('r', (190 * ease(p)).toFixed(1));
    const minutes = 6 + 7 * p;
    plate.querySelector('.clock-hand')?.setAttribute('transform', `rotate(${(minutes * 6).toFixed(1)})`);
    const label = plate.querySelector('.clock-time');
    if (label) label.textContent = `16:${String(Math.floor(minutes)).padStart(2, '0')}`;
  },
};

function buildSpectrogram(root) {
  const svg = root.querySelector('.spectrogram-plot');
  const width = 220, top = 8, bottom = 96;
  const y = (hz) => bottom - (hz / 800) * (bottom - top);
  const clip = el('clipPath', { id: 'spectrogram-reveal' }, svg);
  const reveal = el('rect', { x: 10, y: 0, width: 0, height: 110 }, clip);
  const plot = el('g', { 'clip-path': 'url(#spectrogram-reveal)' }, svg);
  HUM_HZ.forEach((hz, i) => el('rect', { x: 10, y: (y(hz) - 1.3).toFixed(1), width, height: 2.6, class: 'hum', style: `opacity:${(0.85 - i * 0.11).toFixed(2)}` }, plot));
  const columns = Array.from({ length: COLUMNS }, (_, c) => {
    const g = el('g', { class: 'rotor-column' }, plot);
    ROTOR_HZ.forEach((hz) => el('rect', { x: (10 + (c * width) / COLUMNS).toFixed(1), y: (y(hz + c * 1.2) - 1.3).toFixed(1), width: (width / COLUMNS + 0.4).toFixed(1), height: 2.6 }, g));
    return g;
  });
  el('path', { d: `M10 ${bottom + 2}H${10 + width}`, class: 'axis' }, svg);
  const humLabel = el('text', { x: 10 + width, y: (y(120) + 10).toFixed(1), 'text-anchor': 'end', class: 'legend' }, svg);
  humLabel.textContent = 'transformer hum, 120 Hz + harmonics';
  const rotorLabel = el('text', { x: 10 + width, y: (y(680) - 5).toFixed(1), 'text-anchor': 'end', class: 'legend legend--rotor' }, svg);
  rotorLabel.textContent = 'rotor tones';
  return { root, reveal, columns, width, head: root.querySelector('.panel-head') };
}
