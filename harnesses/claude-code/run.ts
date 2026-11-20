#!/usr/bin/env node
// Claude Code as a harness. Contract: ../contract.ts.
//
//   node harnesses/claude-code/run.ts [--model claude-sonnet-5-5] [--max-usd 4] [--max-turns 150]
//                                   [--effort medium]
//
// Claude Code runs headless in bare mode: no hooks, skills, plugins, memory or CLAUDE.md,
// its own empty home folder, an API key and nothing from the user's login. Its built-in
// tools (shell, files, web) are off. The only tools are the allowed ones of the browser
// MCP server, attached to the environment's running browser.

import { spawn } from "node:child_process";
import { createWriteStream, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { createInterface } from "node:readline";
import { parseArgs } from "node:util";
import { readContract, writeRecord } from "../contract.ts";
import { ALLOWED, PROFILE, SERVER_NAME, mcpServer, startMcp, toolId } from "./browser-mcp.ts";

/** The parts of Claude Code's stream-json events this adapter reads. */
interface Block {
  type: string;
  text?: string;
  id?: string;
  name?: string;
  input?: unknown;
  tool_use_id?: string;
  is_error?: boolean;
  content?: string | { text?: string }[];
}
interface StreamEvent {
  type: string;
  subtype?: string;
  message?: { content?: Block[] | string };
  claude_code_version?: string;
  model?: string;
  tools?: string[];
  is_error?: boolean;
  result?: string;
  num_turns?: number;
  total_cost_usd?: number;
  usage?: unknown;
  modelUsage?: unknown;
}

const here = import.meta.dirname;
const repo = resolve(here, "..", "..");
const contract = readContract();
const { values: opt } = parseArgs({
  options: {
    model: { type: "string", default: "claude-sonnet-5-5" },
    "max-usd": { type: "string", default: "4" },
    "max-turns": { type: "string", default: "150" },
    effort: { type: "string" },
  },
});
const settings = {
  model: opt.model,
  profile: PROFILE,
  max_usd: Number(opt["max-usd"]),
  max_turns: Number(opt["max-turns"]),
  effort: opt.effort ?? null,
  mcp_output_tokens: 50_000,
};

function apiKey(): string {
  if (process.env.ANTHROPIC_API_KEY) return process.env.ANTHROPIC_API_KEY;
  const file = join(repo, ".env");
  const line = existsSync(file) ? readFileSync(file, "utf8").split("\n").find((l) => l.startsWith("ANTHROPIC_API_KEY=")) : undefined;
  if (!line) {
    console.error("No Anthropic API key: set ANTHROPIC_API_KEY or write it to .env.");
    process.exit(2);
  }
  return line.slice("ANTHROPIC_API_KEY=".length).trim().replace(/^["']|["']$/g, "");
}

const outDir = contract.outDir;
const home = join(outDir, "home");
const workDir = join(outDir, "workdir");
for (const dir of [home, workDir, join(outDir, "mcp-output")]) mkdirSync(dir, { recursive: true });

// Ask the server for its tools once, and take away every tool that is not on the allow list.
const server = mcpServer({ cdpUrl: contract.cdpUrl, outDir: join(outDir, "mcp-output") });
const probe = await startMcp(server);
const offered = await probe.listTools();
const mcpInfo = probe.serverInfo;
probe.stop();
const allowed = ALLOWED.filter((name) => offered.includes(name));
const blocked = offered.filter((name) => !allowed.includes(name));

const mcpConfig = join(outDir, "mcp.json");
writeFileSync(mcpConfig, JSON.stringify({ mcpServers: { [SERVER_NAME]: server } }, null, 2));

const args = [
  "-p",
  "--bare",
  "--model", settings.model,
  "--mcp-config", mcpConfig,
  "--strict-mcp-config",
  "--tools", "",
  "--allowedTools", allowed.map(toolId).join(","),
  "--disallowedTools", blocked.map(toolId).join(","),
  "--permission-prompts", "none",
  "--max-turns", String(settings.max_turns),
  "--max-budget-usd", String(settings.max_usd),
  "--output-format", "stream-json",
  "--verbose",
];
if (settings.effort) args.push("--effort", settings.effort);

const child = spawn(join(here, "node_modules", ".bin", "claude"), args, {
  cwd: workDir,
  stdio: ["pipe", "pipe", "pipe"],
  env: {
    PATH: process.env.PATH,
    HOME: home,
    CLAUDE_CONFIG_DIR: join(home, ".claude"),
    ANTHROPIC_API_KEY: apiKey(),
    MAX_MCP_OUTPUT_TOKENS: String(settings.mcp_output_tokens),
    CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC: "1",
    DISABLE_AUTOUPDATER: "1",
    // In its container the only way to the model API is the environment's egress proxy.
    ...(process.env.HTTPS_PROXY ? { HTTPS_PROXY: process.env.HTTPS_PROXY, NO_PROXY: process.env.NO_PROXY ?? "" } : {}),
  },
});
child.stdin.end(readFileSync(contract.instructions, "utf8"));
child.stderr.pipe(createWriteStream(join(outDir, "stderr.log")));

let stoppedAtDeadline = false;
const timer = contract.deadline
  ? setTimeout(() => {
      stoppedAtDeadline = true;
      child.kill("SIGTERM");
    }, Math.max(0, contract.deadline.getTime() - Date.now()))
  : undefined;

// Keep every event as Claude Code prints it, and follow along on the console.
const events = createWriteStream(join(outDir, "events.jsonl"));
const started = Date.now();
const toolCalls: Record<string, number> = {};
const toolErrors: Record<string, number> = {};
const callNames = new Map<string, string>();
let init: StreamEvent | null = null;
let result: StreamEvent | null = null;
const short = (text: unknown, n = 150) => String(text).replace(/\s+/g, " ").slice(0, n);
const clock = () => {
  const s = Math.floor((Date.now() - started) / 1000);
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
};
const blocksOf = (event: StreamEvent): Block[] => (Array.isArray(event.message?.content) ? event.message.content : []);

for await (const line of createInterface({ input: child.stdout })) {
  events.write(line + "\n");
  let event: StreamEvent;
  try {
    event = JSON.parse(line);
  } catch {
    continue;
  }
  if (event.type === "system" && event.subtype === "init") init = event;
  if (event.type === "result") result = event;
  for (const block of blocksOf(event)) {
    if (block.type === "text" && block.text?.trim()) console.log(`[${clock()}] says: ${short(block.text, 220)}`);
    if (block.type === "tool_use" && block.name && block.id) {
      const name = block.name.replace(`mcp__${SERVER_NAME}__`, "");
      toolCalls[name] = (toolCalls[name] ?? 0) + 1;
      callNames.set(block.id, name);
      console.log(`[${clock()}] ${name} ${short(JSON.stringify(block.input))}`);
    }
    if (block.type === "tool_result" && block.is_error) {
      const name = callNames.get(block.tool_use_id ?? "") ?? "unknown";
      toolErrors[name] = (toolErrors[name] ?? 0) + 1;
      const text = Array.isArray(block.content) ? block.content.map((c) => c.text ?? "").join(" ") : block.content;
      console.log(`[${clock()}]   error: ${short(text, 200)}`);
    }
  }
}
const exitCode = await new Promise<number | null>((done) => child.on("close", done));
clearTimeout(timer);
events.end();

const stop = stoppedAtDeadline ? "stopped at the deadline" : !result ? `exited with code ${exitCode}` : result.is_error ? `error: ${short(result.result ?? result.subtype, 200)}` : (result.subtype ?? "ended");
const seconds = Math.round((Date.now() - started) / 1000);
// Caches are not a record of the run: drop them before the runner seals the folder.
for (const cache of ["Library", ".cache"]) rmSync(join(home, cache), { recursive: true, force: true });

writeRecord(outDir, {
  harness: "claude-code",
  version: init?.claude_code_version ?? null,
  model: init?.model ?? settings.model,
  way_in: "browser protocol (CDP)",
  tooling: `${mcpInfo?.name} MCP ${mcpInfo?.version}, attached to the running browser`,
  profile: settings.profile,
  tools_offered: init?.tools ?? null,
  tools_blocked: blocked,
  settings,
  system_prompt: "Claude Code default, nothing added",
  mode: "bare, built-in tools off, API key",
  stop,
  is_error: result ? !!result.is_error : true,
  turns: result?.num_turns ?? null,
  seconds,
  cost_usd: result?.total_cost_usd ?? null,
  usage: result?.usage ?? null,
  model_usage: result?.modelUsage ?? null,
  tool_calls: toolCalls,
  tool_errors: toolErrors,
  final_message: result?.result ?? null,
});
console.log(`\nClaude Code ${init?.claude_code_version}: ${stop}, ${result?.num_turns} turns, ${seconds} s, $${result?.total_cost_usd?.toFixed(2) ?? "?"}`);
process.exit(result && !result.is_error ? 0 : 1);
