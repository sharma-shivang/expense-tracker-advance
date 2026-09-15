import { deflateSync } from "node:zlib";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

const outDir = join(process.cwd(), "public", "icons");
mkdirSync(outDir, { recursive: true });

function crc32(buf) {
  let c;
  const table = [];
  for (let n = 0; n < 256; n++) {
    c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  let crc = 0xffffffff;
  for (const b of buf) crc = table[(crc ^ b) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const body = Buffer.concat([Buffer.from(type, "latin1"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([len, body, crc]);
}

function encodePng(size, rgba) {
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  const stride = size * 4;
  const raw = Buffer.alloc((stride + 1) * size);
  for (let y = 0; y < size; y++) {
    raw[y * (stride + 1)] = 0; // filter none
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  }
  const idat = deflateSync(raw, { level: 9 });
  return Buffer.concat([
    sig,
    chunk("IHDR", ihdr),
    chunk("IDAT", idat),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

function sdfRoundedRect(x, y, cx, cy, hw, hh, r) {
  const qx = Math.abs(x - cx) - (hw - r);
  const qy = Math.abs(y - cy) - (hh - r);
  const ax = Math.max(qx, 0);
  const ay = Math.max(qy, 0);
  return Math.hypot(ax, ay) + Math.min(Math.max(qx, qy), 0) - r;
}

function sdfCircle(x, y, cx, cy, r) {
  return Math.hypot(x - cx, y - cy) - r;
}

function sdfBox(x, y, x0, y0, x1, y1) {
  const dx = Math.max(x0 - x, 0, x - x1);
  const dy = Math.max(y0 - y, 0, y - y1);
  return Math.hypot(dx, dy) * (dx > 0 && dy > 0 ? 1 : 1) - 0;
}

function distSeg(x, y, x0, y0, x1, y1) {
  const dx = x1 - x0;
  const dy = y1 - y0;
  const len2 = dx * dx + dy * dy || 1;
  let t = ((x - x0) * dx + (y - y0) * dy) / len2;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(x - (x0 + t * dx), y - (y0 + t * dy));
}

function aaf(sdf) {
  return Math.max(0, Math.min(1, 0.5 - sdf * 1.5 + 0.5));
}

function render(size, { maskable }) {
  const buf = Buffer.alloc(size * size * 4);
  const pad = maskable ? size * 0.12 : 0;
  const bg = size; // full round rect if not maskable, padded if maskable uses full canvas
  const fx = size / 2; // center of safe circle for maskable icon drawn bigger

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const px = x + 0.5;
      const py = y + 0.5;
      const i = (y * size + x) * 4;

      // background rounded square (maskable: full-bleed rounded rect covers safe area)
      const half = bg - pad;
      const rr = sdfRoundedRect(px, py, size / 2, size / 2, half, half, size * 0.22);
      const bgA = aaf(rr);

      // gradient top-left violet -> bottom-right cyan
      const t = Math.min(1, Math.max(0, (px + py) / (size * 1.6)));
      let r = Math.round(139 + (34 - 139) * t);
      let g = Math.round(92 + (211 - 92) * t);
      let b = Math.round(246 + (238 - 246) * t);

      // glyph "₹": coin + bar + stem + diagonals, white
      const cy = size / 2;
      const gx = size / 2;
      const coinR = size * 0.30;
      const ring = sdfCircle(px, py, gx, cy, coinR);
      // thick ring: |ring|
      const glyphA = Math.max(0, Math.min(1, 0.5 - Math.abs(ring) * 2.2 + 0.5));

      // top bar across the coin
      const bar = sdfBox(px, py, gx - coinR * 0.72, cy - coinR * 0.42, gx + coinR * 0.72, cy - coinR * 0.22);
      const barA = aaf(bar);

      // stem
      const stem = sdfBox(px, py, gx - size * 0.028, cy - coinR * 0.30, gx + size * 0.028, cy + coinR * 0.55);
      const stemA = aaf(stem);

      // left diagonal
      const diagL = distSeg(px, py, gx - size * 0.008, cy + coinR * 0.42, gx - coinR * 0.55, cy + coinR * 0.82);
      const diagLA = aaf(diagL - size * 0.018);
      // right diagonal
      const diagR = distSeg(px, py, gx + size * 0.008, cy + coinR * 0.42, gx + coinR * 0.6, cy + coinR * 0.72);
      const diagRA = aaf(diagR - size * 0.018);

      const glyph = Math.max(glyphA, barA, stemA, diagLA, diagRA);

      const a = bgA;
      buf[i] = Math.round(r);
      buf[i + 1] = Math.round(g);
      buf[i + 2] = Math.round(b);
      buf[i + 3] = Math.round(255 * a);
      if (glyph > 0) {
        const w = glyph;
        buf[i] = Math.round(r * (1 - w) + 255 * w);
        buf[i + 1] = Math.round(g * (1 - w) + 255 * w);
        buf[i + 2] = Math.round(b * (1 - w) + 255 * w);
      }
    }
  }
  return buf;
}

const targets = [
  ["icon-192.png", 192, false],
  ["icon-512.png", 512, false],
  ["icon-maskable-512.png", 512, true],
  ["apple-touch-icon-180.png", 180, false],
];

for (const [name, size, maskable] of targets) {
  const rgba = render(size, { maskable });
  writeFileSync(join(outDir, name), encodePng(size, rgba));
  console.log("wrote", name);
}

console.log("done →", outDir);