// Génère l'identité visuelle Pathful (motif "chemin + tête").
// Procédural et reproductible (zéro dépendance, PRNG seedé) : `node scripts/generate-icon.js`.
// Sorties dans assets/images/ :
//   icon.png (1024, fond plein) · android-icon-foreground.png (motif centré, fond
//   transparent) · android-icon-background.png (dégradé plein) ·
//   android-icon-monochrome.png (motif blanc) · splash-icon.png (512, motif seul) ·
//   favicon.png (48).
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const OUT = (...p) => path.join(__dirname, '..', 'assets', 'images', ...p);

// Couleurs (identité Pathful, cf. ThemeProvider sombre).
const C = {
  bgTop: [0x26, 0x30, 0x3d],
  bgBottom: [0x0b, 0x11, 0x14],
  path: [0x7f, 0xa8, 0x8f],
  head: [0xa9, 0xcb, 0xbd],
};

// Tracé "chemin + tête" (coordonnées relatives 0..1).
const POLY = [
  [0.3, 0.28],
  [0.66, 0.28],
  [0.66, 0.5],
  [0.4, 0.5],
  [0.4, 0.7],
  [0.62, 0.7],
];
const HEAD = [0.3, 0.28];
const STROKE = 0.052; // demi-largeur
const HEAD_R = 0.098;

function distSeg(px, py, ax, ay, bx, by) {
  const dx = bx - ax;
  const dy = by - ay;
  const l2 = dx * dx + dy * dy;
  let t = l2 === 0 ? 0 : ((px - ax) * dx + (py - ay) * dy) / l2;
  t = Math.max(0, Math.min(1, t));
  const cx = ax + t * dx - px;
  const cy = ay + t * dy - py;
  return Math.sqrt(cx * cx + cy * cy);
}

function distPath(x, y) {
  let d = Infinity;
  for (let i = 0; i < POLY.length - 1; i++) {
    d = Math.min(d, distSeg(x, y, POLY[i][0], POLY[i][1], POLY[i + 1][0], POLY[i + 1][1]));
  }
  return d;
}

function distHead(x, y) {
  return Math.hypot(x - HEAD[0], y - HEAD[1]);
}

// Rendu en suréchantillonné SS× puis réduction (anti-aliasing).
function render(size, { bg, scaleMotif, mono }) {
  const SS = 2;
  const W = size * SS;
  const acc = new Float32Array(W * W * 4);
  for (let j = 0; j < W; j++) {
    const v = (j + 0.5) / W;
    for (let i = 0; i < W; i++) {
      const u = (i + 0.5) / W;
      const k = (j * W + i) * 4;
      // Fond.
      let r = 0;
      let g = 0;
      let b = 0;
      let a = 0;
      if (bg) {
        const t = v;
        r = C.bgTop[0] + (C.bgBottom[0] - C.bgTop[0]) * t;
        g = C.bgTop[1] + (C.bgBottom[1] - C.bgTop[1]) * t;
        b = C.bgTop[2] + (C.bgBottom[2] - C.bgTop[2]) * t;
        a = 255;
      }
      // Motif (ramené vers le centre si scaleMotif < 1, zone safe adaptive).
      const mx = 0.5 + (u - 0.5) / scaleMotif;
      const my = 0.5 + (v - 0.5) / scaleMotif;
      if (mx >= 0 && mx <= 1 && my >= 0 && my <= 1) {
        const aa = 1.2 / W; // largeur d'une sous-case en unités relatives
        const dP = distPath(mx, my);
        const dH = distHead(mx, my);
        const covP = Math.max(0, Math.min(1, (STROKE + aa - dP) / (2 * aa)));
        const covH = Math.max(0, Math.min(1, (HEAD_R + aa - dH) / (2 * aa)));
        const fg = mono ? [255, 255, 255] : C.path;
        const hd = mono ? [255, 255, 255] : C.head;
        // Tête par-dessus le tracé.
        let fr = fg[0];
        let fgG = fg[1];
        let fb = fg[2];
        let fa = covP;
        if (covH > 0) {
          const ia = covH;
          fr = hd[0] * ia + fr * (1 - ia);
          fgG = hd[1] * ia + fgG * (1 - ia);
          fb = hd[2] * ia + fb * (1 - ia);
          fa = covH + fa * (1 - covH);
        }
        // Composition sur le fond.
        r = (fr * fa + r * (a / 255) * (1 - fa)) / Math.max(1e-6, fa + (a / 255) * (1 - fa)) * 1;
        g = (fgG * fa + g * (a / 255) * (1 - fa)) / Math.max(1e-6, fa + (a / 255) * (1 - fa)) * 1;
        b = (fb * fa + b * (a / 255) * (1 - fa)) / Math.max(1e-6, fa + (a / 255) * (1 - fa)) * 1;
        a = Math.min(255, fa * 255 + a * (1 - fa));
        // Simplification : le motif est opaque là où il couvre (cov≈1 aux cœurs),
        // la formule ci-dessus dégénère correctement (fa=1 → couleur motif).
        if (fa >= 1) {
          r = covH >= covP ? hd[0] : fg[0];
          g = covH >= covP ? hd[1] : fg[1];
          b = covH >= covP ? hd[2] : fg[2];
          a = 255;
        }
      }
      acc[k] = r;
      acc[k + 1] = g;
      acc[k + 2] = b;
      acc[k + 3] = a;
    }
  }
  // Réduction SS×SS.
  const out = Buffer.alloc(size * size * 4);
  for (let j = 0; j < size; j++) {
    for (let i = 0; i < size; i++) {
      let r = 0;
      let g = 0;
      let b = 0;
      let a = 0;
      for (let dj = 0; dj < SS; dj++) {
        for (let di = 0; di < SS; di++) {
          const k = ((j * SS + dj) * W + (i * SS + di)) * 4;
          r += acc[k];
          g += acc[k + 1];
          b += acc[k + 2];
          a += acc[k + 3];
        }
      }
      const o = (j * size + i) * 4;
      const n = SS * SS;
      out[o] = Math.round(r / n);
      out[o + 1] = Math.round(g / n);
      out[o + 2] = Math.round(b / n);
      out[o + 3] = Math.round(a / n);
    }
  }
  return out;
}

// --- Encodeur PNG RGBA minimal ---
const crcTable = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();

function crc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) crc = crcTable[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([len, body, crc]);
}

function writePng(file, size, rgba) {
  const raw = Buffer.alloc(size * (size * 4 + 1));
  for (let j = 0; j < size; j++) {
    raw[j * (size * 4 + 1)] = 0;
    rgba.copy(raw, j * (size * 4 + 1) + 1, j * size * 4, (j + 1) * size * 4);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  const png = Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
  fs.writeFileSync(file, png);
  console.log(`${path.basename(file)} : ${size}×${size} (${(png.length / 1024).toFixed(0)} Ko)`);
}

const jobs = [
  ['icon.png', 1024, { bg: true, scaleMotif: 1, mono: false }],
  ['android-icon-foreground.png', 1024, { bg: false, scaleMotif: 0.62, mono: false }],
  ['android-icon-background.png', 1024, { bg: true, scaleMotif: 0, mono: false }],
  ['android-icon-monochrome.png', 1024, { bg: false, scaleMotif: 0.62, mono: true }],
  ['splash-icon.png', 512, { bg: false, scaleMotif: 1, mono: false }],
  ['favicon.png', 48, { bg: true, scaleMotif: 1, mono: false }],
];

for (const [file, size, opts] of jobs) {
  const rgba =
    file === 'android-icon-background.png'
      ? (() => {
          // Fond seul : réutilise le rendu avec motif masqué en le recouvrant.
          const px = render(size, { bg: true, scaleMotif: 1e9, mono: false });
          return px;
        })()
      : render(size, opts);
  writePng(OUT(file), size, rgba);
}
console.log('Terminé.');
