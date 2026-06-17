"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { buildSegments } from "@/lib/gridfont";
import { getLetters, clearLetters } from "@/lib/store";
import MiniGlyph from "@/components/MiniGlyph";

// The wall: every "a" shared from /a, laid out in a grid. No text — just the
// letters, with a button to wipe it. Backed by this browser's localStorage.
export default function Wall() {
  const segments = useMemo(() => buildSegments(), []);
  const segByKey = useMemo(() => new Map(segments.map((s) => [s.key, s])), [segments]);

  const [letters, setLetters] = useState([]);

  useEffect(() => {
    setLetters(getLetters());
  }, []);

  const onClear = useCallback(() => {
    clearLetters();
    setLetters([]);
  }, []);

  return (
    <div className="wall-page">
      <div className="wall-grid">
        {letters.map((l) => (
          <div key={l.id} className="wall-cell">
            <MiniGlyph set={l.segs} segByKey={segByKey} />
          </div>
        ))}
      </div>
      <button className="btn wall-clear" onClick={onClear}>Clear wall</button>
    </div>
  );
}
