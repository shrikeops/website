// The About page's world: an Equal Earth map centred on the Pacific, tilted
// back like a tabletop with a thin earth-coloured edge, so it matches the
// home page's diorama while the continents stay recognisable.

import { el } from '../../iso.js';
import { LAND, LAKES, COUNTRIES, REGION_LAND, REGION_LAKES } from '../../data/world.js';

const CENTRE_LON = 150;
const SCALE = 320;
const TILT = 0.78;
const EDGE = 14;
const NORTH = 84;
const SOUTH = -58;

// Map data keeps longitudes in [-30, 330] so nothing splits at the map's
// edge; places use the same convention.
export const shiftLon = (lon) => (lon < -30 ? lon + 360 : lon);

// Equal Earth (Šavrič, Patterson and Jenny, 2018).
const A1 = 1.340264, A2 = -0.081106, A3 = 0.000893, A4 = 0.003796, M = Math.sqrt(3) / 2;

export function toMap(lon, lat) {
  const lambda = ((lon - CENTRE_LON) * Math.PI) / 180;
  const theta = Math.asin(M * Math.sin((lat * Math.PI) / 180));
  const t2 = theta * theta, t6 = t2 * t2 * t2;
  const x = (lambda * Math.cos(theta)) / (M * (A1 + 3 * A2 * t2 + t6 * (7 * A3 + 9 * A4 * t2)));
  const y = theta * (A1 + A2 * t2 + t6 * (A3 + A4 * t2));
  return [x * SCALE, -y * SCALE * TILT];
}

export const place = (lon, lat) => toMap(shiftLon(lon), lat);

function ringD(ring) {
  let d = '';
  for (let i = 0; i < ring.length; i += 2) {
    const [x, y] = toMap(ring[i], ring[i + 1]);
    d += `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`;
  }
  return `${d}Z`;
}

function lineD(points) {
  return points.map(([lon, lat], i) => {
    const [x, y] = toMap(lon, lat);
    return `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`;
  }).join('');
}

function outlineD() {
  const west = CENTRE_LON - 180, east = CENTRE_LON + 180;
  const points = [];
  for (let lat = NORTH; lat >= SOUTH; lat -= 2) points.push([west, lat]);
  for (let lon = west; lon <= east; lon += 5) points.push([lon, SOUTH]);
  for (let lat = SOUTH; lat <= NORTH; lat += 2) points.push([east, lat]);
  for (let lon = east; lon >= west; lon -= 5) points.push([lon, NORTH]);
  return `${lineD(points)}Z`;
}

export function buildWorldMap(svg) {
  const layers = {};
  for (const name of ['table', 'land', 'region', 'countries', 'arcs', 'pins']) layers[name] = el('g', { class: `map-${name}` }, svg);
  const outline = outlineD();
  el('path', { d: outline, class: 'table-edge', transform: `translate(0 ${EDGE})` }, layers.table);
  el('path', { d: outline, class: 'ocean' }, layers.table);
  let graticule = '';
  for (let lon = CENTRE_LON - 180; lon <= CENTRE_LON + 180; lon += 30) {
    graticule += lineD(Array.from({ length: 36 }, (_, i) => [lon, SOUTH + ((NORTH - SOUTH) * i) / 35]));
  }
  for (let lat = -30; lat <= 60; lat += 30) {
    graticule += lineD(Array.from({ length: 73 }, (_, i) => [CENTRE_LON - 180 + i * 5, lat]));
  }
  el('path', { d: graticule, class: 'graticule' }, layers.table);
  const land = LAND.map(ringD).join('');
  el('path', { d: land, class: 'land-shadow', transform: 'translate(0 2)' }, layers.land);
  el('path', { d: land, class: 'land' }, layers.land);
  el('path', { d: LAKES.map(ringD).join(''), class: 'lake' }, layers.land);
  el('path', { d: REGION_LAND.map(ringD).join(''), class: 'region-land' }, layers.region);
  el('path', { d: REGION_LAKES.map(ringD).join(''), class: 'region-lake' }, layers.region);
  const countries = Object.fromEntries(Object.entries(COUNTRIES).map(([name, rings]) => [
    name,
    el('path', { d: rings.map(ringD).join(''), class: 'country' }, layers.countries),
  ]));
  const [x0] = toMap(CENTRE_LON - 180, 0), [x1] = toMap(CENTRE_LON + 180, 0);
  const [, yTop] = toMap(CENTRE_LON, NORTH), [, yBottom] = toMap(CENTRE_LON, SOUTH);
  return { layers, countries, extent: { x0, x1, y0: yTop, y1: yBottom + EDGE } };
}
