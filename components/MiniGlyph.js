import { MINI_VIEWBOX } from "@/lib/gridfont";

// a mini rendering of a drawn gridletter. `set` is an iterable of segment keys
// and `segByKey` maps each key back to its endpoints.
export default function MiniGlyph({ set, segByKey }) {
  const lines = [];
  for (const key of set) {
    const s = segByKey.get(key);
    if (s) lines.push(s);
  }
  return (
    <svg className="mini" viewBox={MINI_VIEWBOX} preserveAspectRatio="xMidYMid meet">
      {lines.map((s) => (
        <line key={s.key} className="mini-lit" x1={s.x1} y1={s.y1} x2={s.x2} y2={s.y2} />
      ))}
    </svg>
  );
}
