// Isometric drawing kit. World axes: +x runs right-down the screen, +y runs
// left-down, +z is up. The 2:1 dimetric projection keeps edges on whole-pixel
// slopes, which is what makes the illustration read crisp at every zoom.

const SVG_NS = 'http://www.w3.org/2000/svg';

export function el(tag, attrs = {}, parent) {
  const node = document.createElementNS(SVG_NS, tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (value !== undefined && value !== null) node.setAttribute(key, value);
  }
  if (parent) parent.appendChild(node);
  return node;
}

export function project(x, y, z = 0) {
  return [x - y, (x + y) / 2 - z];
}

const r1 = (v) => Math.round(v * 10) / 10;

function pointList(points) {
  return points.map(([x, y, z = 0]) => project(x, y, z).map(r1).join(',')).join(' ');
}

export function quadD(points) {
  const [first, ...rest] = points.map(([x, y, z = 0]) => project(x, y, z).map(r1));
  return `M${first}` + rest.map((p) => `L${p}`).join('') + 'Z';
}

export function poly(parent, points, cls) {
  return el('polygon', { points: pointList(points), class: cls }, parent);
}

export function groundPoly(parent, points, cls) {
  return poly(parent, points.map(([x, y]) => [x, y, 0]), cls);
}

// A box shows three faces: the top, the +y face (screen left) and the +x face
// (screen right). Materials are CSS classes so the palette can change the
// whole scene's lighting by swapping custom properties.
export function box(parent, { x, y, z = 0, w, d, h, mat }) {
  const g = el('g', {}, parent);
  const x1 = x + w, y1 = y + d, z1 = z + h;
  poly(g, [[x, y1, z], [x1, y1, z], [x1, y1, z1], [x, y1, z1]], `m-${mat} fl`);
  poly(g, [[x1, y, z], [x1, y1, z], [x1, y1, z1], [x1, y, z1]], `m-${mat} fr`);
  poly(g, [[x, y, z1], [x1, y, z1], [x1, y1, z1], [x, y1, z1]], `m-${mat} ft`);
  return g;
}

// A box turned to any ground heading. Only the sides facing the viewer
// (outward normal toward +x+y) are drawn, then the top.
export function orientedBox(parent, { x = 0, y = 0, z = 0, length, width, h, heading, mat }) {
  const [ux, uy] = heading;
  const corners = [[1, 1], [1, -1], [-1, -1], [-1, 1]].map(([a, b]) => [
    x + (ux * a * length) / 2 - (uy * b * width) / 2,
    y + (uy * a * length) / 2 + (ux * b * width) / 2,
  ]);
  const g = el('g', {}, parent);
  corners.forEach((p, i) => {
    const q = corners[(i + 1) % 4];
    const nx = (p[0] + q[0]) / 2 - x, ny = (p[1] + q[1]) / 2 - y;
    if (nx + ny <= 0) return;
    poly(g, [[p[0], p[1], z], [q[0], q[1], z], [q[0], q[1], z + h], [p[0], p[1], z + h]], `m-${mat} ${ny > nx ? 'fl' : 'fr'}`);
  });
  poly(g, corners.map(([cx, cy]) => [cx, cy, z + h]), `m-${mat} ft`);
  return g;
}

export function gableRoof(parent, { x, y, z, w, d, rise, mat, wall, ridgeAlong = 'x' }) {
  const x1 = x + w, y1 = y + d;
  if (ridgeAlong === 'x') {
    const ym = y + d / 2;
    poly(parent, [[x, y, z], [x1, y, z], [x1, ym, z + rise], [x, ym, z + rise]], `m-${mat} ft`);
    poly(parent, [[x1, y, z], [x1, y1, z], [x1, ym, z + rise]], `m-${wall} fr`);
    poly(parent, [[x, ym, z + rise], [x1, ym, z + rise], [x1, y1, z], [x, y1, z]], `m-${mat} fl`);
  } else {
    const xm = x + w / 2;
    poly(parent, [[x, y, z], [xm, y, z + rise], [xm, y1, z + rise], [x, y1, z]], `m-${mat} ft`);
    poly(parent, [[x, y1, z], [x1, y1, z], [xm, y1, z + rise]], `m-${wall} fl`);
    poly(parent, [[xm, y, z + rise], [x1, y, z], [x1, y1, z], [xm, y1, z + rise]], `m-${mat} fr`);
  }
}

// Window grids for the two visible walls of a box, one path per wall.
export function windowPaths({ x, y, z = 0, w, d, h, floors, pitch = 9, size = 3.2 }) {
  const x1 = x + w, y1 = y + d;
  const floorH = h / floors;
  const leftCols = Math.max(1, Math.floor((w - 4) / pitch));
  const rightCols = Math.max(1, Math.floor((d - 4) / pitch));
  let left = '', right = '';
  for (let f = 0; f < floors; f++) {
    const za = z + f * floorH + floorH * 0.35;
    const zb = za + Math.min(floorH * 0.45, size * 1.4);
    for (let c = 0; c < leftCols; c++) {
      const xa = x + (w - leftCols * pitch) / 2 + c * pitch + (pitch - size) / 2;
      left += quadD([[xa, y1, za], [xa + size, y1, za], [xa + size, y1, zb], [xa, y1, zb]]);
    }
    for (let c = 0; c < rightCols; c++) {
      const ya = y + (d - rightCols * pitch) / 2 + c * pitch + (pitch - size) / 2;
      right += quadD([[x1, ya, za], [x1, ya + size, za], [x1, ya + size, zb], [x1, ya, zb]]);
    }
  }
  return left + right;
}

export function coneTree(parent, { x, y, r, h }) {
  const [bx, by] = project(x, y, 0);
  const [ax, ay] = project(x, y, h);
  const rx = r * 1.41, ry = r * 0.71;
  const g = el('g', {}, parent);
  el('line', { x1: r1(bx), y1: r1(by), x2: r1(bx), y2: r1(by - h * 0.25), class: 'trunk' }, g);
  el('polygon', { points: `${r1(bx - rx)},${r1(by - h * 0.2)} ${r1(ax)},${r1(ay)} ${r1(bx)},${r1(by - h * 0.2 + ry)}`, class: 'tree-a' }, g);
  el('polygon', { points: `${r1(bx)},${r1(by - h * 0.2 + ry)} ${r1(ax)},${r1(ay)} ${r1(bx + rx)},${r1(by - h * 0.2)}`, class: 'tree-b' }, g);
  return g;
}

export function roundTree(parent, { x, y, r, h }) {
  const [bx, by] = project(x, y, 0);
  const [cx, cy] = project(x, y, h);
  const g = el('g', {}, parent);
  el('line', { x1: r1(bx), y1: r1(by), x2: r1(bx), y2: r1(cy), class: 'trunk' }, g);
  el('circle', { cx: r1(cx), cy: r1(cy), r: r1(r), class: 'tree-c' }, g);
  el('path', { d: `M${r1(cx - r * 0.2)} ${r1(cy - r)} A${r1(r)} ${r1(r)} 0 0 1 ${r1(cx + r)} ${r1(cy + r * 0.1)} A${r1(r * 0.9)} ${r1(r * 0.9)} 0 0 0 ${r1(cx - r * 0.2)} ${r1(cy - r)}Z`, class: 'tree-d' }, g);
  return g;
}

// Upright cylinder: the ground-plane circle projects to a 2:1 ellipse.
export function cylinder(parent, { x, y, z = 0, r, h, mat }) {
  const [cx, bottom] = project(x, y, z);
  const top = bottom - h;
  const rx = r * 1.41, ry = r * 0.71;
  const g = el('g', {}, parent);
  el('path', { d: `M${r1(cx - rx)} ${r1(top)}L${r1(cx - rx)} ${r1(bottom)}A${r1(rx)} ${r1(ry)} 0 0 0 ${r1(cx + rx)} ${r1(bottom)}L${r1(cx + rx)} ${r1(top)}Z`, class: `m-${mat} fl` }, g);
  el('path', { d: `M${r1(cx)} ${r1(top + ry)}L${r1(cx)} ${r1(bottom + ry)}A${r1(rx)} ${r1(ry)} 0 0 0 ${r1(cx + rx)} ${r1(bottom)}L${r1(cx + rx)} ${r1(top)}A${r1(rx)} ${r1(ry)} 0 0 1 ${r1(cx)} ${r1(top + ry)}Z`, class: `m-${mat} fr` }, g);
  el('ellipse', { cx: r1(cx), cy: r1(top), rx: r1(rx), ry: r1(ry), class: `m-${mat} ft` }, g);
  return g;
}

export function coolingTower(parent, { x, y, r, h }) {
  const [cx, base] = project(x, y, 0);
  const top = base - h, waist = base - h * 0.68;
  const rb = r * 1.41, rw = r * 0.95, rt = r * 1.05;
  const g = el('g', {}, parent);
  const outline = `M${r1(cx - rb)} ${r1(base)}Q${r1(cx - rw)} ${r1(waist)} ${r1(cx - rt)} ${r1(top)}L${r1(cx + rt)} ${r1(top)}Q${r1(cx + rw)} ${r1(waist)} ${r1(cx + rb)} ${r1(base)}A${r1(rb)} ${r1(rb / 2)} 0 0 1 ${r1(cx - rb)} ${r1(base)}Z`;
  el('path', { d: outline, class: 'm-concrete fl' }, g);
  el('path', { d: `M${r1(cx)} ${r1(top + rt / 2)}L${r1(cx)} ${r1(base + rb / 2)}A${r1(rb)} ${r1(rb / 2)} 0 0 0 ${r1(cx + rb)} ${r1(base)}Q${r1(cx + rw)} ${r1(waist)} ${r1(cx + rt)} ${r1(top)}Z`, class: 'm-concrete fr' }, g);
  el('ellipse', { cx: r1(cx), cy: r1(top), rx: r1(rt), ry: r1(rt / 2), class: 'm-concrete ft' }, g);
  el('ellipse', { cx: r1(cx), cy: r1(top + 1), rx: r1(rt * 0.82), ry: r1(rt * 0.36), class: 'tower-mouth' }, g);
  return { g, mouth: project(x, y, h) };
}

// A lattice pylon drawn as a screen-facing sprite. Its cross-arm tips come
// from pylonArms so wires can be routed before the pylon is drawn.
export function pylonArms({ x, y, h, perp, arm = 8 }) {
  const armZ = h * 0.88;
  return [[x + perp[0] * arm, y + perp[1] * arm, armZ], [x - perp[0] * arm, y - perp[1] * arm, armZ]];
}

export function pylon(parent, { x, y, h, perp, arm = 8 }) {
  const [bx, by] = project(x, y, 0);
  const [tx, ty] = project(x, y, h);
  const spread = 4.5;
  const g = el('g', { class: 'pylon' }, parent);
  const legs = `M${r1(bx - spread)} ${r1(by)}L${r1(tx - 1)} ${r1(ty)}M${r1(bx + spread)} ${r1(by)}L${r1(tx + 1)} ${r1(ty)}`;
  const midY = (by + ty) / 2, midX = spread * 0.55;
  const brace = `M${r1(bx - spread)} ${r1(by)}L${r1(tx + midX)} ${r1(midY)}M${r1(bx + spread)} ${r1(by)}L${r1(tx - midX)} ${r1(midY)}M${r1(tx - midX)} ${r1(midY)}L${r1(tx + 1)} ${r1(ty)}M${r1(tx + midX)} ${r1(midY)}L${r1(tx - 1)} ${r1(ty)}`;
  const [a, b] = pylonArms({ x, y, h, perp, arm });
  const [ax, ay] = project(...a), [cx2, cy2] = project(...b);
  el('path', { d: legs + brace + `M${r1(ax)} ${r1(ay)}L${r1(cx2)} ${r1(cy2)}`, class: 'pylon-steel' }, g);
  return g;
}

export function wireD(from, to, sag) {
  const [ax, ay] = project(...from);
  const [bx, by] = project(...to);
  return `M${r1(ax)} ${r1(ay)}Q${r1((ax + bx) / 2)} ${r1((ay + by) / 2 + sag * 2)} ${r1(bx)} ${r1(by)}`;
}

export function roadQuad(from, to, width) {
  const dx = to[0] - from[0], dy = to[1] - from[1];
  const len = Math.hypot(dx, dy) || 1;
  const px = (-dy / len) * width / 2, py = (dx / len) * width / 2;
  return [[from[0] + px, from[1] + py], [to[0] + px, to[1] + py], [to[0] - px, to[1] - py], [from[0] - px, from[1] - py]];
}

// The first k of a quadratic curve through screen points (de Casteljau
// split), so a line can grow along its path. A dash pattern can't do this:
// with non-scaling strokes Chrome measures dashes in screen pixels.
export function partialCurve([p0, p1, p2], k) {
  const mid = (a, b) => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k];
  const q0 = mid(p0, p1), q1 = mid(p1, p2), end = mid(q0, q1);
  return `M${p0[0].toFixed(1)} ${p0[1].toFixed(1)}Q${q0[0].toFixed(1)} ${q0[1].toFixed(1)} ${end[0].toFixed(1)} ${end[1].toFixed(1)}`;
}

// A point k along a quadratic curve through screen points.
export function curvePoint([p0, p1, p2], k) {
  const u = 1 - k;
  return [u * u * p0[0] + 2 * u * k * p1[0] + k * k * p2[0], u * u * p0[1] + 2 * u * k * p1[1] + k * k * p2[1]];
}

// Closed Catmull-Rom curve through world ground points, for lakes.
export function blobD(points) {
  const p = points.map(([x, y]) => project(x, y, 0));
  const n = p.length;
  let d = `M${p[0].map(r1)}`;
  for (let i = 0; i < n; i++) {
    const p0 = p[(i - 1 + n) % n], p1 = p[i], p2 = p[(i + 1) % n], p3 = p[(i + 2) % n];
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += `C${c1.map(r1)} ${c2.map(r1)} ${p2.map(r1)}`;
  }
  return d + 'Z';
}

export function slab(parent, { half, thickness }) {
  slabRect(parent, { x0: -half, x1: half, y0: -half, y1: half, thickness });
}

export function slabRect(parent, { x0, x1, y0, y1, thickness }) {
  const T = thickness;
  poly(parent, [[x0, y1, 0], [x1, y1, 0], [x1, y1, -T], [x0, y1, -T]], 'm-earth fl');
  poly(parent, [[x1, y0, 0], [x1, y1, 0], [x1, y1, -T], [x1, y0, -T]], 'm-earth fr');
  poly(parent, [[x0, y0, 0], [x1, y0, 0], [x1, y1, 0], [x0, y1, 0]], 'ground');
}
