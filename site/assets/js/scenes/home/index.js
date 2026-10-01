// The home page's scene: the fictional region, the story's script, and one
// track per part of the story. A new element of the story is one more track.

import { storyScene } from '../base.js';
import { buildRegion } from '../region/index.js';
import { homeProps } from './props.js';
import { scenarioAt, buildSchedule, buildCameraKeys, buildPaletteKeys } from './script.js';
import { powerTrack } from './power.js';
import { strikesTrack } from './strikes.js';
import { dronesTrack } from './drones.js';
import { cyberTrack } from './cyber.js';
import { trafficTrack } from './traffic.js';
import { firesTrack } from './fires.js';
import { vignettesTrack } from './vignettes.js';
import { identificationTrack } from './identification.js';
import { hudTrack } from './hud.js';
import { perchTrack } from '../furniture.js';

export function createHomeScene(stage, beatIds) {
  return storyScene(stage, beatIds, 'home', ({ svg, at }) => {
    const world = buildRegion(svg, { props: homeProps() });
    const schedule = buildSchedule(at);
    return {
      cameraKeys: buildCameraKeys(at, world),
      paletteKeys: buildPaletteKeys(at),
      frameAt: (t) => scenarioAt(t, at),
      tracks: [
        powerTrack(world, schedule, at),
        strikesTrack(world, schedule, at),
        dronesTrack(world, schedule),
        cyberTrack(world, at),
        trafficTrack(world, at),
        firesTrack(world, at),
        vignettesTrack(world, at),
        identificationTrack(svg, world, schedule, at),
        hudTrack(stage, at),
        perchTrack(stage, [
          { leave: [at('title', 0.45), at('title', 0.95)] },
          { arrive: [at('two-areas', 0.15), at('two-areas', 0.7)] },
        ]),
      ],
    };
  });
}
