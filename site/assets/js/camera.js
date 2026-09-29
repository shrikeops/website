// Camera targets are rectangles in projected screen units ({ cx, cy, w, h }).
// The camera frames a target inside the stage without distorting it.
// minCrop lets a tall phone stage trim a close-up's sides instead of
// shrinking it; wide views set it to 1 so nothing important is cut.

import { bracket, clamp01, lerp } from './timeline.js';

function blend(a, b, k) {
  return {
    cx: lerp(a.cx, b.cx, k),
    cy: lerp(a.cy, b.cy, k),
    w: Math.exp(lerp(Math.log(a.w), Math.log(b.w), k)),
    h: Math.exp(lerp(Math.log(a.h), Math.log(b.h), k)),
    minCrop: lerp(a.minCrop ?? 1, b.minCrop ?? 1, k),
  };
}

export function cameraView(keys, t, size) {
  const { a, b, k } = bracket(keys, t);
  const target = blend(a, b, k);
  const aspect = size.w / size.h;
  const crop = lerp(target.minCrop, 1, clamp01((aspect - 0.55) / 0.35));
  const w = Math.max(target.w * crop, target.h * aspect);
  const h = w / aspect;
  return { x: target.cx - w / 2, y: target.cy - h / 2, w, h };
}
