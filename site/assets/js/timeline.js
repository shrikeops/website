// Small pure helpers every scene uses to turn the story position into state.

export const clamp01 = (v) => Math.max(0, Math.min(1, v));
export const seg = (x, a, b) => clamp01((x - a) / (b - a));
export const ease = (k) => k * k * (3 - 2 * k);
export const lerp = (a, b, k) => a + (b - a) * k;

// 0 outside [a, b], rising to 1 and back to 0 across it.
export const pulse = (x, a, b) => (x > a && x < b ? Math.sin(seg(x, a, b) * Math.PI) : 0);

// Up at a..a+fade, down at b-fade..b.
export function window01(x, a, b, fade) {
  return Math.min(seg(x, a, a + fade), 1 - seg(x, b - fade, b));
}

// Beat ids are names ('airport', 'short-circuit'), so beats can be added,
// cut or reordered without touching the scene code. They become positions on
// the story axis: at('airport', 0.5) is halfway through the airport beat. A
// missing id is a page/scene mismatch, so it throws.
export function beatClock(beatIds, sceneName) {
  return (id, p = 0) => {
    const i = beatIds.indexOf(id);
    if (i < 0) throw new Error(`${sceneName} scene needs beat ${id}`);
    return i + p;
  };
}

// Keyframes are [position, value] pairs in ascending order. Returns the two
// values around x and the eased blend factor between them.
export function bracket(keys, x) {
  if (x <= keys[0][0]) return { a: keys[0][1], b: keys[0][1], k: 0 };
  for (let i = 1; i < keys.length; i++) {
    if (x < keys[i][0]) return { a: keys[i - 1][1], b: keys[i][1], k: ease(seg(x, keys[i - 1][0], keys[i][0])) };
  }
  const last = keys[keys.length - 1][1];
  return { a: last, b: last, k: 0 };
}

// Piecewise-linear lookup over [x, y] points in ascending x.
export function piecewise(points, x) {
  if (x <= points[0][0]) return points[0][1];
  for (let i = 1; i < points.length; i++) {
    if (x < points[i][0]) return lerp(points[i - 1][1], points[i][1], seg(x, points[i - 1][0], points[i][0]));
  }
  return points[points.length - 1][1];
}
