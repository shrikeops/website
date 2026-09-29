// Everyday traffic on the region's roads: cars run out and back along the
// routes in layout.js, and pages with no grid story of their own add power
// flowing on the lines.

import { el, orientedBox, project } from '../../iso.js';
import { seeded } from '../../random.js';
import { ROUTES } from './layout.js';

export const LANE_OFFSET = 2.6;

const CAR_SPEED = 0.024;

export function buildCars(layer) {
  const rand = seeded(77);
  const cars = [];
  for (const { cars: count, points } of ROUTES) {
    const legs = routeLegs(points);
    const total = legs.reduce((sum, leg) => sum + leg.length, 0);
    for (let k = 0; k < count; k++) {
      const paint = ['wall', 'roof2', 'navy', 'metal', 'white'][Math.floor(rand() * 5)];
      cars.push({ g: el('g', { class: 'car' }, layer), legs, total, offset: (k / count) * total * 2, paint, heading: '' });
    }
  }
  return cars;
}

export function routeLegs(points) {
  return points.slice(1).map((p, i) => ({ from: points[i], to: p, length: Math.hypot(p[0] - points[i][0], p[1] - points[i][1]) }));
}

// Position along a route at a travelled distance, offset into the lane on
// the right of the direction of travel.
export function pointOnRoute(legs, travel, outbound = true) {
  let leg = legs[0];
  for (leg of legs) {
    if (travel <= leg.length) break;
    travel -= leg.length;
  }
  const f = Math.max(0, Math.min(1, travel / leg.length));
  const dir = [(leg.to[0] - leg.from[0]) / leg.length, (leg.to[1] - leg.from[1]) / leg.length];
  const heading = outbound ? dir : [-dir[0], -dir[1]];
  return {
    x: leg.from[0] + (leg.to[0] - leg.from[0]) * f - heading[1] * LANE_OFFSET,
    y: leg.from[1] + (leg.to[1] - leg.from[1]) * f + heading[0] * LANE_OFFSET,
    heading,
  };
}

// Cars run out and back along their route at one shared speed, so no two
// cars share a spot in a lane.
export function carPosition(car, now) {
  const loop = (now * CAR_SPEED + car.offset) % (car.total * 2);
  const outbound = loop < car.total;
  return pointOnRoute(car.legs, outbound ? loop : car.total * 2 - loop, outbound);
}

export function updateCars(cars, now) {
  for (const car of cars) {
    const { x, y, heading } = carPosition(car, now);
    placeVehicle(car, x, y, heading, drawCar);
  }
}

// Everyday life in the region for pages that tell no grid story of their
// own: traffic on the roads and power flowing on the lines. It carries no
// story state.
export function everydayLifeTrack(world) {
  let offset = 0;
  return {
    render() {},
    tick(f) {
      updateCars(world.cars, f.now);
      offset -= f.dt * 0.016;
      for (const line of world.lines) line.flow.style.setProperty('--ambient-march', offset.toFixed(1));
    },
  };
}

export function placeVehicle(vehicle, x, y, heading, draw) {
  const key = heading.map((v) => v.toFixed(3)).join(',');
  if (key !== vehicle.heading) {
    vehicle.g.replaceChildren();
    draw(vehicle, heading);
    vehicle.heading = key;
  }
  const [sx, sy] = project(x, y);
  vehicle.g.setAttribute('transform', `translate(${sx.toFixed(1)} ${sy.toFixed(1)})`);
}

export function drawCar(car, heading) {
  orientedBox(car.g, { length: 7, width: 3.6, h: 2, heading, mat: car.paint });
  orientedBox(car.g, { x: -heading[0] * 0.6, y: -heading[1] * 0.6, z: 2, length: 3.8, width: 3.2, h: 1.5, heading, mat: 'navy' });
  headlights(car.g, heading, 3.6);
}

export function headlights(g, heading, reach) {
  for (const side of [-1, 1]) {
    const [lx, ly] = project(heading[0] * reach - heading[1] * side * 1.2, heading[1] * reach + heading[0] * side * 1.2, 1);
    el('circle', { cx: lx.toFixed(1), cy: ly.toFixed(1), r: 0.8, class: 'headlight' }, g);
  }
}
