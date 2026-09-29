// Where everything in the fictional region is, as data, and the questions
// the drawing asks about it: is this point in a town, on a road, on the
// slab? A new town, road or forest is one more record here.

export const PLACES = [
  { id: 'A', x: 0, y: 0, size: 175, seed: 7, civic: true, subs: [[245, -150], [-165, 250]] },
  { id: 'B', x: 820, y: -280, size: 116, seed: 19, subs: [[985, -240], [800, -100]] },
  { id: 'C', x: -280, y: 760, size: 116, seed: 31, subs: [[-110, 740], [-370, 590]] },
  { id: 'D', x: 860, y: 520, size: 108, seed: 43, subs: [[690, 520], [900, 360]] },
  { id: 'E', x: -880, y: -260, size: 108, seed: 59, subs: [[-720, -330], [-880, -90]] },
];

export const SWITCHING = { S1: [430, -310], S2: [-440, 70], S3: [470, 220] };

export const GEN = { x: -430, y: -760, node: [-440, -690] };

// The airport is laid out from its runway's north-west corner, out on the
// southern edge where no power line crosses it: the runway, the apron with
// one parked airliner south of it, and the terminal behind the apron.
export const AIRFIELD = { x: 400, y: 850, w: 320, d: 90 };

export const AIRLINER = [AIRFIELD.x + 135, AIRFIELD.y + 51];

export const LINES = [
  ['G', 'S1'], ['G', 'S2'], ['S1', 'S3'],
  ['G', 'E1'], ['E1', 'E2'], ['S2', 'E2'],
  ['S1', 'A1'], ['S1', 'B2'], ['B2', 'B1'], ['S1', 'B1'],
  ['S2', 'A2'], ['S2', 'C2'], ['C2', 'C1'],
  ['S3', 'D1'], ['D1', 'D2'], ['S3', 'A1'], ['D2', 'B2'],
];

export const LAKE = { x: -250, y: -400, r: 190 };

export const HALF = 1050;

export const STREET_PITCH = 58;

export const STREET_WIDTH = 9;

// Traffic routes. Inside a town every leg runs along a street of its grid;
// only the legs between towns are drawn as highway. Routes share no street
// segment, so cars on different routes never occupy the same lane. The
// first four leave town A, which is where the story's gridlock forms.
export const ROUTES = [
  { cars: 3, points: [[58, 0], [174, 0], [704, -280], [820, -280]] },
  { cars: 3, points: [[0, 58], [0, 174], [-280, 644], [-280, 760]] },
  { cars: 3, points: [[58, 116], [174, 116], [744, 462], [860, 462], [860, 520]] },
  { cars: 3, points: [[-58, 0], [-174, 0], [-764, -260], [-880, -260]] },
  { cars: 1, points: [[-880, -318], [-880, -376], [-540, -700]] },
  { cars: 1, points: [[744, 636], [760, 905], [584, 905]] },
];

export const FORESTS = [
  { x: -330, y: 130, rx: 120, ry: 90, count: 70, seed: 3, cone: 0.8 },
  { x: -780, y: 330, rx: 170, ry: 150, count: 90, seed: 5, cone: 0.9 },
  { x: 250, y: 560, rx: 130, ry: 110, count: 55, seed: 8, cone: 0.6 },
  { x: -120, y: -760, rx: 150, ry: 110, count: 60, seed: 12, cone: 0.9 },
  { x: 980, y: -120, rx: 110, ry: 160, count: 55, seed: 14, cone: 0.7 },
  { x: -960, y: -700, rx: 110, ry: 90, count: 40, seed: 16, cone: 1 },
  { x: 460, y: -850, rx: 140, ry: 90, count: 45, seed: 18, cone: 0.85 },
];

export function distToSegment(px, py, [ax, ay], [bx, by]) {
  const dx = bx - ax, dy = by - ay;
  const k = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy || 1)));
  return Math.hypot(px - (ax + dx * k), py - (ay + dy * k));
}

export function nearHighway(x, y, margin) {
  return ROUTES.some(({ points }) => points.slice(1).some((p, i) => distToSegment(x, y, points[i], p) < margin));
}

export function openRoadSegments() {
  return ROUTES.flatMap(({ points }) => points.slice(1).map((p, i) => [points[i], p]))
    .filter(([a, b]) => !insidePlace((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, 0));
}

export function insidePlace(x, y, pad) {
  return PLACES.some((p) => Math.abs(x - p.x) < p.size + pad && Math.abs(y - p.y) < p.size + pad);
}

export function insideAirfield(x, y, pad) {
  return x > AIRFIELD.x - pad && x < AIRFIELD.x + AIRFIELD.w + pad && y > AIRFIELD.y - pad && y < AIRFIELD.y + AIRFIELD.d + pad;
}

// Whether a point is on the region's ground slab, with room for a tree crown.
export function onSlab(x, y, pad) {
  return Math.abs(x) < HALF - pad && Math.abs(y) < HALF - pad;
}

export function insideLake(x, y, pad) {
  return Math.hypot(x - LAKE.x, y - LAKE.y) < LAKE.r + pad;
}

export function nearNode(x, y, pad, nodes) {
  return Object.values(nodes).some(([nx, ny]) => Math.hypot(x - nx, y - ny) < pad);
}
