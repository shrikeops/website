// Scene lighting as data. Each time of day is one flat token table with the
// same keys; the scene mixes two tables and writes the result as CSS custom
// properties, so a new time of day is one more table, not new drawing code.

const FACED = ['wall', 'wall2', 'brick', 'roof', 'roof2', 'concrete', 'metal', 'navy', 'white', 'earth'];

const day = {
  sky: '#e6ecea', ground: '#cdd8b3', field1: '#d9dcb2', field2: '#c2d0a1', field3: '#e4d8a8',
  road: '#bab5a9', 'road-line': '#f1ebde', water: '#9fc3cf', 'water-edge': '#c9dfe2', gravel: '#dbd4c3',
  'wall-t': '#fbf7ee', 'wall-l': '#eae0cd', 'wall-r': '#d3c5ad',
  'wall2-t': '#f5e8d3', 'wall2-l': '#e8d0af', 'wall2-r': '#cfb18b',
  'brick-t': '#e3bda5', 'brick-l': '#c99274', 'brick-r': '#ad765b',
  'roof-t': '#93a2b4', 'roof-l': '#748399', 'roof-r': '#627186',
  'roof2-t': '#cf957a', 'roof2-l': '#b67a62', 'roof2-r': '#9a6450',
  'concrete-t': '#e3dfd6', 'concrete-l': '#c9c4b8', 'concrete-r': '#b0aa9d',
  'metal-t': '#bfc7cf', 'metal-l': '#9aa4af', 'metal-r': '#7f8a96',
  'navy-t': '#44567a', 'navy-l': '#33445f', 'navy-r': '#243349',
  'white-t': '#ffffff', 'white-l': '#eef0f2', 'white-r': '#d5dade',
  'earth-t': '#b99c77', 'earth-l': '#b99c77', 'earth-r': '#9b7f5e',
  'tree-a': '#86a97d', 'tree-b': '#5f8a66', 'tree-c': '#8fb07f', 'tree-d': '#a9c592', trunk: '#7c6452',
  fence: '#8a939b', wire: '#5d6775', pylon: '#7c8692', runway: '#8d9497', 'win-off': '#a9bac8',
  mouth: '#6f7882', steam: '#ffffff',
};

const dusk = {
  sky: '#efd6c5', ground: '#a9b18d', field1: '#b5b48b', field2: '#9fa982', field3: '#c3b187',
  road: '#9d948e', 'road-line': '#d9cbbd', water: '#8ea3b6', 'water-edge': '#b5bcc7', gravel: '#bdb0a4',
  'wall-t': '#f4e1cd', 'wall-l': '#d7bfa6', 'wall-r': '#a6978a',
  'wall2-t': '#efd8bd', 'wall2-l': '#d6b594', 'wall2-r': '#a38b76',
  'brick-t': '#d8a88f', 'brick-l': '#b27a63', 'brick-r': '#86604f',
  'roof-t': '#8a8fa3', 'roof-l': '#666c84', 'roof-r': '#51576d',
  'roof2-t': '#c08270', 'roof2-l': '#a06454', 'roof2-r': '#7e5046',
  'concrete-t': '#d9cdc2', 'concrete-l': '#b7aca2', 'concrete-r': '#958b84',
  'metal-t': '#aeb0bc', 'metal-l': '#8c8e9d', 'metal-r': '#6d7081',
  'navy-t': '#3f4b69', 'navy-l': '#2f3a54', 'navy-r': '#222b40',
  'white-t': '#f7ece2', 'white-l': '#e0d4cb', 'white-r': '#b9aea8',
  'earth-t': '#a58468', 'earth-l': '#a58468', 'earth-r': '#83664f',
  'tree-a': '#76906e', 'tree-b': '#50715a', 'tree-c': '#7c9570', 'tree-d': '#93a880', trunk: '#6a5448',
  fence: '#7a7f88', wire: '#4e5566', pylon: '#6d7282', runway: '#7e7e84', 'win-off': '#6f7b8e',
  mouth: '#5f6470', steam: '#f8e9e0',
};

const night = {
  sky: '#0f1b2d', ground: '#1d2b3c', field1: '#212f40', field2: '#1b2838', field3: '#243142',
  road: '#29374a', 'road-line': '#3b4a5f', water: '#132437', 'water-edge': '#1d3148', gravel: '#2a3749',
  'wall-t': '#3a4a61', 'wall-l': '#2d3b50', 'wall-r': '#222e41',
  'wall2-t': '#394760', 'wall2-l': '#2c394f', 'wall2-r': '#212c3f',
  'brick-t': '#3d465c', 'brick-l': '#30384c', 'brick-r': '#252c3d',
  'roof-t': '#2b384c', 'roof-l': '#223043', 'roof-r': '#1b2637',
  'roof2-t': '#34394d', 'roof2-l': '#2a2f40', 'roof2-r': '#212535',
  'concrete-t': '#3a4659', 'concrete-l': '#2e394b', 'concrete-r': '#252e3e',
  'metal-t': '#3f4b5e', 'metal-l': '#323d4f', 'metal-r': '#283141',
  'navy-t': '#2a3650', 'navy-l': '#202a40', 'navy-r': '#172033',
  'white-t': '#46546a', 'white-l': '#384559', 'white-r': '#2c374a',
  'earth-t': '#2a2f3b', 'earth-l': '#2a2f3b', 'earth-r': '#1f232d',
  'tree-a': '#1f3a3e', 'tree-b': '#172e33', 'tree-c': '#21393c', 'tree-d': '#2a4546', trunk: '#1c2530',
  fence: '#3b4658', wire: '#3a475b', pylon: '#435066', runway: '#263243', 'win-off': '#1a2536',
  mouth: '#141c28', steam: '#56627a',
};

const blueHour = {
  ...mixPalettes(dusk, night, 0.5),
  sky: '#565b86', ground: '#5d6b6c', field1: '#646f6c', field2: '#57655f', field3: '#6d6f68',
  water: '#46577a', 'water-edge': '#5a6a8a', 'earth-l': '#5c5362', 'earth-r': '#463f4e',
};

const hot = {
  ...mixPalettes(day, dusk, 0.2),
  sky: '#f6dcbd', ground: '#d4d4a0', field1: '#dfd49e', field2: '#cacc95', field3: '#e8d29a',
  water: '#a7c0c4', 'water-edge': '#d3dcd4', road: '#c0b6a4',
};

const dawn = {
  ...mixPalettes(night, day, 0.42),
  sky: '#98a1ab', ground: '#6f7c78', field1: '#75817a', field2: '#6a776f', field3: '#7d8378',
  water: '#5d7084', 'water-edge': '#73859a', 'earth-l': '#6b6667', 'earth-r': '#565155',
  'win-off': '#4a5566', steam: '#aab1ba',
};

export const PALETTES = { day, hot, dusk, blueHour, night, dawn };

// How strongly lit windows read against each sky: 0 in daylight, 1 after dark.
export const WINDOW_LIGHT = { day: 0, hot: 0, dusk: 1, blueHour: 1, night: 1, dawn: 0.35 };

export const LIT_WINDOW = '#ffd36e';
export const GENERATOR_WINDOW = '#f3e6b4';

export function materialCss() {
  return FACED.map((m) => `.m-${m}.ft{fill:var(--${m}-t)}.m-${m}.fl{fill:var(--${m}-l)}.m-${m}.fr{fill:var(--${m}-r)}`).join('');
}

function toRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function mix(a, b, k) {
  if (k <= 0) return a;
  if (k >= 1) return b;
  const ca = toRgb(a), cb = toRgb(b);
  const c = ca.map((v, i) => Math.round(v + (cb[i] - v) * k));
  return `#${((1 << 24) | (c[0] << 16) | (c[1] << 8) | c[2]).toString(16).slice(1)}`;
}

export function mixPalettes(a, b, k) {
  const out = {};
  for (const key of Object.keys(a)) out[key] = mix(a[key], b[key], k);
  return out;
}
