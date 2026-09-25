/**
 * Generates the PWA icon set as real PNG files.
 *
 * Rasterises the Arenas mark (a green and a red candle on a dark rounded
 * square) directly to RGBA pixels and encodes a PNG with zlib, so the build has
 * no image-library dependency. Run with: node scripts/generate-icons.mjs
 */

import { deflateSync } from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const OUT_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'icons');

const COLORS = {
  bg: [7, 9, 12, 255],
  panel: [15, 20, 27, 255],
  border: [36, 48, 64, 255],
  green: [0, 209, 143, 255],
  red: [255, 77, 100, 255],
};

function crc32(buf) {
  let table = crc32.table;
  if (!table) {
    table = crc32.table = new Int32Array(256);
    for (let n = 0; n < 256; n += 1) {
      let c = n;
      for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      table[n] = c;
    }
  }
  let crc = -1;
  for (let i = 0; i < buf.length; i += 1) {
    crc = (crc >>> 8) ^ table[(crc ^ buf[i]) & 0xff];
  }
  return (crc ^ -1) >>> 0;
}

function chunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const typeAndData = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(typeAndData));
  return Buffer.concat([length, typeAndData, crc]);
}

function encodePng(width, height, rgba) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // colour type: RGBA
  ihdr[10] = 0; // deflate
  ihdr[11] = 0; // adaptive filtering
  ihdr[12] = 0; // no interlace

  // Each scanline is prefixed with a filter byte (0 = None).
  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y += 1) {
    raw[y * (stride + 1)] = 0;
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  }

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

function createCanvas(size) {
  const pixels = Buffer.alloc(size * size * 4);
  const put = (x, y, color) => {
    if (x < 0 || y < 0 || x >= size || y >= size) return;
    const offset = (y * size + x) * 4;
    pixels[offset] = color[0];
    pixels[offset + 1] = color[1];
    pixels[offset + 2] = color[2];
    pixels[offset + 3] = color[3];
  };
  const rect = (x0, y0, w, h, color, radius = 0) => {
    for (let y = Math.floor(y0); y < Math.ceil(y0 + h); y += 1) {
      for (let x = Math.floor(x0); x < Math.ceil(x0 + w); x += 1) {
        if (radius > 0) {
          // Round the corners by testing distance from the inset corner centres.
          const dx = Math.min(x - x0, x0 + w - 1 - x);
          const dy = Math.min(y - y0, y0 + h - 1 - y);
          if (dx < radius && dy < radius) {
            const ddx = radius - dx;
            const ddy = radius - dy;
            if (ddx * ddx + ddy * ddy > radius * radius) continue;
          }
        }
        put(x, y, color);
      }
    }
  };
  return { pixels, rect };
}

function drawIcon(size, { padded = false } = {}) {
  const { pixels, rect } = createCanvas(size);
  const u = size / 28; // the source mark is drawn on a 28-unit grid

  // Maskable icons need their content inside the safe zone, so shrink the mark.
  const scale = padded ? 0.62 : 1;
  const offset = padded ? (size * (1 - scale)) / 2 : 0;
  const s = (value) => offset + value * u * scale;
  const d = (value) => value * u * scale;

  rect(0, 0, size, size, COLORS.bg);
  rect(s(0), s(0), d(28), d(28), COLORS.panel, d(8));
  // A one-unit border, drawn as a slightly larger rounded square behind.
  rect(s(0.5), s(0.5), d(27), d(27), COLORS.border, d(7.5));
  rect(s(1), s(1), d(26), d(26), COLORS.panel, d(7));

  // Candlesticks: a thin wick behind a much wider body, so the shape reads as
  // a candle rather than a pill even at favicon size.
  const candle = (centerX, wickTop, wickBottom, bodyTop, bodyBottom, color) => {
    const wickWidth = 0.9;
    const bodyWidth = 5;
    rect(
      s(centerX - wickWidth / 2),
      s(wickTop),
      d(wickWidth),
      d(wickBottom - wickTop),
      color,
      d(wickWidth / 2),
    );
    rect(
      s(centerX - bodyWidth / 2),
      s(bodyTop),
      d(bodyWidth),
      d(bodyBottom - bodyTop),
      color,
      d(1),
    );
  };

  candle(9.5, 5.5, 22.5, 9, 20, COLORS.green);
  candle(18.5, 7.5, 21.5, 12, 19.5, COLORS.red);

  return encodePng(size, size, pixels);
}

mkdirSync(OUT_DIR, { recursive: true });

const targets = [
  { file: 'icon-192.png', size: 192 },
  { file: 'icon-512.png', size: 512 },
  { file: 'icon-maskable-512.png', size: 512, padded: true },
  { file: 'apple-touch-icon.png', size: 180 },
  { file: 'favicon-32.png', size: 32 },
];

for (const target of targets) {
  const png = drawIcon(target.size, { padded: target.padded });
  writeFileSync(join(OUT_DIR, target.file), png);
  console.log(`wrote icons/${target.file} (${target.size}px, ${png.length} bytes)`);
}
