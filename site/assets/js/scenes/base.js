// What every story scene shares: the SVG, the camera, the lighting, and the
// loop over tracks. A page's scene supplies only its own script (camera and
// lighting keyframes, optional extra frame fields) and its tracks.
//
// render(t) is a pure function of the story position, so scrolling back up
// plays the same frames in reverse. tick() only drives ambient motion that
// carries no story state.

import { el } from '../iso.js';
import { PALETTES, WINDOW_LIGHT, materialCss, mixPalettes } from '../palette.js';
import { beatClock, bracket, lerp } from '../timeline.js';
import { cameraView } from '../camera.js';

const DARK_SKIES = new Set(['blueHour', 'night']);

// Every lighting change restyles the whole scene, so blends move in steps
// small enough not to see and coarse enough not to restyle every frame.
const LIGHT_STEPS = 25;

export function storyScene(stage, beatIds, name, setup) {
  installMaterialCss();
  const at = beatClock(beatIds, name);
  const svg = el('svg', { class: 'scene', preserveAspectRatio: 'xMidYMid meet' });
  stage.prepend(svg);
  addGlowGradients(svg);
  const { cameraKeys, paletteKeys, tracks, frameAt = () => ({}) } = setup({ svg, stage, at });

  let size = { w: 1, h: 1 };
  let lightKey = '';
  const frame = { t: 0, at, scale: 1, now: 0, dt: 16, lights: 0, windowOff: '#a9bac8', dark: false };

  function light(t) {
    const { a, b, k: exact } = bracket(paletteKeys, t);
    const k = Math.round(exact * LIGHT_STEPS) / LIGHT_STEPS;
    const key = `${a}|${b}|${k}`;
    if (key === lightKey) return;
    lightKey = key;
    const palette = mixPalettes(PALETTES[a], PALETTES[b], k);
    for (const [prop, value] of Object.entries(palette)) svg.style.setProperty(`--${prop}`, value);
    stage.style.setProperty('--sky', palette.sky);
    frame.lights = lerp(WINDOW_LIGHT[a], WINDOW_LIGHT[b], k);
    frame.windowOff = palette['win-off'];
    frame.dark = (DARK_SKIES.has(a) ? 1 - k : 0) + (DARK_SKIES.has(b) ? k : 0) > 0.5;
    svg.style.setProperty('--lights', frame.lights.toFixed(3));
  }

  function render(t) {
    const view = cameraView(cameraKeys, t, size);
    svg.setAttribute('viewBox', `${view.x.toFixed(1)} ${view.y.toFixed(1)} ${view.w.toFixed(1)} ${view.h.toFixed(1)}`);
    Object.assign(frame, { t, scale: view.w / size.w, view }, frameAt(t));
    light(t);
    for (const track of tracks) track.render(frame);
  }

  function tick(now) {
    frame.dt = frame.now ? Math.min(64, now - frame.now) : 16;
    frame.now = now;
    for (const track of tracks) track.tick?.(frame);
  }

  function resize(w, h) {
    size = { w: Math.max(1, w), h: Math.max(1, h) };
    render(frame.t);
  }

  return { render, tick, resize };
}

function installMaterialCss() {
  if (document.getElementById('scene-materials')) return;
  const style = document.createElement('style');
  style.id = 'scene-materials';
  style.textContent = materialCss();
  document.head.appendChild(style);
}

// Soft glows as radial gradients: a blur filter on each glow cost more than
// the rest of the scene put together.
function addGlowGradients(svg) {
  const defs = el('defs', {}, svg);
  for (const [id, color] of [['glow-attack', '#c0341d'], ['glow-off', '#8d97a6'], ['glow-fire', '#f08a24'], ['glow-amber', '#d99a2b']]) {
    const gradient = el('radialGradient', { id }, defs);
    el('stop', { offset: '0', 'stop-color': color, 'stop-opacity': '0.95' }, gradient);
    el('stop', { offset: '0.55', 'stop-color': color, 'stop-opacity': '0.45' }, gradient);
    el('stop', { offset: '1', 'stop-color': color, 'stop-opacity': '0' }, gradient);
  }
}
