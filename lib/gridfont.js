// Shared grid geometry for the Letter Spirit gridfont. Pure data + helpers,
// no React, so it can be imported by client components and (in principle)
// server code alike.

export const COLS = 3;
export const ROWS = 7;
export const LETTERS = "abcdefghijklmnopqrstuvwxyz".split("");

// canonical segment key (smaller endpoint first)
export function segKey(c1, r1, c2, r2) {
  if (c1 < c2 || (c1 === c2 && r1 <= r2)) return `${c1},${r1}-${c2},${r2}`;
  return `${c2},${r2}-${c1},${r1}`;
}

// the 56 legal segments (king moves), with endpoints in canonical order
export function buildSegments() {
  const map = new Map();
  for (let c = 0; c < COLS; c++) {
    for (let r = 0; r < ROWS; r++) {
      for (const dc of [-1, 0, 1]) {
        for (const dr of [-1, 0, 1]) {
          if (dc === 0 && dr === 0) continue;
          const nc = c + dc;
          const nr = r + dr;
          if (nc < 0 || nc >= COLS || nr < 0 || nr >= ROWS) continue;
          const key = segKey(c, r, nc, nr);
          if (!map.has(key)) {
            const first = c < nc || (c === nc && r <= nr);
            map.set(key, first
              ? { key, x1: c, y1: r, x2: nc, y2: nr }
              : { key, x1: nc, y1: nr, x2: c, y2: r });
          }
        }
      }
    }
  }
  return [...map.values()];
}

export const isDiag = (s) => s.x1 !== s.x2 && s.y1 !== s.y2;

// reference rows: [row, label]. top % = (row + 0.6) / 7.2 of the grid box.
export const REF_ROWS = [
  [0, "ascender"],
  [2, "x height"],
  [4, "baseline"],
  [6, "descender"],
];

export const DOTS = [];
for (let c = 0; c < COLS; c++) {
  for (let r = 0; r < ROWS; r++) DOTS.push({ c, r });
}

// a mini rendering uses a FIXED viewBox (the whole grid) so every letter is
// shown at the same scale and in its true position.
export const MINI_VIEWBOX = "-0.4 -0.4 2.8 6.8";
