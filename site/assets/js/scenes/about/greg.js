// Greg as a flat cartoon, front on: tall, brown hair, blue eyes. One body
// and face, five outfits, one per chapter of the About story. Art is data
// here, so the outfits are plain SVG markup keyed by name.

const SKIN = '#f3caa9';
const SKIN_SHADE = '#e2ae8b';
const HAIR = '#6a4630';

const TORSO = 'M52 98 C60 94 100 94 108 98 L112 188 L48 188 Z';
const SLEEVE_L = 'M52 98 C44 100 38 104 36 112 L34 192 L48 192 L50 130 Z';
const SLEEVE_R = 'M108 98 C116 100 122 104 124 112 L126 192 L112 192 L110 130 Z';
const SHORT_SLEEVE_L = 'M52 98 C44 100 38 104 36 112 L35 134 L50 134 L50 120 Z';
const SHORT_SLEEVE_R = 'M108 98 C116 100 122 104 124 112 L125 134 L110 134 L110 120 Z';
const FOREARMS = 'M35 132 L49 132 L48 194 L36 194 Z M111 132 L125 132 L124 194 L112 194 Z';
const PANTS = 'M49 186 L111 186 L108 300 L84 300 L80 212 L76 300 L52 300 Z';
const BOOTS = 'M51 297 L77 297 L78 312 C70 316 58 316 48 313 Z M83 297 L109 297 L112 313 C102 316 90 316 82 312 Z';
const SHOES = 'M50 299 L77 299 L78 311 C70 315 58 315 46 312 Z M83 299 L110 299 L114 312 C102 315 90 315 82 311 Z';

// AUSCAM-style camouflage: large interlocking blotches over a light base.
// Small garments take a smaller scale so a few blotches still show.
const camo = (id, base, [large, mid, dark, darkest], scale = 1) => `
  <pattern id="${id}" patternUnits="userSpaceOnUse" width="64" height="64" patternTransform="scale(${scale})">
    <rect width="64" height="64" fill="${base}"/>
    <path d="M-2 10C6 1 22 3 27 11C31 19 21 27 12 25C3 23-4 18-2 10Z M34 34C42 27 58 30 60 40C62 50 50 56 42 52C34 48 30 40 34 34Z M4 58C10 52 20 54 22 62L22 66L2 66Z" fill="${large}"/>
    <path d="M28 1C36-3 47 4 45 12C43 18 35 17 31 13C27 9 24 5 28 1Z M7 39C13 33 24 37 22 46C20 52 10 53 7 47Z M50 58C56 54 64 58 66 64L48 66Z" fill="${mid}"/>
    <path d="M40 17C48 14 60 21 56 30C52 36 43 33 40 26Z M19 53C25 49 34 55 30 62C26 66 18 62 19 53Z M-2 30C3 27 8 31 6 36C3 39-2 36-2 30Z" fill="${dark}"/>
    ${darkest ? `<path d="M46 44C50 41 55 45 52 49C49 52 45 48 46 44Z M14 28C18 26 21 30 18 33C15 34 12 31 14 28Z M58 6C61 5 63 8 61 10Z" fill="${darkest}"/>` : ''}
  </pattern>`;

const M4 = `
  <g transform="translate(56 118) rotate(56)">
    <path d="M0 -4L14 -5L14 5L2 6Z" fill="#23272c"/>
    <rect x="14" y="-2" width="10" height="4" fill="#353b43"/>
    <rect x="24" y="-7" width="22" height="12" rx="1" fill="#23272c"/>
    <rect x="24" y="-10" width="20" height="3" fill="#353b43"/>
    <path d="M30 5L36 5L33 15L28 14Z" fill="#16191d"/>
    <path d="M40 5L47 5C48 12 50 17 52 21L45 23C43 18 41 12 40 5Z" fill="#16191d"/>
    <rect x="46" y="-6" width="26" height="9" rx="1.5" fill="#2c3137"/>
    <path d="M50 -3H68M50 0H68" stroke="#16191d" stroke-width="0.8"/>
    <path d="M70 -6L72 -12L74 -12L74 -6Z" fill="#23272c"/>
    <rect x="72" y="-2" width="16" height="2.4" fill="#23272c"/>
    <rect x="88" y="-2.6" width="5" height="3.6" fill="#16191d"/>
  </g>`;

const JEANS_AND_SNEAKERS = `
  <path d="${PANTS}" fill="#3f5f8e"/>
  <path d="M80 212L76 300 M80 212L84 300" stroke="#34507a" stroke-width="1.2" fill="none"/>
  <path d="${SHOES}" fill="#f4f4f0"/>
  <path d="M46 311C58 315 70 315 78 311 M82 311C90 315 102 315 114 312" stroke="#b8bcc2" stroke-width="2.4" fill="none"/>`;

// A crew-neck t-shirt over jeans, with a print on the chest.
const tee = (colour, edge, print) => `
  ${JEANS_AND_SNEAKERS}
  <path d="${FOREARMS}" fill="${SKIN}"/>
  <path d="M69 92C70 105 90 105 91 92Z" fill="${SKIN_SHADE}"/>
  <path d="${SHORT_SLEEVE_L} ${SHORT_SLEEVE_R}" fill="${colour}" stroke="${edge}" stroke-width="0.8"/>
  <path d="M52 98C58 95 65 94 70 94C72 102 88 102 90 94C95 94 102 95 108 98L110 190L50 190Z" fill="${colour}" stroke="${edge}" stroke-width="0.8"/>
  <path d="M70 94C72 102 88 102 90 94" stroke="${edge}" stroke-width="2.2" fill="none"/>
  ${print}`;

const AMNESTY_LOGO = `
  <path d="M80 110C84 114 84 119 80 122C76 119 76 114 80 110Z" fill="#111"/>
  <rect x="77" y="123" width="6" height="22" rx="1" fill="#111"/>
  <path d="M70 128C76 124 84 132 90 127 M70 138C76 134 84 142 90 137" stroke="#111" stroke-width="1.3" fill="none"/>
  <path d="M72 124l2 3m-1 -3l-2 3 M88 129l2 3m-1 -3l-2 3 M72 134l2 3m-1 -3l-2 3 M88 139l2 3m-1 -3l-2 3" stroke="#111" stroke-width="0.9"/>`;

// The site logo (assets/img/logo.svg, a 64-unit square) on the chest.
const SHRIKE_OPS_LOGO = `
  <g transform="translate(65 106) scale(0.47)">
    <polygon fill="#7f8c9d" points="10,30 18,14 31,7 31,21 17,27"/>
    <polygon fill="#a7b2bf" points="31,7 45,10 51,16 53,20 46,19.5 40,18.5 31,21"/>
    <polygon fill="#606d7f" points="10,30 17,27 18,30.5 19,41 24,56 9,56 6,44"/>
    <polygon fill="#fffdf8" stroke="#ddd5c4" stroke-width="1" points="18,30.5 30,29.8 38,31.5 46,29 53,27 51,33 46,40 43,56 24,56 19,41"/>
    <polygon fill="#d8cdb9" points="53,27 51,33 46,40 43,56 34,56 37,45 45,35"/>
    <polygon fill="#14233a" points="17,27 31,21 40,18.5 46,19.5 53,20 53,27 46,29 38,31.5 30,29.8 18,30.5"/>
    <polygon fill="#2b3d59" points="53,20 59,19.3 63.5,23 63,30.5 59.8,26 53,27"/>
    <polygon fill="#14233a" points="9,56 24,56 12,45"/>
    <polygon fill="#e3a63a" points="40,21.2 43.8,25 40,28.8 36.2,25"/>
  </g>`;

// A green shopping bag with an S, after the Shopify mark.
const SHOPIFY_LOGO = `
  <g transform="translate(80 128)">
    <path d="M-4 -5C-4 -11 4 -11 4 -5" stroke="#5e8e3e" stroke-width="1.8" fill="none"/>
    <path d="M-8 -5L8 -5L9.5 11L-9.5 11Z" fill="#95bf47"/>
    <path d="M3 -1.2C1.5 -2.8 -3 -2.4 -3 0.4C-3 3.2 3 2.6 3 5.6C3 8.6 -2 8.8 -3.6 6.8" stroke="#fff" stroke-width="1.7" fill="none" stroke-linecap="round"/>
  </g>`;

const OUTFITS = {
  army: `
    <path d="${PANTS}" fill="url(#dpcu)" stroke="url(#dpcu)" stroke-width="1.2"/>
    <path d="${BOOTS}" fill="#20242a"/>
    <path d="${SLEEVE_L} ${SLEEVE_R}" fill="url(#dpcu)" stroke="url(#dpcu)" stroke-width="1.2"/>
    <path d="${TORSO}" fill="url(#dpcu)" stroke="url(#dpcu)" stroke-width="1.2"/>
    <path d="M73 96L65 112L80 104Z M87 96L95 112L80 104Z" fill="#1f2a1a" opacity="0.28"/>
    <path d="M57 116h17v19h-17z M86 116h17v19h-17z" fill="#1f2a1a" opacity="0.16"/>
    <path d="M57 116h17v5h-17z M86 116h17v5h-17z" fill="#1f2a1a" opacity="0.22"/>
    <rect x="49" y="182" width="62" height="6" fill="#3b3a2c"/>`,
  afghanistan: `
    <path d="${PANTS}" fill="url(#dpdu)" stroke="url(#dpdu)" stroke-width="1.2"/>
    <path d="${BOOTS}" fill="#a8875c"/>
    <path d="${SLEEVE_L} ${SLEEVE_R}" fill="url(#dpdu)" stroke="url(#dpdu)" stroke-width="1.2"/>
    <path d="${TORSO}" fill="url(#dpdu)" stroke="url(#dpdu)" stroke-width="1.2"/>
    <path d="M54 104L106 104C108 130 108 160 106 178L54 178C52 160 52 130 54 104Z" fill="#b7a27a"/>
    <path d="M54 104L62 96L70 97L66 106Z M106 104L98 96L90 97L94 106Z" fill="#a38e66"/>
    <path d="M57 162h13v14h-13z M73 162h14v14h-14z M90 162h13v14h-13z" fill="#a38e66"/>
    <path d="M58 118L60 99 M96 168C104 140 108 118 104 99" stroke="#5c5e3e" stroke-width="2.6" fill="none" stroke-linecap="round"/>
    ${M4}`,
  graduation: `
    <path d="M52 268h56v32H52z" fill="#2a2f3a"/>
    <path d="${SHOES}" fill="#16191d"/>
    <path d="M50 96C60 92 100 92 110 96C122 102 130 120 134 198L114 202L112 150L110 272L50 272L48 150L46 202L26 198C30 120 38 102 50 96Z" fill="#1d2230"/>
    <path d="M64 120L62 270 M96 120L98 270 M80 130V270" stroke="#2c3345" stroke-width="1.4"/>
    <path d="M70 96L80 118L90 96L96 98L84 130L76 130L64 98Z" fill="#d99a2b"/>
    <g transform="translate(20 196) rotate(-18)"><rect width="28" height="8" rx="4" fill="#fffdf8"/><rect x="12" width="4" height="8" fill="#c0341d"/></g>`,
  amnesty: tee('#ffe000', '#e6ca00', AMNESTY_LOGO),
  hoodie: `
    ${JEANS_AND_SNEAKERS}
    <path d="${SLEEVE_L} ${SLEEVE_R}" fill="#8d949c"/>
    <path d="M34 184h14v8h-14z M112 184h14v8h-14z" fill="#7a818a"/>
    <path d="M52 98C60 94 100 94 108 98L112 190L48 190Z" fill="#8d949c"/>
    <path d="M48 182h64v8h-64z" fill="#7a818a"/>
    <path d="M62 92C66 104 94 104 98 92C104 94 106 100 104 106C94 114 66 114 56 106C54 100 56 94 62 92Z" fill="#a0a7af"/>
    <path d="M60 154L100 154L104 180L56 180Z" fill="#7f868e"/>
    <path d="M74 106L73.6 117 M86 106L86.4 117" stroke="#eef1f4" stroke-width="1.4" stroke-linecap="round"/>
    ${SHOPIFY_LOGO}`,
  shrikeops: tee('#fbf8f0', '#ddd5c4', SHRIKE_OPS_LOGO),
};

const HEADWEAR = {
  army: `
    <path d="M28 40C30 34 54 33 64 34L100 35L100 42C80 46 50 46 32 45C28 44 27 42 28 40Z" fill="#8a7550"/>
    <path d="M57 37C57 18 70 11 81 11C93 11 105 18 105 37Z" fill="#a38d62"/>
    <path d="M81 12L80.5 30" stroke="#8a7550" stroke-width="1.6"/>
    <rect x="57" y="30" width="48" height="7" fill="#6b6a48"/>
    <path d="M57 32h48 M57 35h48" stroke="#83825a" stroke-width="0.8"/>
    <path d="M100 36C104 30 106 18 112 9C117 15 119 28 116 41L103 42Z" fill="#96805a"/>
    <circle cx="110" cy="26" r="4.2" fill="#d4a637"/>
    <path d="M106 26a4 4 0 0 1 8 0" fill="#b88a25"/>`,
  afghanistan: `
    <path d="M55 44C54.5 31 57.5 22.5 67 21C75 19.8 85 19.8 93 21C102.5 22.5 105.5 31 105 44Z" fill="url(#dpdu-cap)"/>
    <path d="M80 20.2V43 M66 21.4C62 28 61 36 61.5 43 M94 21.4C98 28 99 36 98.5 43" stroke="#8a7a58" stroke-width="0.7" fill="none" opacity="0.7"/>
    <circle cx="80" cy="20.4" r="1.7" fill="#a8946a"/>
    <path d="M52 42C62 38 98 38 108 42C108 48.5 97 53.5 80 53.5C63 53.5 52 48.5 52 42Z" fill="url(#dpdu-cap)"/>
    <path d="M52 42C52 48.5 63 53.5 80 53.5C97 53.5 108 48.5 108 42C102 47 92 49.5 80 49.5C68 49.5 58 47 52 42Z" fill="#6b5a3c" opacity="0.28"/>
    <path d="M52.4 42C62 38.4 98 38.4 107.6 42" stroke="#7a6a4a" stroke-width="1.1" fill="none"/>
    <path d="M56 44.2C66 41.4 94 41.4 104 44.2 M58.5 46.4C68 43.8 92 43.8 101.5 46.4 M61.5 48.4C70 46.2 90 46.2 98.5 48.4" stroke="#7a6a4a" stroke-width="0.55" fill="none" opacity="0.7"/>`,
  graduation: `
    <path d="M56 41C58 30 102 30 104 41L104 46L56 46Z" fill="#1d2230"/>
    <path d="M42 30L80 17L118 30L80 43Z" fill="#232938"/>
    <path d="M42 30L80 43L80 45L42 32Z" fill="#161a24"/>
    <circle cx="80" cy="30" r="2" fill="#d99a2b"/>
    <path d="M80 30L111 33L112 50" stroke="#d99a2b" stroke-width="1.6" fill="none"/>
    <path d="M109 50h6l-1 9h-4z" fill="#d99a2b"/>`,
};

// Short hair, one shape, hugging the skull so every hat covers it; the
// sideburns run down to the ears so it reads as attached at the sides.
const HEAD = `
  <ellipse cx="57" cy="61" rx="4.2" ry="6.4" fill="${SKIN_SHADE}"/>
  <ellipse cx="103" cy="61" rx="4.2" ry="6.4" fill="${SKIN_SHADE}"/>
  <path d="M58 50C58 30 102 30 102 50L102 64C102 80 92 88 80 88C68 88 58 80 58 64Z" fill="${SKIN}"/>
  <path d="M57.4 58L57 47C56.4 32 67 29.5 80 29.5C93 29.5 103.6 32 103 47L102.6 58L100.4 58L100.2 46.5C98.5 42 95 40 90 40.5C84 41 78 44.5 70 44C65 43.8 61.5 44.5 59.8 46.5L59.6 58Z" fill="${HAIR}"/>
  <path d="M65 52Q70 49 75 52 M85 52Q90 49 95 52" stroke="${HAIR}" stroke-width="2.2" fill="none" stroke-linecap="round"/>
  <ellipse cx="70" cy="59" rx="4.4" ry="3.7" fill="#fff"/>
  <ellipse cx="90" cy="59" rx="4.4" ry="3.7" fill="#fff"/>
  <circle cx="70.6" cy="59.4" r="2.5" fill="#3c7fd6"/>
  <circle cx="90.6" cy="59.4" r="2.5" fill="#3c7fd6"/>
  <circle cx="70.6" cy="59.4" r="1.1" fill="#1b2433"/>
  <circle cx="90.6" cy="59.4" r="1.1" fill="#1b2433"/>
  <circle cx="71.5" cy="58.4" r="0.7" fill="#fff"/>
  <circle cx="91.5" cy="58.4" r="0.7" fill="#fff"/>
  <path d="M80 61Q77.5 68 81 70" stroke="${SKIN_SHADE}" stroke-width="1.8" fill="none" stroke-linecap="round"/>
  <ellipse cx="65" cy="70" rx="3.6" ry="2" fill="#f0a99a" opacity="0.45"/>
  <ellipse cx="95" cy="70" rx="3.6" ry="2" fill="#f0a99a" opacity="0.45"/>
  <path d="M72 75Q80 82 88 75" stroke="#9b5a4a" stroke-width="2" fill="none" stroke-linecap="round"/>`;

function markup() {
  const outfits = Object.entries(OUTFITS).map(([name, art]) => `<g class="outfit" data-outfit="${name}">${art}</g>`).join('');
  const hats = Object.entries(HEADWEAR).map(([name, art]) => `<g class="outfit" data-outfit="${name}">${art}</g>`).join('');
  return `
    <svg class="greg" viewBox="0 0 160 330" aria-hidden="true">
      <defs>
        ${camo('dpcu', '#b8ac80', ['#6f7a48', '#3e4a2b', '#7a5b3c', '#26261f'])}
        ${camo('dpdu', '#d8caa2', ['#b89e6c', '#a8a47c', '#8a6b47'])}
        ${camo('dpdu-cap', '#d8caa2', ['#b89e6c', '#a8a47c', '#8a6b47'], 0.55)}
      </defs>
      <ellipse cx="80" cy="316" rx="48" ry="6" fill="#14233a" opacity="0.14"/>
      <rect x="73" y="82" width="14" height="18" fill="${SKIN_SHADE}"/>
      ${outfits}
      <circle cx="41" cy="200" r="7" fill="${SKIN}"/>
      <circle cx="119" cy="200" r="7" fill="${SKIN}"/>
      ${HEAD}
      ${hats}
    </svg>`;
}

export const OUTFIT_NAMES = Object.keys(OUTFITS);

export function mountGreg(container) {
  container.insertAdjacentHTML('beforeend', markup());
  const svg = container.lastElementChild;
  const groups = [...svg.querySelectorAll('.outfit')];
  let current = '';
  return {
    svg,
    wear(name) {
      if (name === current) return;
      for (const g of groups) g.classList.toggle('is-on', g.dataset.outfit === name);
      current = name;
    },
  };
}
