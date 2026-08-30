/**
 * Erzeugt den Level-1-Foreground: ein Spinnennetz auf dunklem, deckendem
 * Grund. Der dunkle Grund hält den Kontrast "erobert (heller Background
 * scheint durch) ⇄ noch nicht erobert" so klar wie der frühere Schachbrett-
 * Foreground; die Netz-Fäden liegen nur als Deko darüber.
 *
 * Reines Node (keine Bild-Bibliothek): rendert 2× supergesampelt in einen
 * Float-RGBA-Puffer, skaliert per 2×2-Mittelung herunter und schreibt eine
 * PNG (Filter 0 pro Zeile, zlib-Deflate, CRC32) direkt raus.
 *
 * Nutzung:  node tools/gen-level1-foreground.mjs
 * Ziel:     public/assets/levels/level1/foreground.png
 */
import zlib from 'node:zlib';
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const OUT = fileURLToPath(
  new URL('../public/assets/levels/level1/foreground.png', import.meta.url),
);

// Feld-Grösse (main.ts FIELD_WIDTH/HEIGHT) – 1:1, damit die Netz-Geometrie
// nicht verzerrt wird, wenn der Foreground aufs Feld gezeichnet wird.
const W = 960;
const H = 540;
const SS = 2; // Supersampling
const w = W * SS;
const h = H * SS;

// RGBA, 0..1, nicht vormultipliziert.
const px = new Float32Array(w * h * 4);

/** Alpha-over: legt (r,g,b,a) über den vorhandenen Pixel. */
function blend(x, y, r, g, b, a) {
  if (x < 0 || y < 0 || x >= w || y >= h || a <= 0) return;
  const i = (y * w + x) * 4;
  const dr = px[i],
    dg = px[i + 1],
    db = px[i + 2],
    da = px[i + 3];
  const oa = a + da * (1 - a);
  if (oa <= 0) return;
  px[i] = (r * a + dr * da * (1 - a)) / oa;
  px[i + 1] = (g * a + dg * da * (1 - a)) / oa;
  px[i + 2] = (b * a + db * da * (1 - a)) / oa;
  px[i + 3] = oa;
}

// ── dunkler, deckender Grund ──────────────────────────────────────────────
// Flach (keine Vignette): hält die PNG klein und den Kontrast zum
// durchscheinenden Background beim Erobern gleichmässig.
const BG = [22 / 255, 25 / 255, 35 / 255]; // ~#161923
const cx = w / 2;
const cy = h / 2;
const maxR = Math.hypot(cx, cy);
for (let i = 0; i < w * h; i++) {
  px[i * 4] = BG[0];
  px[i * 4 + 1] = BG[1];
  px[i * 4 + 2] = BG[2];
  px[i * 4 + 3] = 1;
}

// ── Netz-Fäden: erst Deckung in eine Maske sammeln (max), dann EINMAL
//    als Seidenfarbe komponieren – so werden Kreuzungen nicht doppelt dunkel.
const cov = new Float32Array(w * h);

/** Weicher Kreis-Stempel in die Deckungsmaske (max-akkumuliert). */
function stamp(x, y, radius, strength) {
  const r0 = Math.max(0, Math.floor(x - radius - 1));
  const r1 = Math.min(w - 1, Math.ceil(x + radius + 1));
  const c0 = Math.max(0, Math.floor(y - radius - 1));
  const c1 = Math.min(h - 1, Math.ceil(y + radius + 1));
  for (let yy = c0; yy <= c1; yy++) {
    for (let xx = r0; xx <= r1; xx++) {
      const dist = Math.hypot(xx - x, yy - y);
      const cvg = Math.max(0, Math.min(1, radius + 0.5 - dist)) * strength;
      if (cvg > 0) {
        const k = yy * w + xx;
        if (cvg > cov[k]) cov[k] = cvg;
      }
    }
  }
}

/** Linie als Kette weicher Stempel. */
function thread(x0, y0, x1, y1, thickness, strength) {
  const len = Math.hypot(x1 - x0, y1 - y0);
  const steps = Math.max(1, Math.ceil(len / 0.5));
  for (let s = 0; s <= steps; s++) {
    const t = s / steps;
    stamp(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, thickness / 2, strength);
  }
}

/** Durchhängender Faden (quadratische Bezier, Kontrollpunkt Richtung Zentrum). */
function saggingThread(x0, y0, x1, y1, sag, thickness, strength) {
  const mx = (x0 + x1) / 2;
  const my = (y0 + y1) / 2;
  const px0 = mx + (cx - mx) * sag;
  const py0 = my + (cy - my) * sag;
  const seg = 14;
  let px1 = x0;
  let py1 = y0;
  for (let s = 1; s <= seg; s++) {
    const t = s / seg;
    const u = 1 - t;
    const bx = u * u * x0 + 2 * u * t * px0 + t * t * x1;
    const by = u * u * y0 + 2 * u * t * py0 + t * t * y1;
    thread(px1, py1, bx, by, thickness, strength);
    px1 = bx;
    py1 = by;
  }
}

const SPOKES = 18;
const RINGS = 16;
const R = maxR * 1.05; // bis über die Ecken hinaus
const hubR = 14 * SS;

// leichte Unregelmässigkeit, deterministisch (kein RNG-Import nötig)
const jitter = (n) => Math.sin(n * 12.9898) * 0.5;

const angleOf = (k) => (k / SPOKES) * Math.PI * 2 + jitter(k) * 0.04;
const ringR = (i) => hubR + (R - hubR) * Math.pow((i + 1) / RINGS, 1.18) + jitter(i * 3) * 6 * SS;

// Speichen
for (let k = 0; k < SPOKES; k++) {
  const a = angleOf(k);
  thread(cx, cy, cx + Math.cos(a) * R, cy + Math.sin(a) * R, 1.7 * SS, 0.62);
}

// Ringe (gerade Segmente zwischen benachbarten Speichen, leicht durchhängend)
for (let i = 0; i < RINGS; i++) {
  const rr = ringR(i);
  const strength = i < 2 ? 0.7 : 0.5; // innen etwas dichter
  for (let k = 0; k < SPOKES; k++) {
    const a0 = angleOf(k);
    const a1 = angleOf((k + 1) % SPOKES) + (k + 1 >= SPOKES ? Math.PI * 2 : 0);
    saggingThread(
      cx + Math.cos(a0) * rr,
      cy + Math.sin(a0) * rr,
      cx + Math.cos(a1) * rr,
      cy + Math.sin(a1) * rr,
      0.1,
      1.3 * SS,
      strength,
    );
  }
}

// ein paar gerissene / lose Strähnen für Charakter
for (const k of [2, 7, 11, 15]) {
  const a = angleOf(k) + 0.13;
  const r0 = ringR(3 + (k % 4));
  const r1 = r0 + 60 * SS;
  thread(
    cx + Math.cos(a) * r0,
    cy + Math.sin(a) * r0,
    cx + Math.cos(a + 0.25) * r1,
    cy + Math.sin(a + 0.25) * r1,
    1.1 * SS,
    0.4,
  );
}

// Nabe: kleiner enger Spiral-Klecks
for (let t = 0; t < Math.PI * 8; t += 0.12) {
  const rr = 1.5 * SS + (t / (Math.PI * 8)) * hubR;
  stamp(cx + Math.cos(t) * rr, cy + Math.sin(t) * rr, 1.2 * SS, 0.6);
}

// Seidenfarbe über den Grund komponieren
const SILK = [206 / 255, 214 / 255, 228 / 255];
const SILK_ALPHA = 0.5;
for (let y = 0; y < h; y++) {
  for (let x = 0; x < w; x++) {
    const a = cov[y * w + x] * SILK_ALPHA;
    if (a > 0) blend(x, y, SILK[0], SILK[1], SILK[2], a);
  }
}

// ── 2×2 heruntermitteln ───────────────────────────────────────────────────
const out = Buffer.alloc(W * H * 4);
for (let y = 0; y < H; y++) {
  for (let x = 0; x < W; x++) {
    let r = 0,
      g = 0,
      b = 0,
      a = 0;
    for (let dy = 0; dy < SS; dy++) {
      for (let dx = 0; dx < SS; dx++) {
        const i = ((y * SS + dy) * w + (x * SS + dx)) * 4;
        r += px[i];
        g += px[i + 1];
        b += px[i + 2];
        a += px[i + 3];
      }
    }
    const n = SS * SS;
    const o = (y * W + x) * 4;
    out[o] = Math.round((r / n) * 255);
    out[o + 1] = Math.round((g / n) * 255);
    out[o + 2] = Math.round((b / n) * 255);
    out[o + 3] = Math.round((a / n) * 255);
  }
}

// ── PNG-Encoder (8-bit RGBA, Filter 0) ────────────────────────────────────
const crcTable = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const t = Buffer.from(type, 'ascii');
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([t, data])), 0);
  return Buffer.concat([len, t, data, crc]);
}

const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(W, 0);
ihdr.writeUInt32BE(H, 4);
ihdr[8] = 8; // bit depth
ihdr[9] = 6; // colour type RGBA
// 10..12 = 0 (deflate, adaptive filtering, no interlace)

const raw = Buffer.alloc(H * (1 + W * 4));
for (let y = 0; y < H; y++) {
  raw[y * (1 + W * 4)] = 0; // filter: none
  out.copy(raw, y * (1 + W * 4) + 1, y * W * 4, (y + 1) * W * 4);
}

const png = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  chunk('IHDR', ihdr),
  chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
  chunk('IEND', Buffer.alloc(0)),
]);

writeFileSync(OUT, png);
console.log(`geschrieben: ${OUT} (${W}×${H}, ${(png.length / 1024).toFixed(1)} kB)`);
