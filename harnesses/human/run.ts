#!/usr/bin/env node
// A person as the harness. Contract: ../contract.ts.
// Shows the instructions, points to the web view, and waits until the person presses Enter.

import { readFileSync } from "node:fs";
import { createInterface } from "node:readline";
import { readContract, writeRecord } from "../contract.ts";

const contract = readContract();
const started = Date.now();

console.log("\n" + readFileSync(contract.instructions, "utf8").trim() + "\n");
console.log(`Open ${contract.webViewUrl} in your browser and do the task there.`);
console.log(`The runner stops this run at ${contract.deadline?.toISOString() ?? "no set time"}. Press Enter here when you are done.\n`);

await new Promise((done) => createInterface({ input: process.stdin }).once("line", done));

writeRecord(contract.outDir, {
  harness: "human",
  version: null,
  model: null,
  way_in: "web view",
  profile: "person at the screen",
  seconds: Math.round((Date.now() - started) / 1000),
  cost_usd: 0,
});
process.exit(0);
