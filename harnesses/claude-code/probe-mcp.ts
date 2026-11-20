#!/usr/bin/env node
// Talks to the browser MCP server the way Claude Code will, without a model.
//
//   node harnesses/claude-code/probe-mcp.ts                       list the tools and which are allowed
//   node harnesses/claude-code/probe-mcp.ts call <tool> '<json arguments>' [<tool> '<json>' ...]
//
// Per call it prints the size of the answer in characters and a rough token count, so page
// sizes can be held against Claude Code's limit for one tool answer (25,000 tokens).
// Settings: FAE_CDP_URL, SHOW (characters of text to print).

import { ALLOWED, mcpServer, startMcp } from "./browser-mcp.ts";

const mcp = await startMcp(mcpServer({ cdpUrl: process.env.FAE_CDP_URL || "http://127.0.0.1:9222", outDir: process.env.FAE_OUT_DIR || "/tmp/fae-probe" }));

const [command, ...calls] = process.argv.slice(2);
if (command !== "call") {
  const tools = await mcp.listTools();
  for (const name of tools) console.log(`${ALLOWED.includes(name) ? "allowed" : "blocked"}  ${name}`);
  const missing = ALLOWED.filter((name) => !tools.includes(name));
  console.log(`\n${mcp.serverInfo?.name} ${mcp.serverInfo?.version}: ${tools.length} tools, ${ALLOWED.length - missing.length} allowed`);
  if (missing.length) console.log(`Allowed but not offered by this server version: ${missing.join(", ")}`);
} else {
  const show = Number(process.env.SHOW || 1200);
  for (let i = 0; i < calls.length; i += 2) {
    const name = calls[i];
    const args = JSON.parse(calls[i + 1] || "{}");
    const started = Date.now();
    const { result, error } = await mcp.call(name, args);
    const parts = result?.content ?? [];
    const text = parts.filter((p) => p.type === "text").map((p) => p.text).join("\n");
    const images = parts.filter((p) => p.type === "image");
    console.log(`\n=== ${name} ${JSON.stringify(args)}  (${Date.now() - started} ms)`);
    if (error) console.log("error:", JSON.stringify(error));
    console.log(`text: ${text.length} characters, about ${Math.round(text.length / 4)} tokens; images: ${images.length}${images.map((im) => ` (${im.mimeType}, ${Math.round(((im.data?.length ?? 0) * 3) / 4 / 1024)} kB)`).join("")}${result?.isError ? "; marked as error" : ""}`);
    console.log(text.slice(0, show) + (text.length > show ? `\n... [${text.length - show} more characters]` : ""));
  }
}
mcp.stop();
process.exit(0);
