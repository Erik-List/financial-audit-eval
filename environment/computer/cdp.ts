// A small client for the browser protocol (CDP), on Node's built-in fetch and WebSocket.
// Used by the runner to prepare the computer. Harnesses bring their own client.

export interface BrowserVersion {
  Browser: string;
  webSocketDebuggerUrl: string;
}
export interface Page {
  targetId: string;
  url: string;
}
/** One browser tab, addressed through its own session. */
export interface Tab {
  targetId: string;
  call<T = any>(method: string, params?: object): Promise<T>;
  evaluate<T = any>(expression: string): Promise<T>;
  goto(url: string, timeoutMs?: number): Promise<void>;
}

export const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

export async function waitForBrowser(httpUrl: string, timeoutMs = 90_000): Promise<BrowserVersion> {
  const end = Date.now() + timeoutMs;
  for (;;) {
    try {
      const res = await fetch(`${httpUrl}/json/version`);
      if (res.ok) return (await res.json()) as BrowserVersion;
    } catch {}
    if (Date.now() > end) throw new Error(`No browser answered at ${httpUrl} within ${timeoutMs / 1000} s`);
    await sleep(1000);
  }
}

export async function connect(httpUrl: string) {
  const version = await waitForBrowser(httpUrl);
  const ws = new WebSocket(version.webSocketDebuggerUrl);
  await new Promise<void>((resolve, reject) => {
    ws.addEventListener("open", () => resolve(), { once: true });
    ws.addEventListener("error", () => reject(new Error("Could not open the browser protocol socket")), { once: true });
  });

  let lastId = 0;
  const waiting = new Map<number, { resolve: (value: any) => void; reject: (error: Error) => void; method: string }>();
  ws.addEventListener("message", (event) => {
    const msg = JSON.parse(String(event.data));
    const call = waiting.get(msg.id);
    if (!call) return;
    waiting.delete(msg.id);
    if (msg.error) call.reject(new Error(`${call.method}: ${msg.error.message}`));
    else call.resolve(msg.result);
  });

  const send = <T = any>(method: string, params: object = {}, sessionId?: string): Promise<T> =>
    new Promise((resolve, reject) => {
      const id = ++lastId;
      waiting.set(id, { resolve, reject, method });
      ws.send(JSON.stringify({ id, method, params, ...(sessionId ? { sessionId } : {}) }));
    });

  const tab = async (targetId: string): Promise<Tab> => {
    const { sessionId } = await send("Target.attachToTarget", { targetId, flatten: true });
    const call = <T = any>(method: string, params?: object) => send<T>(method, params, sessionId);
    const evaluate = async <T = any>(expression: string): Promise<T> => {
      const out = await call("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
      if (out.exceptionDetails) throw new Error(out.exceptionDetails.exception?.description || out.exceptionDetails.text);
      return out.result.value;
    };
    const goto = async (url: string, timeoutMs = 60_000) => {
      await call("Page.navigate", { url });
      const end = Date.now() + timeoutMs;
      for (;;) {
        await sleep(500);
        try {
          if ((await evaluate("document.readyState")) === "complete") return;
        } catch {}
        if (Date.now() > end) throw new Error(`Page did not finish loading: ${url}`);
      }
    };
    return { targetId, call, evaluate, goto };
  };

  /** The open tabs. */
  const pages = async (): Promise<Page[]> => {
    const { targetInfos } = await send<{ targetInfos: (Page & { type: string })[] }>("Target.getTargets");
    return targetInfos.filter((t) => t.type === "page");
  };

  return { version, send, tab, pages, close: () => ws.close() };
}
