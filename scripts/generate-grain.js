// Génère assets/images/grain.png : bruit gris 128×128 pour l'overlay de fond.
// PRNG seedé (mulberry32) → sortie stable entre générations. Zéro dépendance
// (node:zlib + encodage PNG manuel). Relancer : `node scripts/generate-grain.js`.
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const SIZE = 128;
const SEED = 20260910;

function mulberry32(seed) {
  let s = seed | 0;
  return function () {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Table CRC32.
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

const rng = mulberry32(SEED);
// Scanlines : octet de filtre 0 + 1 octet gris par pixel.
const raw = Buffer.alloc(SIZE * (SIZE + 1));
for (let y = 0; y < SIZE; y++) {
  raw[y * (SIZE + 1)] = 0;
  for (let x = 0; x < SIZE; x++) {
    raw[y * (SIZE + 1) + 1 + x] = Math.floor(rng() * 256);
  }
}

const png = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  chunk('IHDR', (() => {
    const b = Buffer.alloc(13);
    b.writeUInt32BE(SIZE, 0);
    b.writeUInt32BE(SIZE, 4);
    b[8] = 8; // profondeur 8 bits
    b[9] = 0; // niveaux de gris
    return b;
  })()),
  chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
  chunk('IEND', Buffer.alloc(0)),
]);

const outPath = path.join(__dirname, '..', 'assets', 'images', 'grain.png');
fs.writeFileSync(outPath, png);
console.log(`grain.png écrit : ${outPath} (${(png.length / 1024).toFixed(1)} Ko)`);
