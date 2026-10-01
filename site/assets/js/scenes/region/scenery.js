// Drawing the region: ground and fields, towns and their public buildings,
// forests, substations, the generating station, the airport and the lines.

import {
  el, project, poly, groundPoly, box, gableRoof, windowPaths, coneTree, roundTree,
  cylinder, coolingTower, pylon, pylonArms, wireD, roadQuad, blobD, slab, quadD, orientedBox,
} from '../../iso.js';
import { seeded } from '../../random.js';
import {
  PLACES, SWITCHING, GEN, AIRFIELD, AIRLINER, LINES, LAKE, HALF, STREET_PITCH, STREET_WIDTH, FORESTS,
  nearHighway, openRoadSegments, insidePlace, insideAirfield, onSlab, insideLake, nearNode,
} from './layout.js';

export function drawGround(g, nodes) {
  slab(g, { half: HALF, thickness: 70 });
  const rand = seeded(101);
  const cell = 150;
  for (let x = -HALF; x < HALF; x += cell) {
    for (let y = -HALF; y < HALF; y += cell) {
      const cx = x + cell / 2, cy = y + cell / 2;
      if (insidePlace(cx, cy, 90) || insideLake(cx, cy, 70) || insideAirfield(cx, cy, 70) || nearNode(cx, cy, 90, nodes)) continue;
      if (rand() < 0.22) continue;
      const inset = 7 + rand() * 6;
      const kind = 1 + Math.floor(rand() * 3);
      groundPoly(g, [[x + inset, y + inset], [x + cell - inset, y + inset], [x + cell - inset, y + cell - inset], [x + inset, y + cell - inset]], `field${kind}`);
    }
  }
  const lakeRand = seeded(55);
  const lakePts = Array.from({ length: 14 }, (_, i) => {
    const a = (i / 14) * Math.PI * 2;
    const r = LAKE.r * (0.78 + lakeRand() * 0.34);
    return [LAKE.x + Math.cos(a) * r * 1.15, LAKE.y + Math.sin(a) * r * 0.9];
  });
  el('path', { d: blobD(lakePts.map(([x, y]) => [x + (x - LAKE.x) * 0.06, y + (y - LAKE.y) * 0.06])), class: 'water-edge' }, g);
  el('path', { d: blobD(lakePts), class: 'water' }, g);
  const highway = openRoadSegments();
  for (const [a, b] of highway) groundPoly(g, roadQuad(a, b, 13), 'road');
  el('path', { d: highway.map(([a, b]) => `M${project(...a).join(' ')}L${project(...b).join(' ')}`).join(''), class: 'road-line' }, g);
  drawAirfield(g);
}

function drawAirfield(g) {
  const { x, y, w } = AIRFIELD;
  groundPoly(g, [[x, y], [x + w, y], [x + w, y + 22], [x, y + 22]], 'runway');
  el('path', { d: `M${project(x + 10, y + 11).join(' ')}L${project(x + w - 10, y + 11).join(' ')}`, class: 'runway-line' }, g);
  groundPoly(g, [[x + 90, y + 26], [x + 184, y + 26], [x + 184, y + 72], [x + 90, y + 72]], 'gravel');
}

export function buildTown(place, ctx) {
  const rand = seeded(place.seed);
  const n = Math.max(1, Math.round(place.size / STREET_PITCH));
  const extent = n * STREET_PITCH;
  for (let k = -n; k <= n; k++) {
    groundPoly(ctx.ground, roadQuad([place.x - extent, place.y + k * STREET_PITCH], [place.x + extent, place.y + k * STREET_PITCH], STREET_WIDTH), 'road');
    groundPoly(ctx.ground, roadQuad([place.x + k * STREET_PITCH, place.y - extent], [place.x + k * STREET_PITCH, place.y + extent], STREET_WIDTH), 'road');
  }
  ctx.anchors[`place-${place.id}`] = [place.x, place.y, 30];
  const civic = place.civic ? CIVIC_PLAN : new Map();
  for (let i = -n; i < n; i++) {
    for (let j = -n; j < n; j++) {
      const block = {
        x: place.x + i * STREET_PITCH + STREET_WIDTH / 2 + 2,
        y: place.y + j * STREET_PITCH + STREET_WIDTH / 2 + 2,
        size: STREET_PITCH - STREET_WIDTH - 4,
        place,
      };
      const dist = Math.hypot(i + 0.5, j + 0.5) / n;
      const civicDraw = civic.get(`${i},${j}`);
      if (civicDraw) civicDraw(block, ctx);
      else if (dist > 1.08) continue;
      else if (rand() < 0.1) parkBlock(block, rand, ctx);
      else if (dist < 0.5) midriseBlock(block, rand, ctx);
      else houseBlock(block, rand, ctx);
    }
  }
}

function recordBuilding(ctx, g, spec, place, extra = {}) {
  const windows = el('path', { d: windowPaths(spec), class: 'windows' }, g);
  const cx = spec.x + spec.w / 2, cy = spec.y + spec.d / 2;
  ctx.buildings.push({ windows, place: place.id, x: cx, y: cy, top: spec.h, sweep: Math.hypot(cx - place.x, cy - place.y) / (place.size * 1.5), ...extra });
}

function midriseBlock(block, rand, ctx) {
  const split = rand() < 0.5;
  const parts = split
    ? [{ x: block.x, y: block.y, w: block.size, d: block.size * 0.45 }, { x: block.x, y: block.y + block.size * 0.55, w: block.size, d: block.size * 0.45 }]
    : [{ x: block.x + 3, y: block.y + 3, w: block.size - 6, d: block.size - 6 }];
  for (const part of parts) {
    const floors = 2 + Math.floor(rand() * 4);
    const spec = { ...part, z: 0, h: floors * 6.5, floors, pitch: 7, size: 2.8 };
    const mat = ['wall', 'wall2', 'brick'][Math.floor(rand() * 3)];
    ctx.addObject(part.x + part.w / 2, part.y + part.d / 2, (layer) => {
      const g = el('g', {}, layer);
      box(g, { ...spec, mat });
      box(g, { x: part.x + part.w * 0.3, y: part.y + part.d * 0.3, z: spec.h, w: part.w * 0.25, d: part.d * 0.3, h: 2.5, mat: 'concrete' });
      recordBuilding(ctx, g, spec, block.place);
    });
  }
}

function houseBlock(block, rand, ctx) {
  const lot = block.size / 2;
  for (const [ox, oy] of [[0, 0], [lot, 0], [0, lot], [lot, lot]]) {
    if (rand() < 0.12) continue;
    const along = rand() < 0.5 ? 'x' : 'y';
    const w = along === 'x' ? 14 + rand() * 3 : 11 + rand() * 2;
    const d = along === 'x' ? 11 + rand() * 2 : 14 + rand() * 3;
    const x = block.x + ox + (lot - w) / 2, y = block.y + oy + (lot - d) / 2;
    const spec = { x, y, z: 0, w, d, h: 7, floors: 1, pitch: 6.5, size: 2.4 };
    const wall = rand() < 0.5 ? 'wall' : 'wall2';
    const roof = rand() < 0.65 ? 'roof' : 'roof2';
    ctx.addObject(x + w / 2, y + d / 2, (layer) => {
      const g = el('g', {}, layer);
      box(g, { ...spec, mat: wall });
      recordBuilding(ctx, g, spec, block.place, { kind: 'house' });
      gableRoof(g, { x: x - 0.6, y: y - 0.6, z: 7, w: w + 1.2, d: d + 1.2, rise: 5, mat: roof, wall, ridgeAlong: along });
    });
    if (rand() < 0.35) {
      const tx = block.x + ox + lot * 0.85, ty = block.y + oy + lot * 0.85;
      ctx.addObject(tx, ty, (layer) => roundTree(layer, { x: tx, y: ty, r: 4.5, h: 9 }));
    }
  }
}

function parkBlock(block, rand, ctx) {
  for (let k = 0; k < 6; k++) {
    const x = block.x + 6 + rand() * (block.size - 12), y = block.y + 6 + rand() * (block.size - 12);
    ctx.addObject(x, y, (layer) => roundTree(layer, { x, y, r: 4.5 + rand() * 2, h: 9 + rand() * 4 }));
  }
}

// Town A's public buildings, by block. Each registers an anchor so the
// story can mark it (scans, vulnerability markers, sirens).
const CIVIC_PLAN = new Map([
  ['0,-1', townHall],
  ['-1,-2', utilityOffice],
  ['-2,0', hospital],
  ['1,0', fireHall],
  ['-1,1', police],
  ['2,-2', waterTower],
  ['2,1', fuelStation],
]);

function townHall(b, ctx) {
  const spec = { x: b.x + 2, y: b.y + 6, z: 0, w: b.size - 4, d: b.size - 12, h: 15, floors: 2, pitch: 7, size: 3 };
  const cx = spec.x + spec.w / 2, cy = spec.y + spec.d / 2;
  ctx.anchors.townHall = [cx, cy, 44];
  ctx.anchors.townHallRoof = [cx, cy, 36];
  ctx.anchors.siren = [spec.x + spec.w + 1.5, spec.y + spec.d + 2, 20];
  ctx.addObject(cx, cy, (layer) => {
    const g = el('g', {}, layer);
    box(g, { ...spec, mat: 'brick' });
    recordBuilding(ctx, g, spec, b.place, { role: 'town-hall' });
    box(g, { x: cx - 4, y: cy - 4, z: 15, w: 8, d: 8, h: 14, mat: 'wall' });
    gableRoof(g, { x: cx - 5, y: cy - 5, z: 29, w: 10, d: 10, rise: 7, mat: 'roof', wall: 'wall' });
    const [kx, ky] = project(cx + 4, cy, 24);
    el('circle', { cx: kx + 0.5, cy: ky, r: 2.2, class: 'clock' }, g);
  });
  const [sx, sy] = ctx.anchors.siren;
  ctx.addObject(sx, sy, (layer) => {
    const g = el('g', {}, layer);
    box(g, { x: sx - 0.6, y: sy - 0.6, w: 1.2, d: 1.2, h: 18, mat: 'metal' });
    box(g, { x: sx - 2.2, y: sy - 2.2, z: 18, w: 4.4, d: 4.4, h: 2.6, mat: 'navy' });
  });
}

function utilityOffice(b, ctx) {
  const spec = { x: b.x + 4, y: b.y + 8, z: 0, w: b.size - 8, d: b.size - 16, h: 13, floors: 2, pitch: 7, size: 3 };
  const cx = spec.x + spec.w / 2, cy = spec.y + spec.d / 2;
  ctx.anchors.utility = [cx, cy, 28];
  ctx.addObject(cx, cy, (layer) => {
    const g = el('g', {}, layer);
    box(g, { ...spec, mat: 'wall2' });
    recordBuilding(ctx, g, spec, b.place, { role: 'utility' });
    const z = 13.1;
    poly(g, [[cx - 5, cy - 5, z], [cx + 5, cy - 5, z], [cx + 5, cy + 5, z], [cx - 5, cy + 5, z]], 'helipad');
    el('path', { d: quadD([[cx + 1.5, cy - 3.8, z], [cx - 2.2, cy + 0.6, z], [cx - 0.2, cy + 0.6, z], [cx - 1.5, cy + 3.8, z], [cx + 2.2, cy - 0.6, z], [cx + 0.2, cy - 0.6, z]]), class: 'helipad-mark' }, g);
  });
  const [kx, ky] = [b.x + b.size * 0.15, b.y + b.size * 0.2];
  ctx.addObject(kx, ky, (layer) => roundTree(layer, { x: kx, y: ky, r: 4.5, h: 9 }));
}

function hospital(b, ctx) {
  const spec = { x: b.x + 1, y: b.y + 1, z: 0, w: b.size - 2, d: b.size - 8, h: 26, floors: 4, pitch: 6.5, size: 3 };
  const cx = spec.x + spec.w / 2, cy = spec.y + spec.d / 2;
  ctx.anchors.hospital = [cx, cy, 40];
  ctx.addObject(cx, cy, (layer) => {
    const g = el('g', {}, layer);
    box(g, { ...spec, mat: 'white' });
    recordBuilding(ctx, g, spec, b.place, { generator: true, role: 'hospital' });
    const z = 26.1;
    poly(g, [[cx - 8, cy - 8, z], [cx + 8, cy - 8, z], [cx + 8, cy + 8, z], [cx - 8, cy + 8, z]], 'helipad');
    el('path', { d: quadD([[cx - 4, cy - 4.5, z], [cx - 2.4, cy - 4.5, z], [cx - 2.4, cy + 4.5, z], [cx - 4, cy + 4.5, z]]) + quadD([[cx + 2.4, cy - 4.5, z], [cx + 4, cy - 4.5, z], [cx + 4, cy + 4.5, z], [cx + 2.4, cy + 4.5, z]]) + quadD([[cx - 2.4, cy - 0.8, z], [cx + 2.4, cy - 0.8, z], [cx + 2.4, cy + 0.8, z], [cx - 2.4, cy + 0.8, z]]), class: 'helipad-mark' }, g);
  });
}

function fireHall(b, ctx) {
  const spec = { x: b.x + 3, y: b.y + 8, z: 0, w: b.size - 6, d: b.size - 16, h: 11, floors: 1, pitch: 8, size: 3 };
  const cx = spec.x + spec.w / 2, cy = spec.y + spec.d / 2;
  ctx.anchors.fireHall = [cx, cy, 30];
  ctx.anchors.fireHallRoof = [cx, cy, 11];
  ctx.anchors.fireHallDoor = [cx, b.y + b.size + STREET_WIDTH / 2 + 2];
  ctx.addObject(cx, cy, (layer) => {
    const g = el('g', {}, layer);
    box(g, { ...spec, mat: 'brick' });
    const y1 = spec.y + spec.d;
    let doors = '';
    for (let k = 0; k < 3; k++) {
      const x0 = spec.x + 4 + k * ((spec.w - 8) / 3);
      doors += quadD([[x0 + 1, y1, 0], [x0 + (spec.w - 8) / 3 - 1, y1, 0], [x0 + (spec.w - 8) / 3 - 1, y1, 7], [x0 + 1, y1, 7]]);
    }
    el('path', { d: doors, class: 'bay-doors' }, g);
    box(g, { x: spec.x + spec.w - 8, y: spec.y + 1, z: 11, w: 6, d: 6, h: 9, mat: 'brick' });
  });
}

function police(b, ctx) {
  const spec = { x: b.x + 4, y: b.y + 4, z: 0, w: b.size - 8, d: b.size - 14, h: 12, floors: 2, pitch: 7, size: 3 };
  const cx = spec.x + spec.w / 2, cy = spec.y + spec.d / 2;
  ctx.anchors.police = [cx, cy, 28];
  ctx.addObject(cx, cy, (layer) => {
    const g = el('g', {}, layer);
    box(g, { ...spec, mat: 'wall' });
    const y1 = spec.y + spec.d, x1 = spec.x + spec.w;
    el('path', { d: quadD([[spec.x, y1, 5.4], [x1, y1, 5.4], [x1, y1, 6.6], [spec.x, y1, 6.6]]) + quadD([[x1, spec.y, 5.4], [x1, y1, 5.4], [x1, y1, 6.6], [x1, spec.y, 6.6]]), class: 'police-band' }, g);
    recordBuilding(ctx, g, spec, b.place, { role: 'police' });
  });
}

function waterTower(b, ctx) {
  const x = b.x + b.size / 2, y = b.y + b.size / 2;
  ctx.anchors.water = [x, y, 52];
  ctx.anchors.waterTop = [x, y, 37];
  ctx.addObject(x, y, (layer) => {
    const g = el('g', {}, layer);
    const [bx, by] = project(x, y, 0);
    const [tx, ty] = project(x, y, 26);
    el('path', { d: `M${bx - 9} ${by}L${tx - 5} ${ty}M${bx + 9} ${by}L${tx + 5} ${ty}M${bx} ${by + 4}L${tx} ${ty}M${bx - 7} ${(by + ty) / 2 + 3}L${bx + 7} ${(by + ty) / 2 + 3}`, class: 'pylon-steel' }, g);
    cylinder(g, { x, y, z: 26, r: 9, h: 11, mat: 'metal' });
  });
}

function fuelStation(b, ctx) {
  groundPoly(ctx.ground, [[b.x, b.y], [b.x + b.size, b.y], [b.x + b.size, b.y + b.size], [b.x, b.y + b.size]], 'gravel');
  ctx.addObject(b.x + b.size * 0.3, b.y + b.size * 0.7, (layer) => {
    const g = el('g', {}, layer);
    const spec = { x: b.x + 4, y: b.y + b.size - 16, z: 0, w: 16, d: 12, h: 6, floors: 1, pitch: 5, size: 2.4 };
    box(g, { ...spec, mat: 'wall' });
    recordBuilding(ctx, g, spec, b.place, { role: 'fuel' });
  });
  ctx.addObject(b.x + b.size * 0.6, b.y + b.size * 0.4, (layer) => {
    const g = el('g', {}, layer);
    for (const [px, py] of [[8, 6], [30, 6], [8, 20], [30, 20]]) box(g, { x: b.x + px, y: b.y + py, z: 0, w: 1.2, d: 1.2, h: 8, mat: 'metal' });
    box(g, { x: b.x + 5, y: b.y + 3, z: 8, w: 30, d: 20, h: 1.6, mat: 'navy' });
  });
}

export function drawForests(addObject, nodes) {
  for (const f of FORESTS) {
    const rand = seeded(f.seed);
    let placed = 0, tries = 0;
    while (placed < f.count && tries++ < f.count * 6) {
      const a = rand() * Math.PI * 2, r = Math.sqrt(rand());
      const x = f.x + Math.cos(a) * f.rx * r, y = f.y + Math.sin(a) * f.ry * r;
      if (!onSlab(x, y, 12) || insidePlace(x, y, 20) || insideLake(x, y, 12) || insideAirfield(x, y, 20) || nearHighway(x, y, 14) || nearNode(x, y, 55, nodes)) continue;
      const cone = rand() < f.cone;
      const h = cone ? 16 + rand() * 10 : 10 + rand() * 5;
      addObject(x, y, (layer) => (cone ? coneTree(layer, { x, y, r: 5 + rand() * 2, h }) : roundTree(layer, { x, y, r: 5 + rand() * 2.5, h })));
      placed++;
    }
  }
}

export function buildSubstations(ctx) {
  const subs = {};
  for (const place of PLACES) {
    place.subs.forEach(([x, y], i) => {
      const id = `${place.id}${i + 1}`;
      groundPoly(ctx.ground, [[x - 34, y - 24], [x + 34, y - 24], [x + 34, y + 24], [x - 34, y + 24]], 'gravel');
      ctx.addObject(x - 30, y - 20, (layer) => fenceBack(layer, x, y));
      ctx.addObject(x, y - 6, (layer) => {
        const g = el('g', {}, layer);
        box(g, { x: x - 26, y: y - 16, w: 12, d: 10, h: 8, mat: 'metal' });
        box(g, { x: x - 6, y: y - 16, w: 12, d: 10, h: 8, mat: 'metal' });
        bushings(g, [[x - 20, y - 11], [x, y - 11]], 8);
      });
      ctx.addObject(x + 6, y + 8, (layer) => {
        const g = el('g', {}, layer);
        box(g, { x: x + 14, y: y + 4, w: 14, d: 10, h: 7, mat: 'wall2' });
        gantry(g, x, y);
      });
      ctx.addObject(x + 34, y + 24, (layer) => fenceFront(layer, x, y));
      subs[id] = { id, place: place.id, x, y, transformer: [x - 20, y - 11, 8] };
    });
  }
  return subs;
}

function bushings(g, positions, z) {
  let d = '';
  for (const [x, y] of positions) {
    for (const o of [-3.5, 0, 3.5]) {
      const [ax, ay] = project(x + o, y, z), [bx, by] = project(x + o, y, z + 5);
      d += `M${ax} ${ay}L${bx} ${by}`;
    }
  }
  el('path', { d, class: 'bushing' }, g);
}

function gantry(g, x, y) {
  box(g, { x: x - 2, y: y - 22, w: 2, d: 2, h: 24, mat: 'metal' });
  box(g, { x: x - 2, y: y + 18, w: 2, d: 2, h: 24, mat: 'metal' });
  box(g, { x: x - 2, y: y - 22, z: 22, w: 2, d: 42, h: 2, mat: 'metal' });
}

function fenceBack(layer, x, y) {
  const x0 = x - 34, x1 = x + 34, y0 = y - 24, y1 = y + 24;
  const top = (a, b) => `M${project(...a, 6).join(' ')}L${project(...b, 6).join(' ')}`;
  el('path', { d: top([x0, y1], [x0, y0]) + top([x0, y0], [x1, y0]), class: 'fence' }, layer);
}

function fenceFront(layer, x, y) {
  const x0 = x - 34, x1 = x + 34, y0 = y - 24, y1 = y + 24;
  const g = el('g', {}, layer);
  poly(g, [[x0, y1, 0], [x1, y1, 0], [x1, y1, 6], [x0, y1, 6]], 'fence-mesh');
  poly(g, [[x1, y0, 0], [x1, y1, 0], [x1, y1, 6], [x1, y0, 6]], 'fence-mesh');
  const top = (a, b) => `M${project(...a, 6).join(' ')}L${project(...b, 6).join(' ')}`;
  el('path', { d: top([x0, y1], [x1, y1]) + top([x1, y1], [x1, y0]), class: 'fence' }, g);
}

export function buildSwitching(ctx) {
  for (const [x, y] of Object.values(SWITCHING)) {
    groundPoly(ctx.ground, [[x - 22, y - 22], [x + 22, y - 22], [x + 22, y + 22], [x - 22, y + 22]], 'gravel');
    ctx.addObject(x, y, (layer) => gantry(el('g', {}, layer), x, y));
  }
}

export function buildGenerator(ctx) {
  const { x, y } = GEN;
  groundPoly(ctx.ground, [[x - 110, y - 110], [x + 110, y - 110], [x + 110, y + 90], [x - 110, y + 90]], 'gravel');
  const towers = [];
  for (const [tx, ty] of [[x - 60, y - 50], [x + 10, y - 70]]) {
    ctx.addObject(tx, ty, (layer) => towers.push(coolingTower(layer, { x: tx, y: ty, r: 26, h: 64 }).mouth));
  }
  ctx.anchors.operator = [x + 42, y + 5, 40];
  ctx.addObject(x + 40, y + 10, (layer) => {
    const g = el('g', {}, layer);
    const spec = { x: x + 10, y: y - 10, z: 0, w: 64, d: 30, h: 24, floors: 3, pitch: 8, size: 3 };
    box(g, { ...spec, mat: 'concrete' });
    recordBuilding(ctx, g, spec, { id: 'G', x, y, size: 100 });
  });
  ctx.addObject(x + 80, y - 40, (layer) => cylinder(layer, { x: x + 80, y: y - 40, r: 4, h: 90, mat: 'concrete' }));
  ctx.addObject(GEN.node[0], GEN.node[1], (layer) => gantry(el('g', {}, layer), ...GEN.node));
  return { towers };
}

export function buildAirport(ctx) {
  const [x, y] = AIRLINER;
  ctx.anchors.airliner = [x, y, 8];
  ctx.addObject(x - 3, y + 31, (layer) => box(el('g', {}, layer), { x: x - 33, y: y + 25, w: 62, d: 11, h: 9, mat: 'wall' }));
  ctx.addObject(x, y, (layer) => drawAirliner(el('g', {}, layer), x, y));
}

export function drawAirliner(g, x, y) {
  const wing = (side) => [[x + 3, y + side * 2, 3], [x - 5, y + side * 19, 3], [x - 10, y + side * 19, 3], [x - 5, y + side * 2, 3]];
  const tail = (side) => [[x - 18, y + side * 1.5, 5], [x - 23, y + side * 8, 5], [x - 25, y + side * 8, 5], [x - 22, y + side * 1.5, 5]];
  poly(g, wing(-1), 'm-white ft');
  poly(g, tail(-1), 'm-white ft');
  orientedBox(g, { x: x - 3, y: y - 10, z: 0.6, length: 6, width: 2.6, h: 2.4, heading: [1, 0], mat: 'metal' });
  orientedBox(g, { x, y, z: 1.5, length: 46, width: 4.6, h: 4.6, heading: [1, 0], mat: 'white' });
  orientedBox(g, { x: x + 24.5, y, z: 2.2, length: 3, width: 3.2, h: 3.2, heading: [1, 0], mat: 'white' });
  const [wa, wb] = [project(x - 15, y + 2.35, 4.3), project(x + 19, y + 2.35, 4.3)];
  el('path', { d: `M${wa.map((v) => v.toFixed(1)).join(' ')}L${wb.map((v) => v.toFixed(1)).join(' ')}`, class: 'airliner-windows' }, g);
  poly(g, [[x - 19, y, 6.1], [x - 23, y, 6.1], [x - 25, y, 15], [x - 22.5, y, 15]], 'm-white fl');
  poly(g, wing(1), 'm-white ft');
  poly(g, tail(1), 'm-white ft');
  orientedBox(g, { x: x - 3, y: y + 10, z: 0.6, length: 6, width: 2.6, h: 2.4, heading: [1, 0], mat: 'metal' });
}

export function buildLines(layers, addObject, nodes) {
  return LINES.map(([from, to]) => {
    const a = nodes[from], b = nodes[to];
    const dx = b[0] - a[0], dy = b[1] - a[1], len = Math.hypot(dx, dy);
    const perp = [-dy / len, dx / len];
    const spans = Math.max(1, Math.round(len / 115));
    const stations = [];
    for (let k = 0; k <= spans; k++) {
      const x = a[0] + (dx * k) / spans, y = a[1] + (dy * k) / spans;
      const end = k === 0 || k === spans;
      const h = end ? 25.6 : 40;
      stations.push(pylonArms({ x, y, h, perp, arm: 7 }));
      if (!end) addObject(x, y, (layer) => pylon(layer, { x, y, h, perp, arm: 7 }));
    }
    const conductor = (c) => stations.slice(1).map((s, k) => wireD(stations[k][c], s[c], 5)).join('');
    const d = conductor(0) + conductor(1);
    const wire = el('path', { d, class: 'wire' }, layers.wires);
    const flow = el('path', { d, class: 'flow' }, layers.flows);
    const glow = el('path', { d, class: 'line-glow' }, layers.glows);
    return { id: `${from}-${to}`, from, to, wire, flow, glow };
  });
}
