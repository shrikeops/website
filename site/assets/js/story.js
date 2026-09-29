// Scroll engine for story pages. A story is a pinned stage plus a column of
// [data-beat] sections. Scroll position becomes one number, t: the index of
// the beat crossing the activation line plus how far through it the reader
// is. Scenes draw from t alone, which is what makes every animation
// reversible by scrolling back up.

const SETTLE = 0.0004;
const SMOOTHING_MS = 90;

export function mountStory(storyEl, createScene) {
  const beats = [...storyEl.querySelectorAll('[data-beat]')];
  const stage = storyEl.querySelector('.stage');
  const scene = createScene(stage, beats.map((b) => b.dataset.beat));
  // The smoke test ticks the scene at one fixed time before comparing frames.
  storyEl.scene = scene;
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');

  let target = 0, shown = null, rendered = null, activeIndex = -1;
  let lastFrame = 0, frameRequested = false, onScreen = true;

  function activationLine() {
    const fraction = parseFloat(getComputedStyle(storyEl).getPropertyValue('--activation')) || 0.5;
    return innerHeight * fraction;
  }

  function measure() {
    const line = activationLine();
    const tops = beats.map((b) => b.getBoundingClientRect().top);
    for (let i = beats.length - 1; i >= 0; i--) {
      if (tops[i] > line) continue;
      const span = i + 1 < beats.length ? tops[i + 1] - tops[i] : beats[i].offsetHeight;
      return Math.min(beats.length - 0.0001, i + Math.min(0.9999, (line - tops[i]) / span));
    }
    return 0;
  }

  function markActive(t) {
    const index = Math.floor(t);
    if (index === activeIndex) return;
    beats[activeIndex]?.classList.remove('is-active');
    beats[index]?.classList.add('is-active');
    activeIndex = index;
    storyEl.dataset.activeBeat = beats[index]?.dataset.beat ?? '';
  }

  function frame(time) {
    frameRequested = false;
    const dt = lastFrame ? time - lastFrame : 16;
    lastFrame = time;
    target = measure();
    if (reducedMotion.matches) {
      const endOfBeat = Math.min(beats.length - 0.0001, Math.floor(target) + 0.9999);
      shown = endOfBeat;
    } else {
      if (shown === null) shown = target;
      const k = 1 - Math.exp(-dt / SMOOTHING_MS);
      shown += (target - shown) * k;
      if (Math.abs(target - shown) < SETTLE) shown = target;
    }
    if (shown !== rendered) scene.render((rendered = shown));
    if (!reducedMotion.matches) scene.tick(time);
    markActive(shown);
    if (onScreen && !reducedMotion.matches) requestFrame();
  }

  function requestFrame() {
    if (frameRequested) return;
    frameRequested = true;
    requestAnimationFrame(frame);
  }

  // A pinned card taller than the room beside (or below) the stage would
  // hide its own ending, so such cards scroll with the page instead.
  function fitCards() {
    const stageBox = stage.getBoundingClientRect();
    const stacked = stageBox.width > storyEl.clientWidth * 0.8;
    const room = stacked ? innerHeight - stageBox.height - 32 : innerHeight * 0.62;
    for (const card of storyEl.querySelectorAll('.beat-card')) {
      card.classList.toggle('is-tall', card.offsetHeight > room);
    }
  }

  new ResizeObserver(([entry]) => {
    scene.resize(entry.contentRect.width, entry.contentRect.height);
    rendered = null;
    fitCards();
    requestFrame();
  }).observe(stage);
  document.fonts?.ready.then(fitCards);

  new IntersectionObserver(([entry]) => {
    onScreen = entry.isIntersecting;
    if (onScreen) requestFrame();
  }).observe(storyEl);

  addEventListener('scroll', requestFrame, { passive: true });
  reducedMotion.addEventListener('change', requestFrame);
  requestFrame();
}
