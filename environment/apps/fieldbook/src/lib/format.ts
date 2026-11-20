// Formatting shared by server and browser. Times show in the firm's office time zone,
// whatever the machine is set to, so both sides render the same text.
export const TZ = "America/Los_Angeles";

const dt = new Intl.DateTimeFormat("en-US", { timeZone: TZ, month: "2-digit", day: "2-digit", year: "numeric", hour: "numeric", minute: "2-digit" });
const d = new Intl.DateTimeFormat("en-US", { timeZone: TZ, month: "2-digit", day: "2-digit", year: "numeric" });
const long = new Intl.DateTimeFormat("en-US", { timeZone: "UTC", month: "long", day: "numeric", year: "numeric" });
const weekday = new Intl.DateTimeFormat("en-US", { timeZone: "UTC", weekday: "short", month: "short", day: "numeric" });

/** "2026-09-29" to "09/29/2026". */
export function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "";
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  return m ? `${m[2]}/${m[3]}/${m[1]}` : iso;
}
export const fmtLongDate = (iso: string) => long.format(new Date(iso + "T12:00:00Z"));
export const fmtWeekday = (iso: string) => weekday.format(new Date(iso + "T12:00:00Z"));
/** A stored moment to "11/16/2026, 4:15 PM" in office time. */
export const fmtDateTime = (iso: string | null | undefined) => (iso ? dt.format(new Date(iso)).replace(",", "") : "");
export const fmtDay = (iso: string | null | undefined) => (iso ? d.format(new Date(iso)) : "");
/** Today's date in office time as YYYY-MM-DD. */
export function isoDay(at: Date): string {
  const p = Object.fromEntries(new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(at).map((x) => [x.type, x.value]));
  return `${p.year}-${p.month}-${p.day}`;
}

export function fmtMoney(n: number | null | undefined, opts: { sign?: boolean; cents?: boolean } = {}): string {
  if (n === null || n === undefined) return "";
  const abs = Math.abs(n).toLocaleString("en-US", { minimumFractionDigits: opts.cents || !Number.isInteger(n) ? 2 : 0, maximumFractionDigits: 2 });
  const s = (opts.sign ? "$" : "") + abs;
  return n < 0 ? `(${s})` : s;
}
export const fmtPct = (x: number | null | undefined) => (x === null || x === undefined ? "" : (x * 100).toFixed(1) + "%");

/** What a person types into a date field, to YYYY-MM-DD. Month comes first, as in the US. */
export function parseDate(input: string): string | null {
  const s = input.trim();
  if (!s) return null;
  const ok = (y: number, m: number, dd: number) => {
    const t = new Date(Date.UTC(y, m - 1, dd));
    return t.getUTCFullYear() === y && t.getUTCMonth() === m - 1 && t.getUTCDate() === dd && y > 1990 && y < 2100
      ? `${y}-${String(m).padStart(2, "0")}-${String(dd).padStart(2, "0")}` : null;
  };
  let m = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(s);
  if (m) return ok(+m[1], +m[2], +m[3]);
  m = /^(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{2}|\d{4})$/.exec(s);
  if (m) return ok(m[3].length === 2 ? 2000 + +m[3] : +m[3], +m[1], +m[2]);
  const months = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
  m = /^([a-z]{3})[a-z]*\.?\s+(\d{1,2})(?:st|nd|rd|th)?,?\s+(\d{4})$/i.exec(s);
  if (m && months.includes(m[1].toLowerCase())) return ok(+m[3], months.indexOf(m[1].toLowerCase()) + 1, +m[2]);
  m = /^(\d{1,2})(?:st|nd|rd|th)?\s+([a-z]{3})[a-z]*\.?,?\s+(\d{4})$/i.exec(s);
  if (m && months.includes(m[2].toLowerCase())) return ok(+m[3], months.indexOf(m[2].toLowerCase()) + 1, +m[1]);
  return null;
}

/** What a person types into an amount field, to a number. "1,038,450", "$1,038,450.00", "(500)". */
export function parseAmount(input: string): number | null | "invalid" {
  let s = input.trim();
  if (!s) return null;
  let neg = false;
  if (/^\(.*\)$/.test(s)) { neg = true; s = s.slice(1, -1); }
  s = s.replace(/[$\s]/g, "");
  if (s.startsWith("-")) { neg = !neg; s = s.slice(1); }
  if (!/^(\d{1,3}(,\d{3})+|\d+)(\.\d{1,2})?$/.test(s)) return "invalid";
  const n = Number(s.replace(/,/g, ""));
  return neg ? -n : n;
}

export const STATUS_LABEL: Record<string, string> = {
  not_started: "Not started", in_progress: "In progress", ready_for_review: "Ready for review", reviewed: "Reviewed",
};
export const TICK_LABEL: Record<string, string> = { agrees: "Agrees", does_not_agree: "Does not agree" };
