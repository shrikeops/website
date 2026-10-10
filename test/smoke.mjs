// Browser smoke test for the story pages. Serves site/ itself on a free port
// and finds the pages from the site's navigation, so a new page is covered as
// soon as the nav links to it.
//
// Each check names the defect it exists to catch:
//   - a track or beat mismatch that throws while scrolling (console/page errors)
//   - two beats with the same id, which would make the scene's timing ambiguous
//   - stateful rendering: every beat's frame reached on the way down must match
//     the same frame reached on the way back up (scrolling up is the reverse)
//   - the reduced-motion path not showing each beat's end state
//   - copy hidden without JavaScript
//   - an evidence beat without a source, or an evidence card with no beat
//   - a broken asset or internal link
//   - horizontal overflow at phone width
//   - the nav linking no story pages, which would leave every per-page check
//     with nothing to check
//
// Run:  PLAYWRIGHT_DIR=<directory holding node_modules/playwright> node test/smoke.mjs
//       SMOKE_BASE_URL=<url> ... runs against that server instead.
// Without PLAYWRIGHT_DIR, playwright is resolved from this repository.

import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import { once } from 'node:events';
import { readFile, stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, extname, join, resolve, sep } from 'node:path';

const require = createRequire(process.env.PLAYWRIGHT_DIR ? join(process.env.PLAYWRIGHT_DIR, '/') : import.meta.url);
const { chromium } = require('playwright');

// The time every scene's ambient motion is frozen at before a frame is
// compared, so rotors, rings and traffic sit in the same place both ways.
const FROZEN_NOW = 123456;
const PROBE = 0.6;
const SETTLE_MS = 900;

const here = dirname(fileURLToPath(import.meta.url));

// Module scripts are refused under any other type than text/javascript.
const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
};

// Serves root from this process on a port the OS picks, so no stale or
// unrelated server can answer in its place, and nothing outlives the test.
async function serveSite(root) {
  root = resolve(root);
  const server = createServer(async (req, res) => {
    const send = (status, headers = {}, body) => res.writeHead(status, headers).end(req.method === 'HEAD' ? undefined : body);
    let pathname, file;
    try { pathname = new URL(req.url, 'http://x').pathname; file = join(root, decodeURIComponent(pathname)); } catch { return send(400); }
    if (file !== root && !file.startsWith(root + sep)) return send(404);
    try {
      if ((await stat(file)).isDirectory()) {
        if (!pathname.endsWith('/')) return send(301, { Location: `${pathname}/` });
        file = join(file, 'index.html');
      }
      const body = await readFile(file);
      send(200, { 'Content-Type': TYPES[extname(file)] ?? 'application/octet-stream', 'Content-Length': body.length }, body);
    } catch { send(404); }
  });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  return `http://127.0.0.1:${server.address().port}`;
}

// Prefixed, so a base URL a dev shell sets for some other tool cannot quietly
// point the test at another server.
const external = process.env.SMOKE_BASE_URL?.replace(/\/$/, '');
const BASE = external || await serveSite(join(here, '..', 'site'));

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

// Opens path, runs fn on it and closes it. What the page logged, and anything
// thrown while opening it or inside fn, is recorded under label, so one broken
// page cannot end the run before the summary. Resolves to fn's result, or
// undefined if something threw.
async function withPage(label, path, options, fn) {
  let opened;
  try {
    opened = await openPage(path, options);
    return await fn(opened);
  } catch (e) {
    failures.push(`${label}: threw ${(e?.message ?? String(e)).split('\n')[0]}`);
  } finally {
    for (const p of opened?.problems ?? []) failures.push(`${label}: ${p}`);
    await opened?.page.close().catch(() => {});
  }
}

// The same 404 is often seen by several sections; it is listed once.
async function finish() {
  await browser.close();
  const unique = [...new Set(failures)];
  if (unique.length) {
    console.error(`FAIL (${unique.length})${external ? ` against ${BASE}` : ''}\n` + unique.map((f) => `  - ${f}`).join('\n'));
    process.exit(1);
  }
  console.log(`PASS: story smoke test (${PAGES.length} pages${external ? ` at ${BASE}` : ''})`);
  process.exit(0);
}

async function storyPages() {
  const paths = await withPage('/ (discovery)', '', {}, ({ page }) => page.evaluate(() => [...document.querySelectorAll('.site-nav a[href]')].map((a) => new URL(a.href).pathname.replace(/^\//, ''))));
  return [...new Set(paths ?? [])];
}

async function scrollToBeat(page, id, fraction) {
  await page.evaluate(([id, fraction]) => {
    const story = document.querySelector('.story');
    const activation = parseFloat(getComputedStyle(story).getPropertyValue('--activation')) || 0.5;
    const beat = document.querySelector(`section[data-beat="${id}"]`);
    const next = beat.nextElementSibling;
    const top = beat.getBoundingClientRect().top;
    const span = (next ? next.getBoundingClientRect().top : beat.getBoundingClientRect().bottom) - top;
    scrollTo(0, scrollY + top + span * fraction - innerHeight * activation);
  }, [id, fraction]);
  await page.waitForTimeout(SETTLE_MS);
}

// The whole stage as one line per element, after ticking the scene at a
// frozen time. An element that is not displayed or fully transparent is
// recorded as hidden without its classes, attributes or children: leftovers nobody
// can see are not differences. The --ambient-* properties carry motion that
// accumulates over time and are left out.
function frame(now) {
  document.querySelector('.story').scene.tick(now);
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

function firstDifferences(a, b, limit = 3) {
  const out = [];
  for (let i = 0; i < Math.max(a.length, b.length) && out.length < limit; i++) {
    if (a[i] !== b[i]) out.push(`      down: ${(a[i] ?? '(missing)').trim().slice(0, 160)}\n      up:   ${(b[i] ?? '(missing)').trim().slice(0, 160)}`);
  }
  return out.join('\n');
}

async function checkReversible(path) {
  await withPage(`/${path}`, path, {}, async ({ page }) => {
    const beats = await page.evaluate(() => {
      const story = document.querySelector('.story[data-scene]');
      return story && [...story.querySelectorAll('section[data-beat]')].map((b) => b.dataset.beat);
    });
    if (!beats?.length) return check(false, `/${path}: no .story[data-scene] with beats — every page linked from .site-nav must be a story page`);
    const down = [];
    for (const id of beats) { await scrollToBeat(page, id, PROBE); down.push(await page.evaluate(frame, FROZEN_NOW)); }
    await scrollToBeat(page, beats[beats.length - 1], 0.95);
    const up = [];
    for (const id of [...beats].reverse()) { await scrollToBeat(page, id, PROBE); up.unshift(await page.evaluate(frame, FROZEN_NOW)); }
    beats.forEach((id, i) => {
      const same = down[i].length === up[i].length && down[i].every((line, k) => line === up[i][k]);
      check(same, `/${path} beat ${id}: the frame differs between scrolling down and scrolling back up\n${firstDifferences(down[i], up[i])}`);
    });
  });
}

const PAGES = await storyPages();
if (PAGES.length === 0) {
  failures.push(`no pages linked from .site-nav at ${BASE}/ — is it serving this checkout's site/?`);
  await finish();
}

// Within a section the pages run side by side: almost all of a run is spent
// waiting for scenes to settle, and story.js smooths by elapsed time, not by
// frame count, so a busier browser settles in the same time.

// 1. Scroll every page down and back up at three widths.
await Promise.all(PAGES.flatMap((path) => [[1440, 900], [1024, 768], [390, 844]].map(([width, height]) =>
  withPage(`/${path} at ${width}px`, path, { viewport: { width, height } }, async ({ page }) => {
    const total = await page.evaluate(() => document.documentElement.scrollHeight);
    for (let y = 0; y < total; y += 250) { await page.evaluate((v) => scrollTo(0, v), y); await page.waitForTimeout(30); }
    for (let y = total; y > 0; y -= 500) { await page.evaluate((v) => scrollTo(0, v), y); await page.waitForTimeout(30); }
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
    check(!overflow, `/${path} at ${width}px: page scrolls horizontally`);
  }))));

// 2. Reversibility: every beat renders the same frame whether the reader
//    arrived from above or from below.
await Promise.all(PAGES.map(checkReversible));

// 3. Reduced motion: arriving at the short-circuit beat shows its end state.
await withPage('reduced motion', '', { reducedMotion: 'reduce' }, async ({ page }) => {
  await scrollToBeat(page, 'short-circuit', 0.05);
  const glow = await page.evaluate(() => Math.max(...[...document.querySelectorAll('.sub-glow')].slice(0, 2).map((g) => +g.style.opacity || 0)));
  check(glow > 0.2, 'reduced motion: the start of the short-circuit beat should already show the struck substations');
});

await Promise.all(PAGES.map(async (path) => {
  // 4. Without JavaScript the stage is hidden and every beat's copy is visible.
  await withPage(`/${path} no-JS`, path, { javaScriptEnabled: false }, async ({ page }) => {
    const state = await page.evaluate(() => ({
      stage: getComputedStyle(document.querySelector('.story-stage')).display,
      hidden: [...document.querySelectorAll('.beat-card')].filter((c) => getComputedStyle(c).opacity !== '1' || c.getBoundingClientRect().height === 0).length,
    }));
    check(state.stage === 'none', `/${path} no-JS: the stage should be hidden`);
    check(state.hidden === 0, `/${path} no-JS: ${state.hidden} beat cards are not visible`);
  });

  // 5. Beats, sources and cards: beat ids are unique, every evidence beat
  //    cites a source, every evidence card belongs to a beat, and internal
  //    links resolve.
  await withPage(`/${path}`, path, {}, async ({ page }) => {
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
  });
}));

await finish();
