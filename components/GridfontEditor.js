"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  LETTERS,
  buildSegments,
  isDiag,
  REF_ROWS,
  DOTS,
} from "@/lib/gridfont";
import MiniGlyph from "@/components/MiniGlyph";

// download icon (arrow into a tray) for the top button
function DownloadIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 4v10" />
      <path d="M8 11l4 4 4-4" />
      <path d="M5 19h14" />
    </svg>
  );
}

// ---------------------------------------------------------------
// TTF export geometry
// ---------------------------------------------------------------
// A grid letter is a skeleton (zero-width centerlines); a TTF glyph is a
// filled outline. Each lit segment becomes a capsule (rounded-end
// rectangle). All capsules share one winding direction, so the nonzero
// fill rule merges overlapping strokes and leaves counters (e.g. the bowl
// of 'a') hollow — no boolean union needed.
const U = 160;  // font units per grid cell
const SB = 80;  // side bearing
const HW = 16;  // stroke half-width (full weight = 32 units)

const fx = (col) => col * U + SB;     // grid col -> font x
const fy = (row) => (4 - row) * U;    // grid row -> font y (baseline = row 4)

function addCap(path, cx, cy, startAngle) {
  const STEPS = 10;
  for (let i = 1; i <= STEPS; i++) {
    const a = startAngle - Math.PI * (i / STEPS);
    path.lineTo(cx + Math.cos(a) * HW, cy + Math.sin(a) * HW);
  }
}

function addCapsule(path, x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len;
  const uy = dy / len;
  const nx = -uy;
  const ny = ux;
  const an = Math.atan2(ny, nx); // angle of +normal

  path.moveTo(x1 + nx * HW, y1 + ny * HW);
  path.lineTo(x2 + nx * HW, y2 + ny * HW);
  addCap(path, x2, y2, an);
  path.lineTo(x1 - nx * HW, y1 - ny * HW);
  addCap(path, x1, y1, an + Math.PI);
  path.close();
}

// build a font from every letter that has a non-empty gridletter
function buildFont(opentype, segByKey, glyphs) {
  const advance = 2 * U + 2 * SB;
  const list = [
    new opentype.Glyph({ name: ".notdef", unicode: 0, advanceWidth: advance, path: new opentype.Path() }),
    new opentype.Glyph({ name: "space", unicode: 32, advanceWidth: Math.round(advance / 2), path: new opentype.Path() }),
  ];

  for (const ch of LETTERS) {
    const set = glyphs[ch];
    if (!set || set.size === 0) continue;
    const path = new opentype.Path();
    for (const key of set) {
      const s = segByKey.get(key);
      if (s) addCapsule(path, fx(s.x1), fy(s.y1), fx(s.x2), fy(s.y2));
    }
    list.push(new opentype.Glyph({ name: ch, unicode: ch.charCodeAt(0), advanceWidth: advance, path }));
  }

  return new opentype.Font({
    familyName: "Gridfont",
    styleName: "Regular",
    unitsPerEm: 1000,
    ascender: 4 * U,    // row 0 above baseline
    descender: -2 * U,  // row 6 below baseline
    glyphs: list,
  });
}

const EMPTY = new Set();

export default function GridfontEditor() {
  const segments = useMemo(() => buildSegments(), []);
  const segByKey = useMemo(() => new Map(segments.map((s) => [s.key, s])), [segments]);

  // each letter has its own gridletter (a Set of lit segment keys)
  const [glyphs, setGlyphs] = useState(() => ({}));
  const [current, setCurrent] = useState("a");

  const lit = glyphs[current] ?? EMPTY;

  // refs so pointer handlers always read the current values
  const litRef = useRef(lit);
  litRef.current = lit;
  const currentRef = useRef(current);
  currentRef.current = current;

  const drawingRef = useRef(false);
  const paintRef = useRef(true); // current drag adds (true) or erases (false)

  const applySeg = useCallback((key, on) => {
    const ch = currentRef.current;
    setGlyphs((prev) => {
      const cur = prev[ch] ?? new Set();
      if (on === cur.has(key)) return prev;
      const next = new Set(cur);
      if (on) next.add(key);
      else next.delete(key);
      return { ...prev, [ch]: next };
    });
  }, []);

  // tap toggles; the first segment of a drag decides draw vs erase
  const onPointerDown = useCallback((e, key) => {
    e.preventDefault();
    paintRef.current = !litRef.current.has(key);
    drawingRef.current = true;
    applySeg(key, paintRef.current);
  }, [applySeg]);

  // drag painting across segments (works for mouse + touch)
  useEffect(() => {
    const move = (e) => {
      if (!drawingRef.current) return;
      e.preventDefault();
      const el = document.elementFromPoint(e.clientX, e.clientY);
      const key = el && el.getAttribute && el.getAttribute("data-key");
      if (key) applySeg(key, paintRef.current);
    };
    const up = () => { drawingRef.current = false; };

    window.addEventListener("pointermove", move, { passive: false });
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
    };
  }, [applySeg]);

  // ---- letter switcher ----
  const scrollerRef = useRef(null);
  const rafRef = useRef(0);

  // while swiping, the letter nearest the center becomes the selected one
  const onScroll = useCallback(() => {
    if (rafRef.current) return;
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = 0;
      const scroller = scrollerRef.current;
      if (!scroller) return;
      const rect = scroller.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      let best = null;
      let bestDist = Infinity;
      for (const tab of scroller.children) {
        const r = tab.getBoundingClientRect();
        const d = Math.abs(r.left + r.width / 2 - centerX);
        if (d < bestDist) { bestDist = d; best = tab.dataset.letter; }
      }
      if (best) setCurrent(best);
    });
  }, []);

  const selectLetter = useCallback((ch) => {
    setCurrent(ch);
    const tab = scrollerRef.current?.querySelector(`[data-letter="${ch}"]`);
    if (tab) tab.scrollIntoView({ inline: "center", block: "nearest", behavior: "smooth" });
  }, []);

  const anyDrawn = LETTERS.some((ch) => glyphs[ch] && glyphs[ch].size > 0);

  const onDownload = useCallback(async () => {
    if (!anyDrawn) return; // button is disabled in this state anyway
    const mod = await import("opentype.js");
    const opentype = mod.default ?? mod;
    buildFont(opentype, segByKey, glyphs).download("gridfont.ttf");
  }, [anyDrawn, glyphs, segByKey]);

  return (
    <div className="page">
      <button
        className={`icon-btn${anyDrawn ? " active" : ""}`}
        onClick={onDownload}
        disabled={!anyDrawn}
        aria-label="Download .ttf"
      >
        <DownloadIcon />
      </button>

      <div className="stage">
        {REF_ROWS.map(([row, label]) => (
          <div
            key={label}
            className={label === "descender" ? "refrow descender" : "refrow"}
            style={{ top: `${((row + 0.6) / 7.2) * 100}%` }}
          >
            <span className="ref-line" />
            <span className="ref-label">{label}</span>
          </div>
        ))}

        <svg className="grid" viewBox="-0.5 -0.6 3.0 7.2">
          {/* dotted guides (all 56) */}
          {segments.map((s) => (
            <line
              key={`g-${s.key}`}
              className={isDiag(s) ? "guide diag" : "guide"}
              x1={s.x1} y1={s.y1} x2={s.x2} y2={s.y2}
            />
          ))}

          {/* points */}
          {DOTS.map((d) => (
            <circle key={`d-${d.c}-${d.r}`} className="dot" cx={d.c} cy={d.r} r={0.055} />
          ))}

          {/* lit strokes for the current letter */}
          {segments.filter((s) => lit.has(s.key)).map((s) => (
            <line
              key={`l-${s.key}`}
              className="lit"
              x1={s.x1} y1={s.y1} x2={s.x2} y2={s.y2}
            />
          ))}

          {/* transparent hit targets on top */}
          {segments.map((s) => (
            <line
              key={`h-${s.key}`}
              className="hit"
              data-key={s.key}
              x1={s.x1} y1={s.y1} x2={s.x2} y2={s.y2}
              onPointerDown={(e) => onPointerDown(e, s.key)}
            />
          ))}
        </svg>
      </div>

      <div className="switcher" ref={scrollerRef} onScroll={onScroll}>
        {LETTERS.map((ch) => {
          const set = glyphs[ch];
          const drawn = set && set.size > 0;
          const cls = ["glyph-tab"];
          if (drawn) cls.push("drawn");
          if (ch === current) cls.push("active");
          return (
            <button
              key={ch}
              type="button"
              data-letter={ch}
              className={cls.join(" ")}
              onClick={() => selectLetter(ch)}
            >
              {drawn ? <MiniGlyph set={set} segByKey={segByKey} /> : ch}
            </button>
          );
        })}
      </div>
    </div>
  );
}
