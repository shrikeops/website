import { mountStory } from './story.js';

// Scenes load on demand, so each page downloads only its own.
const SCENES = {
  home: () => import('./scenes/home/index.js').then((m) => m.createHomeScene),
  digital: () => import('./scenes/digital/index.js').then((m) => m.createDigitalScene),
  physical: () => import('./scenes/physical/index.js').then((m) => m.createPhysicalScene),
  about: () => import('./scenes/about/index.js').then((m) => m.createAboutScene),
};

document.documentElement.classList.remove('no-js');

for (const story of document.querySelectorAll('[data-scene]')) {
  const load = SCENES[story.dataset.scene];
  if (!load) throw new Error(`no scene registered for "${story.dataset.scene}"`);
  load().then((createScene) => mountStory(story, createScene));
}
