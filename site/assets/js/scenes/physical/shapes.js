// Housing silhouettes, drawn as abstract shapes with the listening opening
// to the right (+x). They are illustrations, not designs: no dimensions, and
// not all horns.

import { el } from '../../iso.js';

export const SHAPES = {
  horn: { outline: 'M-13 -3.5L-4 -3.5L12 -11L12 11L-4 3.5L-13 3.5Z', detail: '' },
  bulb: { outline: 'M7.6 -4.4A10 10 0 1 0 7.6 4.4L12 4.4L12 -4.4Z', holes: [[-8, -4], [-9, 2.5], [-4, 7], [-2, -8], [2, 7.5]] },
  scoop: { outline: 'M-12 -2C-12 -11 4 -12 12 -6L8 -2C4 -6 -4 -5 -4 0C-4 5 4 6 8 2L12 6C4 12 -12 11 -12 2Z', detail: '' },
  chamber: { outline: 'M-13 -10H4Q9 -10 9 -5V-2H13V2H9V5Q9 10 4 10H-13Z', detail: 'M-13 0H1M-6 -10V-4M-6 4V10' },
};

// Draws one silhouette into a group, with the microphone point inside it.
export function drawShape(parent, name) {
  const shape = SHAPES[name];
  const g = el('g', { class: `housing-shape housing-shape--${name}` }, parent);
  el('path', { d: shape.outline, class: 'shape-body' }, g);
  if (shape.detail) el('path', { d: shape.detail, class: 'shape-detail' }, g);
  for (const [x, y] of shape.holes ?? []) el('circle', { cx: x, cy: y, r: 1.3, class: 'shape-hole' }, g);
  el('circle', { cx: -7, cy: 0, r: 1.8, class: 'shape-mic' }, g);
  return g;
}
