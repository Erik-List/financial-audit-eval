#!/usr/bin/env node
// Rebuilds runs/store/index.jsonl from the run folders and prints the runs as a table.
//
//   node runs/index.ts
//
// The index is derived: delete it and run this again, and it is back.

import { resolve } from "node:path";
import { buildIndex } from "./run-folder.ts";

const repo = resolve(import.meta.dirname, "..");
const { lines, skipped } = buildIndex(resolve(repo, "runs", "store"));

console.table(
  lines.map((l) => ({
    run: l.run_id,
    task: l.task_name,
    harness: [l.harness, l.model].filter(Boolean).join(" / "),
    "way in": l.way_in,
    attempt: l.attempt,
    grade: l.pass == null ? "not graded" : `${l.pass ? "PASS" : "FAIL"} ${l.checks_passed}/${l.checks_total}`,
    min: Math.round((l.seconds / 60) * 10) / 10,
    usd: l.cost_usd,
    sealed: l.sealed,
  })),
);
console.log(`${lines.length} runs in runs/store/index.jsonl`);
if (skipped.length) console.log(`Skipped, not in the current folder format: ${skipped.join(", ")}`);
