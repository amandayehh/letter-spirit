"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";

import { buildSegments, isDiag, REF_ROWS, DOTS } from "@/lib/gridfont";
import { addLetter } from "@/lib/store";

// the iOS-style share arrow, and a check shown briefly after a successful share
function ShareIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 18c0-7 5-10 15-10" />
      <path d="M15 4l5 4-5 4" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 13l4 4 10-11" />
    </svg>
  );
}

// A pared-down editor locked to the letter "a": no letter switcher, no .ttf
// download. A share-arrow button at the top posts the strokes to /api/letters
// (appearing on the communal /wall); it only lights up once something is drawn.
export default function LetterAEditor() {
  const segments = useMemo(() => buildSegments(), []);

  const [lit, setLit] = useState(() => new Set());
  const [status, setStatus] = useState("idle"); // idle | sharing | shared | error

  const litRef = useRef(lit);
  litRef.current = lit;

  const drawingRef = useRef(false);
  const paintRef = useRef(true); // current drag adds (true) or erases (false)

  const applySeg = useCallback((key, on) => {
    setLit((cur) => {
      if (on === cur.has(key)) return cur;
      const next = new Set(cur);
      if (on) next.add(key);
      else next.delete(key);
      return next;
    });
    setStatus("idle"); // any edit clears a previous "shared" message
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

  const onShare = useCallback(async () => {
    if (lit.size === 0) return; // button is disabled in this state anyway
    setStatus("sharing");
    try {
      const record = addLetter([...lit]);
      if (!record) throw new Error("could not save letter");
      setLit(new Set()); // clear the canvas for the next letter
      setStatus("shared");
      setTimeout(() => setStatus("idle"), 2000); // checkmark, then back to "Share"
    } catch (err) {
      console.error(err);
      setStatus("error");
    }
  }, [lit]);

  const drawn = lit.size > 0;

  return (
    <div className="page">
      <button
        className={`icon-btn${drawn ? " active" : ""}`}
        onClick={onShare}
        disabled={!drawn || status === "sharing"}
        aria-label="Share"
      >
        {status === "shared" ? <CheckIcon /> : <ShareIcon />}
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

          {/* lit strokes */}
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

      {/* the single locked letter, shown at the bottom */}
      <div className="single-letter">a</div>

      <Link href="/wall" className="wall-link">the wall →</Link>
    </div>
  );
}
