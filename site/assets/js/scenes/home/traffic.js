// Vehicles. Everyday traffic runs throughout. In the attack pass, the false
// evacuation order fills town A's exit roads: queues form from the town
// edge back into the streets, with a fire truck and a police car stuck in
// them. In the identification pass the roads stay clear and two fire trucks
// drive from the fire hall to the treeline.

import { el, orientedBox, project } from '../../iso.js';
import { seeded } from '../../random.js';
import { ease, lerp, seg } from '../../timeline.js';
import { ROUTES, routeLegs, pointOnRoute, placeVehicle, drawCar, headlights, updateCars } from '../region/index.js';
import { FIRE_POINTS } from './props.js';

const QUEUE = 12;
const GAP = 9;

export function trafficTrack(world, at) {
  const rand = seeded(515);
  const jamLayer = el('g', { class: 'jam' }, world.layers.cars);
  const jam = [];
  ROUTES.slice(0, 4).forEach((route, r) => {
    const legs = routeLegs(route.points);
    const front = legs[0].length + 36;
    for (let k = 0; k < QUEUE; k++) {
      const special = (r === 0 && k === 4) ? 'police' : (r === 3 && k === 3) ? 'fire' : null;
      const vehicle = {
        g: el('g', { class: special ? `vehicle vehicle--${special}` : 'vehicle' }, jamLayer),
        paint: ['wall', 'roof2', 'navy', 'metal', 'white'][Math.floor(rand() * 5)],
        special,
        heading: '',
        legs,
        travel: Math.max(4, front - k * GAP - (special === 'fire' ? 3 : 0)),
        order: k,
      };
      jam.push(vehicle);
    }
  });

  const door = world.anchors.fireHallDoor;
  const responseRoute = routeLegs([[door[0], door[1]], [-174, door[1]], [-206, 78], [FIRE_POINTS[1][0] + 16, FIRE_POINTS[1][1]]]);
  const responseLength = responseRoute.reduce((sum, leg) => sum + leg.length, 0);
  const trucks = [0, 1].map((k) => ({ g: el('g', { class: 'vehicle vehicle--fire' }, world.layers.cars), special: 'fire', heading: '', lag: k * 15 }));
  let flashers = [];

  return {
    render(f) {
      const jammed = f.identified ? 0 : seg(f.sigma, at('gridlock', 0), at('gridlock', 0.12));
      for (const car of world.cars) car.g.style.opacity = (1 - jammed).toFixed(3);
      for (const v of jam) {
        const arrive = f.identified ? 0 : seg(f.sigma, at('gridlock', 0.04 + v.order * 0.04), at('gridlock', 0.1 + v.order * 0.04));
        v.g.style.display = arrive > 0 ? '' : 'none';
        v.g.style.opacity = arrive.toFixed(3);
        if (!arrive) continue;
        const { x, y, heading } = pointOnRoute(v.legs, v.travel - (1 - ease(arrive)) * 16);
        placeVehicle(v, x, y, heading, drawVehicle);
      }
      const rolling = f.identified ? ease(seg(f.sigma, at('fires', 0.06), at('fires', 0.5))) : 0;
      const onScene = f.identified && f.sigma > at('fires', 0.04) && f.sigma < at('cost');
      for (const truck of trucks) {
        truck.g.style.display = onScene ? '' : 'none';
        if (!onScene) continue;
        const travel = Math.max(0, lerp(0, responseLength, rolling) - truck.lag);
        const { x, y, heading } = pointOnRoute(responseRoute, travel);
        placeVehicle(truck, x, y, heading, drawVehicle);
      }
      flashers = [...jam, ...trucks].filter((v) => v.special && v.g.style.display !== 'none').flatMap((v) => [...v.g.querySelectorAll('.beacon')]);
    },
    tick(f) {
      updateCars(world.cars, f.now);
      const on = Math.floor(f.now / 260) % 2 === 0;
      for (const beacon of flashers) beacon.classList.toggle('is-lit', beacon.dataset.phase === '0' ? on : !on);
    },
  };
}

function drawVehicle(vehicle, heading) {
  if (vehicle.special === 'fire') {
    orientedBox(vehicle.g, { length: 13, width: 4.4, h: 3.4, heading, mat: 'brick' });
    orientedBox(vehicle.g, { x: -heading[0] * 1.5, y: -heading[1] * 1.5, z: 3.4, length: 8, width: 2, h: 0.8, heading, mat: 'metal' });
    beacons(vehicle.g, heading, 5.6, 4.6);
    headlights(vehicle.g, heading, 6.4);
    return;
  }
  if (vehicle.special === 'police') {
    orientedBox(vehicle.g, { length: 7.4, width: 3.6, h: 2, heading, mat: 'white' });
    orientedBox(vehicle.g, { x: -heading[0] * 0.6, y: -heading[1] * 0.6, z: 2, length: 3.8, width: 3.2, h: 1.5, heading, mat: 'navy' });
    beacons(vehicle.g, heading, -0.6, 4);
    headlights(vehicle.g, heading, 3.7);
    return;
  }
  drawCar(vehicle, heading);
}

function beacons(g, heading, along, z) {
  [-1, 1].forEach((side, i) => {
    const x = heading[0] * along - heading[1] * side * 1.1;
    const y = heading[1] * along + heading[0] * side * 1.1;
    const [sx, sy] = project(x, y, z);
    el('circle', { cx: sx.toFixed(1), cy: sy.toFixed(1), r: 1, class: 'beacon', 'data-phase': String(i) }, g);
  });
}
