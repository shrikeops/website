// Browser smoke test for the story pages. Spawns its own static server on
// site/ and finds the pages from the site's navigation, so a new page is
// covered as soon as the nav links to it.
//
// Each check names the defect it exists to catch:
//   - a track or beat mismatch that throws while scrolling (console/page errors)
//   - two beats with the same id, which would make the scene's timing ambiguous
//   - stateful rendering: every beat's frame reached on the way down must match
//     the same frame reached on the way back up (scrolling up is the reverse)
//   - the reduced-motion path not showing each beat's end state: with ambient
//     motion held still at the page's fixed time, the frame shown must match
//     the beat's end state ticked at that time
//   - copy hidden without JavaScript
//   - an evidence beat without a source, or an evidence card with no beat
//   - a broken asset or internal link
//   - horizontal overflow at phone width
//
// Run:  PLAYWRIGHT_DIR=<directory holding node_modules/playwright> node test/smoke.mjs
//       BASE_URL=<url> ... runs against a live server instead of spawning one.
// Without PLAYWRIGHT_DIR, playwright is resolved from this repository.

import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const require = createRequire(process.env.PLAYWRIGHT_DIR ? join(process.env.PLAYWRIGHT_DIR, '/') : import.meta.url);
const { chromium } = require('playwright');

// The time every scene's ambient motion is frozen at before a frame is
// compared, so rotors, rings and traffic sit in the same place both ways.
const FROZEN_NOW = 123456;
const PROBE = 0.6;
const SETTLE_MS = 900;
// Reduced motion jumps straight to the end of the beat with no smoothing, but
// the wait must still outlast the longest opacity transition inside the
// stage (0.3s on .readout and .greg-stage), which reduced motion leaves on.
const STILL_SETTLE_MS = 500;

const here = dirname(fileURLToPath(import.meta.url));
let BASE = process.env.BASE_URL;
let server = null;
if (!BASE) {
  const PORT = 8190;
  BASE = `http://127.0.0.1:${PORT}`;
  server = spawn('python3', ['-m', 'http.server', String(PORT), '--bind', '127.0.0.1', '--directory', join(here, '..', 'site')], { stdio: 'ignore' });
  process.on('exit', () => server?.kill());
  for (let i = 0; i < 50; i++) {
    try { await fetch(BASE); break; } catch { await new Promise((r) => setTimeout(r, 100)); }
  }
}

const failures = [];
const check = (ok, message) => { if (!ok) failures.push(message); };
const browser = await chromium.launch();

async function openPage(path, options = {}) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, ...options });
  const problems = [];
  page.on('pageerror', (e) => problems.push(`page error: ${e.message}`));
  page.on('console', (m) => { if (m.type() === 'error') problems.push(`console: ${m.text()}`); });
  page.on('response', (r) => { if (r.status() >= 400) problems.push(`HTTP ${r.status()}: ${r.url()}`); });
  await page.goto(`${BASE}/${path}`, { waitUntil: 'networkidle' });
  return { page, problems };
}

async function storyPages() {
  const { page } = await openPage('');
  const paths = await page.evaluate(() => [...document.querySelectorAll('.site-nav a[href]')].map((a) => new URL(a.href).pathname.replace(/^\//, '')));
  await page.close();
  return [...new Set(paths)];
}

async function scrollToBeat(page, id, fraction, wait = SETTLE_MS) {
  await page.evaluate(([id, fraction]) => {
    const story = document.querySelector('.story');
    const activation = parseFloat(getComputedStyle(story).getPropertyValue('--activation')) || 0.5;
    const beat = document.querySelector(`section[data-beat="${id}"]`);
    const next = beat.nextElementSibling;
    const top = beat.getBoundingClientRect().top;
    const span = (next ? next.getBoundingClientRect().top : beat.getBoundingClientRect().bottom) - top;
    scrollTo(0, scrollY + top + span * fraction - innerHeight * activation);
  }, [id, fraction]);
  await page.waitForTimeout(wait);
}

// The whole stage as one line per element, after ticking the scene at the
// given time, or exactly as the engine left it when no time is given. An
// element that is not displayed or fully transparent is recorded as hidden
// without its classes, attributes or children: leftovers nobody can see are
// not differences. The --ambient-* properties carry motion that
// accumulates over time and are left out.
function frame(now) {
  if (now !== undefined) document.querySelector('.story').scene.tick(now);
  const lines = [];
  const walk = (node, depth) => {
    for (const child of node.children) {
      const tag = `${'  '.repeat(depth)}${child.tagName.toLowerCase()}`;
      const s = getComputedStyle(child);
      if (s.display === 'none' || s.visibility === 'hidden' || Number(s.opacity) === 0) {
        lines.push(`${tag} hidden`);
        continue;
      }
      const name = `${tag}${child.classList.length ? '.' + [...child.classList].join('.') : ''}`;
      const attrs = [...child.attributes].filter((a) => a.name !== 'style' && !(a.name === 'class' && a.value === '')).map((a) => `${a.name}=${a.value}`).sort().join(' ');
      const style = (child.getAttribute('style') ?? '').replace(/--ambient-[\w-]+:\s*[^;]*;?/g, '').trim();
      const text = [...child.childNodes].filter((n) => n.nodeType === Node.TEXT_NODE).map((n) => n.textContent.trim()).join('');
      lines.push(`${name} [${attrs}] {${style}} ${text}`);
      walk(child, depth + 1);
    }
  };
  walk(document.querySelector('.stage'), 0);
  return lines;
}

function firstDifferences(a, b, labels = ['down', 'up'], limit = 3) {
  const width = Math.max(...labels.map((l) => l.length)) + 1;
  const [la, lb] = labels.map((l) => `${l}:`.padEnd(width));
  const out = [];
  for (let i = 0; i < Math.max(a.length, b.length) && out.length < limit; i++) {
    if (a[i] !== b[i]) out.push(`      ${la} ${(a[i] ?? '(missing)').trim().slice(0, 160)}\n      ${lb} ${(b[i] ?? '(missing)').trim().slice(0, 160)}`);
  }
  return out.join('\n');
}

const sameFrame = (a, b) => a.length === b.length && a.every((line, k) => line === b[k]);

async function checkReversible(path) {
  const { page, problems } = await openPage(path);
  const beats = await page.evaluate(() => [...document.querySelectorAll('section[data-beat]')].map((b) => b.dataset.beat));
  const down = [];
  for (const id of beats) { await scrollToBeat(page, id, PROBE); down.push(await page.evaluate(frame, FROZEN_NOW)); }
  await scrollToBeat(page, beats[beats.length - 1], 0.95);
  const up = [];
  for (const id of [...beats].reverse()) { await scrollToBeat(page, id, PROBE); up.unshift(await page.evaluate(frame, FROZEN_NOW)); }
  beats.forEach((id, i) => {
    check(sameFrame(down[i], up[i]), `/${path} beat ${id}: the frame differs between scrolling down and scrolling back up\n${firstDifferences(down[i], up[i])}`);
  });
  for (const p of problems) failures.push(`/${path}: ${p}`);
  await page.close();
}

// Under reduced motion the frame shown just after a beat starts must be that
// beat's end state, with ambient motion drawn still at the page's fixed time.
async function checkStill(path) {
  const { page, problems } = await openPage(path, { reducedMotion: 'reduce' });
  const beats = await page.evaluate(() => [...document.querySelectorAll('section[data-beat]')].map((b) => b.dataset.beat));
  for (const [i, id] of beats.entries()) {
    await scrollToBeat(page, id, 0.05, STILL_SETTLE_MS);
    const active = await page.evaluate(() => document.querySelector('.story').dataset.activeBeat);
    if (active !== id) {
      failures.push(`/${path} reduced motion, beat ${id}: scrolling there made beat ${active} active`);
      continue;
    }
    const shown = await page.evaluate(frame);
    await page.evaluate(([i, n]) => {
      const story = document.querySelector('.story');
      story.scene.render(Math.min(n - 0.0001, i + 0.9999));
      story.scene.tick(story.stillNow);
    }, [i, beats.length]);
    const still = await page.evaluate(frame);
    check(sameFrame(shown, still), `/${path} reduced motion, beat ${id}: the frame shown is not the beat's end state drawn still at stillNow\n${firstDifferences(shown, still, ['shown', 'still'])}`);
  }
  for (const p of problems) failures.push(`/${path} reduced motion: ${p}`);
  await page.close();
}

const PAGES = await storyPages();

// 1. Scroll every page down and back up at three widths.
for (const path of PAGES) {
  for (const [width, height] of [[1440, 900], [1024, 768], [390, 844]]) {
    const { page, problems } = await openPage(path, { viewport: { width, height } });
    const total = await page.evaluate(() => document.documentElement.scrollHeight);
    for (let y = 0; y < total; y += 250) { await page.evaluate((v) => scrollTo(0, v), y); await page.waitForTimeout(30); }
    for (let y = total; y > 0; y -= 500) { await page.evaluate((v) => scrollTo(0, v), y); await page.waitForTimeout(30); }
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
    check(!overflow, `/${path} at ${width}px: page scrolls horizontally`);
    for (const p of problems) failures.push(`/${path} at ${width}px: ${p}`);
    await page.close();
  }
}

// 2. Reversibility: every beat renders the same frame whether the reader
//    arrived from above or from below.
for (const path of PAGES) await checkReversible(path);

// 3. Reduced motion: every beat shows its end state with ambient motion held
//    still, and arriving at the short-circuit beat shows the struck
//    substations.
for (const path of PAGES) await checkStill(path);
{
  const { page } = await openPage('', { reducedMotion: 'reduce' });
  await scrollToBeat(page, 'short-circuit', 0.05);
  const glow = await page.evaluate(() => Math.max(...[...document.querySelectorAll('.sub-glow')].slice(0, 2).map((g) => +g.style.opacity || 0)));
  check(glow > 0.2, 'reduced motion: the start of the short-circuit beat should already show the struck substations');
  await page.close();
}

for (const path of PAGES) {
  // 4. Without JavaScript the stage is hidden and every beat's copy is visible.
  {
    const { page } = await openPage(path, { javaScriptEnabled: false });
    const state = await page.evaluate(() => ({
      stage: getComputedStyle(document.querySelector('.story-stage')).display,
      hidden: [...document.querySelectorAll('.beat-card')].filter((c) => getComputedStyle(c).opacity !== '1' || c.getBoundingClientRect().height === 0).length,
    }));
    check(state.stage === 'none', `/${path} no-JS: the stage should be hidden`);
    check(state.hidden === 0, `/${path} no-JS: ${state.hidden} beat cards are not visible`);
    await page.close();
  }

  // 5. Beats, sources and cards: beat ids are unique, every evidence beat
  //    cites a source, every evidence card belongs to a beat, and internal
  //    links resolve.
  {
    const { page } = await openPage(path);
    const audit = await page.evaluate(() => {
      const ids = [...document.querySelectorAll('section[data-beat]')].map((b) => b.dataset.beat);
      return {
        duplicates: ids.filter((id, i) => ids.indexOf(id) !== i),
        unsourced: [...document.querySelectorAll('.beat--evidence')].filter((b) => !b.querySelector('.source a[href^="http"]')).map((b) => b.dataset.beat),
        orphanPlates: [...document.querySelectorAll('[data-plate]')].map((p) => p.dataset.plate).filter((id) => !ids.includes(id)),
        internal: [...new Set([...document.querySelectorAll('a[href]')].map((a) => a.href).filter((h) => h.startsWith(location.origin)))],
      };
    });
    check(audit.duplicates.length === 0, `/${path} beat ids used twice: ${audit.duplicates.join(', ')}`);
    check(audit.unsourced.length === 0, `/${path} evidence beats without a source link: ${audit.unsourced.join(', ')}`);
    check(audit.orphanPlates.length === 0, `/${path} evidence cards without a beat: ${audit.orphanPlates.join(', ')}`);
    for (const href of audit.internal) {
      const status = (await fetch(href)).status;
      check(status === 200, `/${path} internal link ${href} returns ${status}`);
    }
    await page.close();
  }
}

await browser.close();
if (failures.length) {
  console.error(`FAIL (${failures.length})\n` + failures.map((f) => `  - ${f}`).join('\n'));
  process.exit(1);
}
console.log(`PASS: story smoke test (${PAGES.length} pages)`);
process.exit(0);
