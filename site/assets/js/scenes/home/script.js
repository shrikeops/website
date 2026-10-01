// The home story's script: which moment of the scenario each beat shows,
// when each substation is hit, and where the camera and the light sit.
//
// Two clocks run through the story. t is the reader's position (beat index
// plus progress). sigma is scenario time, measured on the attack beats' own
// scale, so at('short-circuit', 0.5) means "halfway through the short circuit" in
// both passes. The attack pass plays sigma forward, the rewind plays it
// backwards, and the identification pass replays chosen stretches of it.

import { project } from '../../iso.js';
import { PLACES, regionView } from '../region/index.js';
import { ease, lerp, seg } from '../../timeline.js';

export const BLACKOUT = { A: 0.22, E: 0.34, B: 0.44, C: 0.54, D: 0.62, G: 0.72 };
export const STRIKE_OFFSETS = { A: '+0:00', B: '+0:14', C: '+0:22', D: '+0:37', E: '+0:51' };

const REPLAYS = [
  ['weeks-before', 'reconnaissance', 'waiting'],
  ['the-evening', 'weather', 'launch'],
  ['listening', 'pennsylvania', 'pennsylvania'],
  ['five-places', 'short-circuit', 'coordination'],
  ['planned-outage', 'cascade', 'cascade'],
  ['no-false-alerts', 'false-alerts', 'gridlock'],
  ['fires-reached', 'fires', 'fires'],
];

export function scenarioAt(t, at) {
  const calm = at('reconnaissance') - 0.001;
  if (t < at('reconnaissance')) return { sigma: calm, identified: false };
  if (t < at('rewind')) return { sigma: t, identified: false };
  if (t < at('weeks-before')) return { sigma: lerp(at('cost', 1), at('reconnaissance'), ease(seg(t, at('rewind'), at('rewind', 1)))), identified: false };
  for (const [beat, from, to] of REPLAYS) {
    if (t < at(beat, 1)) return { sigma: lerp(at(from), at(to, 1), seg(t, at(beat), at(beat, 1))), identified: true };
  }
  return { sigma: calm, identified: true };
}

// Per substation: when its drones fly, when they come down in each pass,
// when the attack pass's short circuit flashes, and when the identification
// pass hears the drones and switches the substation off.
export function buildSchedule(at) {
  const subs = {};
  PLACES.forEach((place, k) => {
    place.subs.forEach((_, i) => {
      const id = `${place.id}${i + 1}`;
      const heardLag = k * 0.03;
      const identified = [at('coordination', 0.56 + heardLag + i * 0.02), at('coordination', 0.76 + heardLag + i * 0.02)];
      let fly, attack;
      if (place.id === 'A') {
        fly = [at('launch', 0.05), at('launch', 0.9)];
        attack = [at('short-circuit', 0.08 + i * 0.08), at('short-circuit', 0.62 + i * 0.08)];
      } else {
        const lag = (k - 1) * 0.045 + i * 0.02;
        fly = [at('coordination', 0.12), at('coordination', 0.52)];
        attack = [at('coordination', 0.52 + lag), at('coordination', 0.72 + lag)];
      }
      subs[id] = {
        id,
        place: place.id,
        fly,
        strike: { attack, identified },
        flashAt: lerp(attack[0], attack[1], 0.6),
        heardAt: at('coordination', 0.28 + heardLag),
        offAt: at('coordination', 0.48),
      };
    });
  });
  return { subs, firstFlash: subs.A1.flashAt };
}

// Every shot is framed on a point in the region plus an offset, so moving a
// town, a substation or the airport keeps its shots on it.
export function buildCameraKeys(at, world) {
  const ground = ([x, y]) => project(x, y);
  const aim = ([px, py], dx, dy, w, h, minCrop = 0.7) => ({ cx: px + dx, cy: py + dy, w, h, minCrop });
  const townA = ground(world.anchors['place-A']);
  const hall = ground(world.anchors.townHall);
  const a1 = ground([world.subs.A1.x, world.subs.A1.y]);
  const hero = aim(townA, -40, 30, 700, 430);
  const airport = aim(project(...world.anchors.airliner), 0, -10, 300, 190, 0.75);
  const townHall = aim(hall, -28, -40, 400, 250, 0.75);
  const town = aim(townA, 0, 0, 800, 470);
  const close = aim(townA, -20, 40, 1080, 560);
  const push = aim(townA, 170, 30, 820, 460);
  const forest = aim(townA, -190, -20, 720, 420);
  const transformer = aim(a1, -25, -22.5, 440, 270, 0.75);
  const substation = aim(a1, 0, -47.5, 340, 220, 0.8);
  const grid = regionView(world);
  return [
    [at('title'), hero], [at('title', 0.5), hero],
    [at('drones', 0.2), airport], [at('drones', 0.85), airport],
    [at('ai', 0.2), townHall], [at('ai', 0.85), townHall],
    [at('leipzig', 0.25), grid], [at('scenario', 0.55), grid],
    [at('reconnaissance', 0.1), town], [at('weather', 0.9), town],
    [at('launch', 0.2), close], [at('pennsylvania', 0.15), push], [at('pennsylvania', 0.85), push],
    [at('short-circuit', 0.1), close], [at('coordination', 0.02), close], [at('coordination', 0.48), grid],
    [at('false-alerts', 0.4), grid], [at('false-alerts', 0.62), town], [at('gridlock', 0.9), town],
    [at('fires', 0.25), forest], [at('fires', 0.9), forest],
    [at('months-after', 0.25), transformer], [at('months-after', 0.85), transformer],
    [at('cost', 0.35), grid], [at('rewind', 0.3), grid], [at('rewind', 0.95), town],
    [at('weeks-before', 0.72), town], [at('weeks-before', 0.92), grid], [at('the-evening', 0.1), grid],
    [at('the-evening', 0.55), close], [at('listening', 0.2), substation], [at('listening', 0.88), substation],
    [at('five-places', 0.3), grid], [at('planned-outage', 0.95), grid],
    [at('no-false-alerts', 0.3), town], [at('no-false-alerts', 0.9), town],
    [at('fires-reached', 0.2), forest], [at('fires-reached', 0.9), forest],
    [at('two-areas', 0.5), hero],
  ];
}

// Palette names from palette.js, keyed on the reader's position.
export function buildPaletteKeys(at) {
  return [
    [at('title'), 'day'], [at('weather', 0.1), 'day'], [at('weather', 0.8), 'hot'], [at('launch', 0.25), 'dusk'],
    [at('cascade', 0.25), 'dusk'], [at('cascade', 0.55), 'blueHour'], [at('cascade', 0.85), 'night'],
    [at('months-after', 0.1), 'night'], [at('months-after', 0.6), 'dawn'], [at('rewind', 0.05), 'dawn'],
    [at('rewind', 0.35), 'night'], [at('rewind', 0.65), 'dusk'], [at('rewind', 0.95), 'day'],
    [at('the-evening', 0.1), 'day'], [at('the-evening', 0.45), 'hot'], [at('the-evening', 0.9), 'dusk'],
    [at('planned-outage', 0.2), 'dusk'], [at('planned-outage', 0.85), 'blueHour'], [at('no-false-alerts', 0.4), 'night'],
    [at('two-areas', 0.05), 'night'], [at('two-areas', 0.6), 'day'],
  ];
}

// The timeline rail's four stops, placed on scenario time.
export function railPoints(at) {
  return [[at('reconnaissance'), 0], [at('weather', 0.5), 1 / 3], [at('false-alerts'), 2 / 3], [at('months-after', 0.5), 1]];
}
