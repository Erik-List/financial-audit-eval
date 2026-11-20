// Deletes the audit file's database and uploads, so the app starts from the seed again.
// The running app notices the missing file and fills a new one on the next request.
import { rmSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

const file = resolve(process.env.FIELDBOOK_DB || join(process.cwd(), "data", "fieldbook.db"));
for (const f of [file, file + "-wal", file + "-shm"]) rmSync(f, { force: true });
rmSync(join(dirname(file), "uploads"), { recursive: true, force: true });
console.log("Removed " + file);
