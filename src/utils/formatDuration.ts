/** Converts "600 min" / "600 minutes" / 600 into "10 hr", "95 min" -> "1 hr 35 min". */
export function formatDuration(value?: string | number | null): string {
  if (value === undefined || value === null || value === "") return "";
  const match = String(value).match(/(\d+(?:\.\d+)?)/);
  if (!match) return String(value);
  const total = Math.round(parseFloat(match[1]));
  if (total < 60) return `${total} min`;
  const h = Math.floor(total / 60);
  const m = total % 60;
  const hrLabel = "hr";
  return m === 0 ? `${h} ${hrLabel}` : `${h} ${hrLabel} ${m} min`;
}
