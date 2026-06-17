// Browser-local store for shared gridletters. On a static host (GitHub Pages)
// there's no server, so the "wall" lives in localStorage — letters shared from
// /a persist on this device and appear on /wall in the same browser.
const KEY = "gridfont:wall";
const MAX_SEGS = 56; // a gridletter can light at most all 56 legal segments

function read() {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    const data = raw ? JSON.parse(raw) : [];
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

function write(list) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(list));
  } catch {
    /* quota or disabled storage — nothing we can do */
  }
}

export function getLetters() {
  return read();
}

// Append one drawn letter and return the saved record (null if the input is invalid).
export function addLetter(segs) {
  if (
    !Array.isArray(segs) ||
    segs.length === 0 ||
    segs.length > MAX_SEGS ||
    !segs.every((s) => typeof s === "string")
  ) {
    return null;
  }

  const record = {
    id:
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : String(Date.now()) + Math.random().toString(16).slice(2),
    segs: [...new Set(segs)], // de-dupe within a single submission
    createdAt: Date.now(),
  };

  const list = read();
  list.push(record);
  write(list);
  return record;
}

export function clearLetters() {
  write([]);
}
