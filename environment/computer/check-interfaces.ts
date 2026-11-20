#!/usr/bin/env node
// Interface check without a model. Run it against a prepared computer (runner with --keep):
//
//   node environment/computer/check-interfaces.ts
//
// It proves three things a harness depends on:
//   1. the browser protocol (CDP) lists the two prepared tabs,
//   2. the VNC interface reports a 1920x1080 screen with no password,
//   3. a mouse click sent over VNC lands: it clicks the tab that is in the background
//      and the browser brings that tab to the front.

import net from "node:net";
import { connect, sleep, type Tab } from "./cdp.ts";

const CDP_URL = process.env.FAE_CDP_URL || "http://127.0.0.1:9222";
const [RFB_HOST, RFB_PORT] = (process.env.FAE_RFB_ADDR || "127.0.0.1:5900").split(":");
// Where the two tab titles sit on the screen: the ERP's first, Fieldbook's second.
const TAB_TITLE = { erp: [150, 20], fieldbook: [390, 20] } as const;

async function vncSession() {
  const socket = net.connect(Number(RFB_PORT), RFB_HOST);
  let buffer = Buffer.alloc(0);
  let wake: (() => void) | null = null;
  socket.on("data", (chunk) => {
    buffer = Buffer.concat([buffer, chunk]);
    wake?.();
  });
  const read = async (n: number) => {
    while (buffer.length < n) await new Promise<void>((resolve) => (wake = resolve));
    const out = buffer.subarray(0, n);
    buffer = buffer.subarray(n);
    return out;
  };

  // The RFB handshake: version, security type None, shared session, screen size.
  const version = (await read(12)).toString().trim();
  socket.write("RFB 003.008\n");
  const types = [...(await read((await read(1)).readUInt8(0)))];
  if (!types.includes(1)) throw new Error(`VNC asks for a password (security types ${types})`);
  socket.write(Buffer.from([1]));
  if ((await read(4)).readUInt32BE(0) !== 0) throw new Error("VNC refused the connection");
  socket.write(Buffer.from([1]));
  const init = await read(24);
  await read(init.readUInt32BE(20)); // desktop name

  const pointer = (buttons: number, x: number, y: number) => {
    const msg = Buffer.alloc(6);
    msg.writeUInt8(5, 0);
    msg.writeUInt8(buttons, 1);
    msg.writeUInt16BE(x, 2);
    msg.writeUInt16BE(y, 4);
    socket.write(msg);
  };
  const click = async (x: number, y: number) => {
    pointer(0, x, y);
    await sleep(150);
    pointer(1, x, y);
    await sleep(80);
    pointer(0, x, y);
  };
  return { version, screen: { width: init.readUInt16BE(0), height: init.readUInt16BE(2) }, click, close: () => socket.destroy() };
}

const frontUrl = async (tabs: Tab[]): Promise<string> => {
  for (const tab of tabs) if ((await tab.evaluate("document.visibilityState")) === "visible") return tab.evaluate("location.href");
  return "none";
};

let failed = false;
const check = (name: string, pass: boolean, detail: string) => {
  failed ||= !pass;
  console.log(`${pass ? "PASS" : "FAIL"}  ${name}: ${detail}`);
};

const browser = await connect(CDP_URL);
const pages = await browser.pages();
check("browser protocol lists the prepared tabs", pages.length === 2, pages.map((p) => p.url).join(" | "));

const vnc = await vncSession();
check("VNC interface open, no password", true, vnc.version);
check("screen is 1920x1080", vnc.screen.width === 1920 && vnc.screen.height === 1080, `${vnc.screen.width}x${vnc.screen.height}`);

const tabs = await Promise.all(pages.map((p) => browser.tab(p.targetId)));
const before = await frontUrl(tabs);
const [x, y] = before.includes("fieldbook") ? TAB_TITLE.erp : TAB_TITLE.fieldbook;
await vnc.click(x, y);
await sleep(1200);
const after = await frontUrl(tabs);
check("a click over VNC lands", after !== before && after !== "none", `front tab before ${before}, after ${after}`);

// Put the Fieldbook tab back in front, as at run start.
const fieldbook = pages.find((p) => p.url.includes("fieldbook"));
if (fieldbook) await browser.send("Target.activateTarget", { targetId: fieldbook.targetId });

vnc.close();
browser.close();
process.exit(failed ? 1 : 0);
