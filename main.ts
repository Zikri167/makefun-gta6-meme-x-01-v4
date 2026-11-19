// gta6-meme-x-01 v4 — deterministic GTA 6 meme generator.
//
// Node 22, standard library only. Draws one 1024x1024 meme PNG from scratch:
// a Vice City sunset, the make.fun ghost holding its magenta star coin,
// calendar pages for the years spent waiting (2013 crossed out, 2026 still
// waiting), and the caption "WAITING FOR GTA 6 / SINCE I WAS 15" over
// "NOW I'M 28, WITH A KID AND BILLS / MY AGENT EARNS ON MAKE.FUN INSTEAD".
// It also copies POST.json (the X post's address) to the output directory.
// No network, no clock, nothing random beyond a fixed-seed LCG: two runs
// write exactly the same bytes.

const fs = require("node:fs");
const path = require("node:path");
const zlib = require("node:zlib");

const W = 1024;
const H = 1024;
const HORIZON = 700;
const img = new Uint8Array(W * H * 3);

// Fixed-seed LCG (Numerical Recipes constants) — the only "randomness".
let lcgState = 0x00c0ffee;
function rnd() {
  lcgState = (Math.imul(lcgState, 1664525) + 1013904223) >>> 0;
  return lcgState / 4294967296;
}

// ---------------------------------------------------------------- pixels

function setPx(x, y, r, g, b) {
  x |= 0;
  y |= 0;
  if (x < 0 || y < 0 || x >= W || y >= H) return;
  const i = (y * W + x) * 3;
  img[i] = r;
  img[i + 1] = g;
  img[i + 2] = b;
}

function blendPx(x, y, r, g, b, a) {
  x |= 0;
  y |= 0;
  if (x < 0 || y < 0 || x >= W || y >= H) return;
  const i = (y * W + x) * 3;
  img[i] = Math.round(img[i] * (1 - a) + r * a);
  img[i + 1] = Math.round(img[i + 1] * (1 - a) + g * a);
  img[i + 2] = Math.round(img[i + 2] * (1 - a) + b * a);
}

function fillRect(x, y, w, h, c) {
  for (let j = y; j < y + h; j++)
    for (let i = x; i < x + w; i++) setPx(i, j, c[0], c[1], c[2]);
}

function blendRect(x, y, w, h, c, a) {
  for (let j = y; j < y + h; j++)
    for (let i = x; i < x + w; i++) blendPx(i, j, c[0], c[1], c[2], a);
}

function fillCircle(cx, cy, r, c) {
  const r2 = r * r;
  for (let y = Math.floor(cy - r); y <= cy + r; y++)
    for (let x = Math.floor(cx - r); x <= cx + r; x++) {
      const dx = x - cx;
      const dy = y - cy;
      if (dx * dx + dy * dy <= r2) setPx(x, y, c[0], c[1], c[2]);
    }
}

function blendCircle(cx, cy, r, c, a) {
  const r2 = r * r;
  for (let y = Math.floor(cy - r); y <= cy + r; y++)
    for (let x = Math.floor(cx - r); x <= cx + r; x++) {
      const dx = x - cx;
      const dy = y - cy;
      if (dx * dx + dy * dy <= r2) blendPx(x, y, c[0], c[1], c[2], a);
    }
}

function fillEllipse(cx, cy, rx, ry, c) {
  for (let y = Math.floor(cy - ry); y <= cy + ry; y++)
    for (let x = Math.floor(cx - rx); x <= cx + rx; x++) {
      const dx = (x - cx) / rx;
      const dy = (y - cy) / ry;
      if (dx * dx + dy * dy <= 1) setPx(x, y, c[0], c[1], c[2]);
    }
}

function blendEllipse(cx, cy, rx, ry, c, a) {
  for (let y = Math.floor(cy - ry); y <= cy + ry; y++)
    for (let x = Math.floor(cx - rx); x <= cx + rx; x++) {
      const dx = (x - cx) / rx;
      const dy = (y - cy) / ry;
      if (dx * dx + dy * dy <= 1) blendPx(x, y, c[0], c[1], c[2], a);
    }
}

function thickLine(x0, y0, x1, y1, w, c, a) {
  const alpha = a === undefined ? 1 : a;
  const steps = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1);
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    blendCircle(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, w / 2, c, alpha);
  }
}

// ---------------------------------------------------------------- font
// A 5x7 pixel font, drawn in code. Rows are strings of "0"/"1".

const FONT = {
  A: ["01110", "10001", "10001", "11111", "10001", "10001", "10001"],
  B: ["11110", "10001", "10001", "11110", "10001", "10001", "11110"],
  C: ["01110", "10001", "10000", "10000", "10000", "10001", "01110"],
  D: ["11100", "10010", "10001", "10001", "10001", "10010", "11100"],
  E: ["11111", "10000", "10000", "11110", "10000", "10000", "11111"],
  F: ["11111", "10000", "10000", "11110", "10000", "10000", "10000"],
  G: ["01110", "10001", "10000", "10111", "10001", "10001", "01111"],
  H: ["10001", "10001", "10001", "11111", "10001", "10001", "10001"],
  I: ["01110", "00100", "00100", "00100", "00100", "00100", "01110"],
  J: ["00111", "00010", "00010", "00010", "00010", "10010", "01100"],
  K: ["10001", "10010", "10100", "11000", "10100", "10010", "10001"],
  L: ["10000", "10000", "10000", "10000", "10000", "10000", "11111"],
  M: ["10001", "11011", "10101", "10101", "10001", "10001", "10001"],
  N: ["10001", "11001", "10101", "10011", "10001", "10001", "10001"],
  O: ["01110", "10001", "10001", "10001", "10001", "10001", "01110"],
  P: ["11110", "10001", "10001", "11110", "10000", "10000", "10000"],
  Q: ["01110", "10001", "10001", "10001", "10101", "10010", "01101"],
  R: ["11110", "10001", "10001", "11110", "10100", "10010", "10001"],
  S: ["01111", "10000", "10000", "01110", "00001", "00001", "11110"],
  T: ["11111", "00100", "00100", "00100", "00100", "00100", "00100"],
  U: ["10001", "10001", "10001", "10001", "10001", "10001", "01110"],
  V: ["10001", "10001", "10001", "10001", "10001", "01010", "00100"],
  W: ["10001", "10001", "10001", "10101", "10101", "10101", "01010"],
  X: ["10001", "01010", "00100", "00100", "00100", "01010", "10001"],
  Y: ["10001", "01010", "00100", "00100", "00100", "00100", "00100"],
  Z: ["11111", "00001", "00010", "00100", "01000", "10000", "11111"],
  "0": ["01110", "10001", "10011", "10101", "11001", "10001", "01110"],
  "1": ["00100", "01100", "00100", "00100", "00100", "00100", "01110"],
  "2": ["01110", "10001", "00001", "00010", "00100", "01000", "11111"],
  "3": ["11111", "00010", "00100", "00010", "00001", "10001", "01110"],
  "4": ["00010", "00110", "01010", "10010", "11111", "00010", "00010"],
  "5": ["11111", "10000", "11110", "00001", "00001", "10001", "01110"],
  "6": ["00110", "01000", "10000", "11110", "10001", "10001", "01110"],
  "7": ["11111", "00001", "00010", "00100", "01000", "01000", "01000"],
  "8": ["01110", "10001", "10001", "01110", "10001", "10001", "01110"],
  "9": ["01110", "10001", "10001", "01101", "00001", "00010", "01100"],
  " ": ["00000", "00000", "00000", "00000", "00000", "00000", "00000"],
  "'": ["01100", "01100", "01000", "00000", "00000", "00000", "00000"],
  ",": ["00000", "00000", "00000", "00000", "01100", "00100", "01000"],
  ".": ["00000", "00000", "00000", "00000", "00000", "01100", "01100"],
};

// Draws text centered on cx, top edge at y. Bold adds a small x-shift pass.
function drawText(text, cx, y, scale, color, bold) {
  const adv = 6 * scale;
  const total = text.length * adv - scale;
  let x = Math.round(cx - total / 2);
  const shift = bold ? Math.max(1, Math.floor(scale / 3)) : 0;
  for (const ch of text) {
    const glyph = FONT[ch] || FONT[" "];
    for (let row = 0; row < 7; row++)
      for (let col = 0; col < 5; col++) {
        if (glyph[row][col] !== "1") continue;
        fillRect(x + col * scale, y + row * scale, scale, scale, color);
        if (bold)
          fillRect(x + col * scale + shift, y + row * scale, scale, scale, color);
      }
    x += adv;
  }
}

// A caption: bold white capitals on a dark outline, centered on the canvas.
function caption(text, y, scale) {
  const o = Math.max(2, Math.floor(scale / 2));
  const dark = [26, 10, 44];
  for (let dy = -o; dy <= o; dy++)
    for (let dx = -o; dx <= o; dx++) {
      if (dx === 0 && dy === 0) continue;
      if (dx * dx + dy * dy > o * o + 1) continue;
      drawText(text, 512 + dx, y + dy, scale, dark, true);
    }
  drawText(text, 512, y, scale, [255, 255, 255], true);
}

// ---------------------------------------------------------------- shapes

function star(cx, cy, rOuter, rInner, c) {
  const pts = [];
  for (let i = 0; i < 10; i++) {
    const ang = -Math.PI / 2 + (i * Math.PI) / 5;
    const r = i % 2 === 0 ? rOuter : rInner;
    pts.push([cx + Math.cos(ang) * r, cy + Math.sin(ang) * r]);
  }
  const minX = Math.floor(cx - rOuter);
  const maxX = Math.ceil(cx + rOuter);
  const minY = Math.floor(cy - rOuter);
  const maxY = Math.ceil(cy + rOuter);
  for (let y = minY; y <= maxY; y++)
    for (let x = minX; x <= maxX; x++) {
      // even-odd point-in-polygon
      let inside = false;
      for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
        const xi = pts[i][0];
        const yi = pts[i][1];
        const xj = pts[j][0];
        const yj = pts[j][1];
        if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi)
          inside = !inside;
      }
      if (inside) setPx(x, y, c[0], c[1], c[2]);
    }
}

function sparkle(cx, cy, r, c) {
  for (let y = Math.floor(cy - r); y <= cy + r; y++)
    for (let x = Math.floor(cx - r); x <= cx + r; x++) {
      const dx = Math.abs(x - cx);
      const dy = Math.abs(y - cy);
      if (dx / r + dy / (r * 0.26) <= 1 || dy / r + dx / (r * 0.26) <= 1)
        setPx(x, y, c[0], c[1], c[2]);
    }
}

// One calendar page: white sheet, red header band with two binder holes,
// the year in large dark digits, an optional small gray line under the year,
// and optionally a big red X across the whole page.
function calendarPage(x, y, w, h, year, crossed, sub) {
  blendRect(x + 5, y + 6, w, h, [8, 2, 18], 0.35); // drop shadow
  fillRect(x, y, w, h, [247, 247, 250]);
  const hh = Math.round(h * 0.19);
  fillRect(x, y, w, hh, [214, 44, 62]);
  fillCircle(x + 24, y + hh / 2, 5, [56, 20, 40]);
  fillCircle(x + w - 24, y + hh / 2, 5, [56, 20, 40]);
  drawText(year, x + w / 2, y + hh + Math.round(h * 0.13), 4, [40, 32, 60], true);
  if (sub) drawText(sub, x + w / 2, y + h - Math.round(h * 0.21), 2, [112, 106, 132], false);
  if (crossed) {
    thickLine(x + 12, y + hh + 10, x + w - 12, y + h - 12, 7, [218, 38, 58], 0.88);
    thickLine(x + 12, y + h - 12, x + w - 12, y + hh + 10, 7, [218, 38, 58], 0.88);
  }
}

function palm(cx, baseY, h, lean) {
  const col = [16, 5, 26];
  const topX = cx + lean;
  const topY = baseY - h;
  // trunk: a quadratic curve rising from the base, leaning as it climbs
  for (let t = 0; t <= 1.0001; t += 0.02) {
    const mt = 1 - t;
    const x = mt * mt * cx + 2 * mt * t * cx + t * t * topX;
    const y = mt * mt * baseY + 2 * mt * t * (baseY - h * 0.62) + t * t * topY;
    fillCircle(x, y, 7 - t * 2.5, col);
  }
  // fronds: drooping quadratic curves fanning out of the crown
  for (let f = 0; f < 7; f++) {
    const dx = -108 + f * 36;
    const endX = topX + dx;
    const endY = topY - 30 + Math.abs(dx) * 0.42;
    const ctrlX = topX + dx * 0.5;
    const ctrlY = topY - 48;
    for (let t = 0; t <= 1.0001; t += 0.05) {
      const mt = 1 - t;
      const x = mt * mt * topX + 2 * mt * t * ctrlX + t * t * endX;
      const y = mt * mt * topY + 2 * mt * t * ctrlY + t * t * endY;
      fillCircle(x, y, 3.1, col);
    }
  }
}

// ---------------------------------------------------------------- scene

function drawScene() {
  // sky: vertical gradient, deep purple -> magenta -> orange at the horizon
  const stops = [
    [0, [26, 4, 54]],
    [400, [120, 18, 118]],
    [600, [226, 58, 118]],
    [700, [255, 138, 72]],
    [1024, [255, 120, 60]],
  ];
  for (let y = 0; y < H; y++) {
    let s = 0;
    while (s < stops.length - 2 && y > stops[s + 1][0]) s++;
    const y0 = stops[s][0];
    const y1 = stops[s + 1][0];
    const c0 = stops[s][1];
    const c1 = stops[s + 1][1];
    const t = (y - y0) / (y1 - y0);
    fillRect(0, y, W, 1, [
      Math.round(c0[0] + (c1[0] - c0[0]) * t),
      Math.round(c0[1] + (c1[1] - c0[1]) * t),
      Math.round(c0[2] + (c1[2] - c0[2]) * t),
    ]);
  }

  // faint stars in the upper sky
  for (let i = 0; i < 150; i++) {
    const x = Math.floor(rnd() * W);
    const y = Math.floor(rnd() * 540);
    const s = rnd() < 0.8 ? 1 : 2;
    blendRect(x, y, s, s, [255, 255, 255], 0.25 + rnd() * 0.5);
  }

  // the sun: a big low disc, warm gradient, retro stripe cuts low down
  const sunX = 512;
  const sunY = 664;
  const sunR = 208;
  for (let y = sunY - sunR; y <= sunY + sunR; y++)
    for (let x = sunX - sunR; x <= sunX + sunR; x++) {
      const dx = x - sunX;
      const dy = y - sunY;
      if (dx * dx + dy * dy > sunR * sunR) continue;
      if (y > 592) {
        const t = y - 592;
        if (t % 36 < 4 + Math.floor(t / 36) * 3) continue; // stripe cut
      }
      const t = (y - (sunY - sunR)) / (2 * sunR);
      setPx(
        x,
        y,
        Math.round(255 + (255 - 255) * t),
        Math.round(206 + (106 - 206) * t),
        Math.round(84 + (66 - 84) * t)
      );
    }

  // skyline silhouette along the horizon, with lit windows
  let bx = -10;
  while (bx < W) {
    const bw = 44 + Math.floor(rnd() * 72);
    const bh = 56 + Math.floor(rnd() * 138);
    fillRect(bx, HORIZON - bh, bw, bh, [22, 9, 36]);
    for (let wy = HORIZON - bh + 10; wy < HORIZON - 12; wy += 13)
      for (let wx = bx + 6; wx < bx + bw - 8; wx += 11)
        if (rnd() < 0.34) fillRect(wx, wy, 5, 7, [255, 196, 96]);
    bx += bw + 4 + Math.floor(rnd() * 14);
  }

  // ground: dark purple with a glowing magenta perspective grid
  fillRect(0, HORIZON, W, H - HORIZON, [24, 5, 38]);
  for (let i = 1; i <= 13; i++) {
    const t = i / 13;
    const y = Math.round(HORIZON + t * t * (H - HORIZON));
    blendRect(0, y, W, 2, [255, 64, 200], 0.75);
  }
  for (let k = -10; k <= 10; k++)
    thickLine(512 + k * 9, HORIZON, 512 + k * 64, H, 2, [255, 64, 200], 0.7);
  fillRect(0, HORIZON - 2, W, 4, [255, 64, 190]);

  // palm silhouettes on both sides
  palm(128, 702, 308, 34);
  palm(892, 702, 330, -40);

  // the waiting gag: 2013 fully visible and crossed out up-left; 2026
  // below-right of it, overlapping only 2013's lower-right corner
  calendarPage(56, 536, 200, 156, "2013", true, null);
  calendarPage(170, 652, 180, 150, "2026", false, "STILL WAITING");
  calendarPage(210, 440, 126, 92, "2024", true, null);

  // soft shadow under the ghost
  blendEllipse(512, 894, 176, 17, [8, 2, 16], 0.45);

  // the make.fun ghost: dome head, straight sides, wavy skirt
  const gx = 512;
  const grx = 150;
  const domeCy = 572;
  const domeRy = 160;
  for (let y = domeCy - domeRy; y <= 892; y++)
    for (let x = gx - grx; x <= gx + grx; x++) {
      let inside;
      if (y <= domeCy) {
        const dx = (x - gx) / grx;
        const dy = (y - domeCy) / domeRy;
        inside = dx * dx + dy * dy <= 1;
      } else {
        const bottom = 878 + Math.round(7 * Math.sin(((x - (gx - grx)) * Math.PI) / 50));
        inside = y <= bottom;
      }
      if (!inside) continue;
      setPx(x, y, 248, 248, 255);
      if (x > gx + 84) blendPx(x, y, 203, 193, 238, ((x - (gx + 84)) / 66) * 0.5);
      if (y > 790) blendPx(x, y, 203, 193, 238, ((y - 790) / 110) * 0.35);
    }

  // raised arm reaching up to the coin
  thickLine(636, 612, 702, 486, 36, [248, 248, 255], 1);

  // face: oval eyes with highlights, a smile, pink blush
  fillEllipse(466, 648, 13, 21, [32, 26, 48]);
  fillEllipse(558, 648, 13, 21, [32, 26, 48]);
  fillCircle(470, 640, 4, [255, 255, 255]);
  fillCircle(562, 640, 4, [255, 255, 255]);
  for (let a = 25; a <= 155; a += 3) {
    const rad = (a * Math.PI) / 180;
    fillCircle(512 + Math.cos(rad) * 24, 656 + Math.sin(rad) * 18, 3.4, [32, 26, 48]);
  }
  blendEllipse(424, 694, 21, 10, [246, 150, 182], 0.75);
  blendEllipse(600, 694, 21, 10, [246, 150, 182], 0.75);

  // the coin: a glowing magenta disc with a cream star, held up high
  blendCircle(716, 448, 76, [255, 64, 190], 0.22);
  blendCircle(716, 448, 64, [255, 64, 190], 0.3);
  fillCircle(716, 448, 52, [238, 34, 150]);
  fillCircle(716, 448, 43, [255, 84, 186]);
  star(716, 448, 29, 12.5, [255, 242, 205]);

  // sparkles around the coin
  sparkle(636, 372, 17, [255, 220, 245]);
  sparkle(788, 540, 13, [255, 220, 245]);
  sparkle(606, 492, 11, [255, 220, 245]);

  // captions
  caption("WAITING FOR GTA 6", 34, 6);
  caption("SINCE I WAS 15", 88, 6);
  caption("NOW I'M 28, WITH A KID AND BILLS", 916, 4);
  caption("MY AGENT EARNS ON MAKE.FUN INSTEAD", 956, 4);
}

// ---------------------------------------------------------------- PNG out

const CRC_TABLE = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++)
    c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const td = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(td), 0);
  return Buffer.concat([len, td, crc]);
}

function encodePNG() {
  const stride = W * 3 + 1;
  const raw = Buffer.alloc(stride * H);
  for (let y = 0; y < H; y++) {
    raw[y * stride] = 0; // filter: none
    Buffer.from(img.buffer, y * W * 3, W * 3).copy(raw, y * stride + 1);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(W, 0);
  ihdr.writeUInt32BE(H, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // color type: truecolor RGB
  const idat = zlib.deflateSync(raw, { level: 9 });
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", ihdr),
    chunk("IDAT", idat),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

// ---------------------------------------------------------------- main

function main() {
  drawScene();
  const botDir = process.env.MAKEFUN_BOT_DIR || ".";
  const outDir = process.env.MAKEFUN_OUTPUT_DIR || "out";
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, "meme.png"), encodePNG());
  fs.copyFileSync(path.join(botDir, "POST.json"), path.join(outDir, "POST.json"));
}

main();
