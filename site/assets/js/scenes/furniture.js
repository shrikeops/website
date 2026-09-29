// Sprites and stage furniture shared by story pages: pill labels drawn in
// the scene, the red flaw pin and the amber fixed check, the quadcopter, the
// evidence cards, the legend, the perched shrike, and the corner readout.

import { el } from '../iso.js';
import { ease, lerp, seg, window01 } from '../timeline.js';

// Sprites keep one size on screen at every zoom: `pixels` screen pixels per
// sprite unit on a wide stage, a little less on a phone's.
export function spriteScale(f, pixels = 1.6) {
  const stageWidth = f.view.w / f.scale;
  return f.scale * pixels * Math.min(1, Math.max(0.65, stageWidth / 800));
}

// Shows a sprite at a screen point: hidden while v is 0, otherwise faded to
// v and scaled by s. With pop, it grows from 60% of its size as it appears.
export function showSprite(node, v, [x, y], s, pop = false) {
  node.style.display = v > 0 ? '' : 'none';
  if (!(v > 0)) return;
  node.style.opacity = v.toFixed(3);
  node.setAttribute('transform', `translate(${x.toFixed(1)} ${y.toFixed(1)}) scale(${(s * (pop ? lerp(0.6, 1, ease(v)) : 1)).toFixed(2)})`);
}

export function buildTag(layer, text, cls) {
  const g = el('g', { class: cls }, layer);
  const width = 12 + text.length * 6.2;
  el('rect', { x: -width / 2, y: -10, width, height: 17, rx: 8.5 }, g);
  const label = el('text', { x: 0, y: 2.5, 'text-anchor': 'middle' }, g);
  label.textContent = text;
  return g;
}

export function droneSprite(parent) {
  const g = el('g', { class: 'drone' }, parent);
  el('path', { d: 'M-7 -3.5L7 3.5M7 -3.5L-7 3.5', class: 'drone-arm' }, g);
  const rotors = [[-7, -3.5], [7, -3.5], [-7, 3.5], [7, 3.5]].map(([x, y]) => el('ellipse', { cx: x, cy: y, rx: 4.4, ry: 2.2, class: 'rotor' }, g));
  el('rect', { x: -3, y: -2.3, width: 6, height: 4.6, rx: 1.5, class: 'drone-body' }, g);
  el('circle', { cx: 0, cy: 2.6, r: 1, class: 'drone-light' }, g);
  return { g, rotors };
}

export function flawPin(layer) {
  const pin = el('g', { class: 'vuln-pin' }, layer);
  el('path', { d: 'M0 7C-5 0-6.5-6.5 0-10C6.5-6.5 5 0 0 7Z' }, pin);
  el('circle', { cx: 0, cy: -3.6, r: 2.1, class: 'vuln-pin-dot' }, pin);
  return pin;
}

export function fixedCheck(layer) {
  const check = el('g', { class: 'fixed-check' }, layer);
  el('circle', { cx: 0, cy: -3, r: 7 }, check);
  el('path', { d: 'M-3.4 -3L-1 -0.4L3.6 -5.6' }, check);
  return check;
}

// Each evidence card (<figure data-plate="beat id">) shows while its beat is
// on screen, and the stage dims behind it. A card with data-motion="name" is
// animated by motion[name](plate, p) as the reader moves through its beat; a
// name the page does not define is a mistake, so it throws.
export function platesTrack(stage, at, motion = {}) {
  const plates = [...stage.querySelectorAll('[data-plate]')];
  for (const plate of plates) {
    const name = plate.dataset.motion;
    if (name && !motion[name]) throw new Error(`no card animation named "${name}"`);
  }
  const dim = stage.querySelector('.stage-dim');
  return {
    render(f) {
      let strongest = 0;
      for (const plate of plates) {
        const id = plate.dataset.plate;
        const v = ease(window01(f.t, at(id, 0.02), at(id, 0.98), 0.18));
        plate.style.opacity = v.toFixed(3);
        plate.style.transform = `translate(-50%, calc(-50% + ${((1 - v) * 18).toFixed(1)}px))`;
        plate.style.visibility = v > 0.01 ? 'visible' : 'hidden';
        strongest = Math.max(strongest, v);
        motion[plate.dataset.motion]?.(plate, seg(f.t, at(id, 0.18), at(id, 0.78)));
      }
      dim.style.opacity = (strongest * 0.6).toFixed(3);
    },
  };
}

// The stage legend: in from `from` (over `fade`), out by `to` if given, and
// out of the way while an evidence card is up.
export function legendTrack(stage, at, { from, to, fade }) {
  const legend = stage.querySelector('.stage-legend');
  const plates = [...stage.querySelectorAll('[data-plate]')].map((p) => p.dataset.plate);
  return {
    render(f) {
      const shown = seg(f.t, from, from + fade) * (to === undefined ? 1 : 1 - seg(f.t, to - fade, to));
      const plate = Math.max(0, ...plates.map((id) => window01(f.t, at(id), at(id, 1), 0.15)));
      legend.style.opacity = (shown * (1 - plate)).toFixed(3);
    },
  };
}

// The shrike perched on the wires in the stage's foreground. Each perch is
// { arrive, leave }, both [from, to] on the story axis; a perch without
// arrive holds from the start, one without leave to the end. Between perches
// the bird drops out of view with its wires.
export function perchTrack(stage, perches) {
  const parts = [stage.querySelector('.fore-bird'), stage.querySelector('.fore-wires')];
  return {
    render(f) {
      const perched = Math.max(...perches.map(({ arrive, leave }) => (arrive ? ease(seg(f.t, ...arrive)) : 1) * (leave ? 1 - ease(seg(f.t, ...leave)) : 1)));
      const away = 1 - perched;
      for (const part of parts) {
        part.style.transform = `translateY(${(away * 180).toFixed(1)}px)`;
        part.style.opacity = (1 - seg(away, 0.6, 1)).toFixed(3);
      }
    },
  };
}

export function buildReadout(root) {
  const label = root.querySelector('.readout-label');
  const value = root.querySelector('.readout-value');
  const bar = root.querySelector('.readout-bar');
  let last = '';
  return {
    show(state) {
      root.style.opacity = state ? '1' : '0';
      if (!state) {
        label.textContent = value.textContent = last = '';
        if (bar) bar.hidden = true;
        return;
      }
      const key = `${state.label}|${state.value}`;
      if (key !== last) {
        label.textContent = state.label;
        value.textContent = state.value;
        last = key;
      }
      if (!bar) return;
      bar.hidden = state.load === undefined;
      if (state.load !== undefined) {
        bar.style.setProperty('--load', state.load.toFixed(3));
        bar.classList.toggle('is-high', state.load > 0.9);
      }
    },
  };
}
