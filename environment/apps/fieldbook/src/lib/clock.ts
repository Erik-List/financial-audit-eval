// The app's clock. FIELDBOOK_NOW pins the moment the server starts (for example
// 2026-11-17T09:00:00-08:00); time then runs on from there. Unset, it is the real time.
//
// "Server start" is the start of the server process, not the first load of this file.
// The production build loads this file once for the pages and once for the API routes,
// each on first use, so a clock counted from the load began again at the first save.
const started = Date.now() - Math.round(process.uptime() * 1000);
const pinned = process.env.FIELDBOOK_NOW ? Date.parse(process.env.FIELDBOOK_NOW) : NaN;

export function now(): Date {
  return Number.isNaN(pinned) ? new Date() : new Date(pinned + (Date.now() - started));
}
export const nowIso = () => now().toISOString();
