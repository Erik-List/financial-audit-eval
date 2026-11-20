#!/usr/bin/env node
// Checks that a run's evidence is as it was when the run ended.
//
//   node runs/verify.ts runs/store/<run id> [more run folders]
//
// Compares every file under run.json, task/, environment/ and harness/ with fingerprints.json.
// A published copy leaves out what omitted.json names; those files count as omitted, not missing.

import { resolve } from "node:path";
import { checkSeal } from "./run-folder.ts";

let allIntact = true;
for (const folder of process.argv.slice(2)) {
  const check = checkSeal(resolve(folder));
  if (!check.sealed) console.log(`NOT SEALED  ${folder}: no fingerprints.json`);
  else if (check.intact) console.log(`INTACT      ${folder}${check.omitted.length ? `  (${check.omitted.length} files left out, as omitted.json says)` : ""}`);
  else {
    console.log(`CHANGED     ${folder}`);
    for (const file of check.changed) console.log(`              changed: ${file}`);
    for (const file of check.missing) console.log(`              missing: ${file}`);
    for (const file of check.added) console.log(`              added:   ${file}`);
  }
  allIntact &&= check.sealed && check.intact;
}
process.exit(allIntact ? 0 : 1);
