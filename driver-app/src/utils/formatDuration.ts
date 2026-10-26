/**
 * Formats a duration in minutes for display.
 *   600 -> "10 hr", 85 -> "1 hr 25 min", 45 -> "45 min".
 * Also accepts strings like "600 min", "600 mins", "1 hr 5 min", "1 hour 5 minutes",
 * "3600s" / "3600 sec" (seconds).
 */
export function formatDuration(value?: string | number | null): string {
  if (value === undefined || value === null || value === "") return "";
  const total = parseMinutes(value);
  if (total === null) return String(value);
  return minutesToText(total);
}

/** Alias kept for string inputs coming from the backend (e.g. duration_text). */
export function formatDurationText(value?: string | number | null): string {
  return formatDuration(value);
}

export function minutesToText(totalMinutes: number): string {
  const total = Math.max(0, Math.round(totalMinutes));
  if (total < 60) return `${total} min`;
  const h = Math.floor(total / 60);
  const m = total % 60;
  return m === 0 ? `${h} hr` : `${h} hr ${m} min`;
}

function parseMinutes(value: string | number): number | null {
  if (typeof value === "number") return isFinite(value) ? value : null;
  const s = value.toLowerCase().trim();
  const hr = s.match(/(\d+(?:\.\d+)?)\s*(h|hr|hrs|hour|hours)\b/);
  const mn = s.match(/(\d+(?:\.\d+)?)\s*(m|min|mins|minute|minutes)\b/);
  const sec = s.match(/(\d+(?:\.\d+)?)\s*(s|sec|secs|second|seconds)\b/);
  if (hr || mn) {
    return (hr ? parseFloat(hr[1]) * 60 : 0) + (mn ? parseFloat(mn[1]) : 0);
  }
  if (sec) return parseFloat(sec[1]) / 60;
  const plain = s.match(/^(\d+(?:\.\d+)?)$/);
  if (plain) return parseFloat(plain[1]);
  return null;
}
