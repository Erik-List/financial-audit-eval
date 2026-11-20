"use client";
// Controls shared by the screens: dropdown, date field, dialog, toasts.
import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { fmtDate, parseDate } from "@/lib/format";

export async function api(method: string, url: string, body?: unknown): Promise<any> {
  const res = await fetch(url, { method, headers: { "content-type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || "Something went wrong. Your change was not saved.");
  return json;
}

/** Closes a popup on a click outside it or on Escape. */
export function useDismiss(open: boolean, close: () => void) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const down = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) close(); };
    const key = (e: KeyboardEvent) => { if (e.key === "Escape") close(); };
    document.addEventListener("mousedown", down);
    document.addEventListener("keydown", key);
    return () => { document.removeEventListener("mousedown", down); document.removeEventListener("keydown", key); };
  }, [open, close]);
  return ref;
}

export type Option = { value: string; label: string; icon?: ReactNode };

export function Select({ value, options, onChange, placeholder, disabled, block, id, ariaLabel, width }: {
  value: string; options: Option[]; onChange: (v: string) => void; placeholder?: string; disabled?: boolean; block?: boolean; id?: string; ariaLabel?: string; width?: number;
}) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [up, setUp] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  const ref = useDismiss(open, close);
  const current = options.find((o) => o.value === value);
  const show = () => {
    if (disabled) return;
    const box = ref.current?.getBoundingClientRect();
    setUp(!!box && window.innerHeight - box.bottom < Math.min(320, options.length * 30 + 16));
    setActive(Math.max(0, options.findIndex((o) => o.value === value)));
    setOpen(true);
  };
  const pick = (o: Option) => { onChange(o.value); setOpen(false); };
  const onKey = (e: React.KeyboardEvent) => {
    if (!open) {
      if (["ArrowDown", "ArrowUp", "Enter", " "].includes(e.key)) { e.preventDefault(); show(); }
      return;
    }
    if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => Math.min(options.length - 1, a + 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => Math.max(0, a - 1)); }
    else if (e.key === "Enter" || e.key === " ") { e.preventDefault(); pick(options[active]); }
    else if (e.key === "Tab") setOpen(false);
    else if (e.key.length === 1) {
      const i = options.findIndex((o) => o.label.toLowerCase().startsWith(e.key.toLowerCase()));
      if (i >= 0) setActive(i);
    }
  };
  return (
    <div className={"select" + (block ? " block" : "")} ref={ref} style={width ? { width } : undefined}>
      <button type="button" id={id} className="select-btn" disabled={disabled} role="combobox" aria-haspopup="listbox" aria-expanded={open} aria-label={ariaLabel}
        onClick={() => (open ? setOpen(false) : show())} onKeyDown={onKey}>
        {current && current.value !== "" ? current.label : <span className="placeholder">{placeholder ?? current?.label ?? "Select"}</span>}
      </button>
      {open && (
        <ul className={"listbox" + (up ? " up" : "")} role="listbox">
          {options.map((o, i) => (
            <li key={o.value} role="option" aria-selected={o.value === value} className={"option" + (i === active ? " active" : "")}
              onMouseEnter={() => setActive(i)} onMouseDown={(e) => { e.preventDefault(); pick(o); }}>
              {o.icon}{o.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

/** A typed date (MM/DD/YYYY) with a calendar. `value` is YYYY-MM-DD or "". */
export function DateField({ value, onChange, onValidity, disabled, id, defaultMonth }: {
  value: string; onChange: (iso: string) => void; onValidity?: (ok: boolean) => void; disabled?: boolean; id?: string; defaultMonth?: string;
}) {
  const [text, setText] = useState(fmtDate(value));
  const [bad, setBad] = useState(false);
  const [open, setOpen] = useState(false);
  const [view, setView] = useState(() => (value || defaultMonth || new Date().toISOString()).slice(0, 7));
  const close = useCallback(() => setOpen(false), []);
  const ref = useDismiss(open, close);
  const input = useRef<HTMLInputElement>(null);
  // Follow the value from outside, but never rewrite the text while the person is typing.
  useEffect(() => { if (document.activeElement !== input.current) { setText(fmtDate(value)); setBad(false); } }, [value]);

  const commit = (raw: string) => {
    if (!raw.trim()) { setBad(false); onValidity?.(true); onChange(""); return; }
    const iso = parseDate(raw);
    if (!iso) { setBad(true); onValidity?.(false); return; }
    setBad(false); onValidity?.(true); setText(fmtDate(iso)); onChange(iso);
  };
  const [y, m] = view.split("-").map(Number);
  const first = new Date(Date.UTC(y, m - 1, 1));
  const start = new Date(first); start.setUTCDate(1 - first.getUTCDay());
  const days = Array.from({ length: 42 }, (_, i) => { const d = new Date(start); d.setUTCDate(start.getUTCDate() + i); return d; });
  const shift = (n: number) => { const d = new Date(Date.UTC(y, m - 1 + n, 1)); setView(d.toISOString().slice(0, 7)); };
  return (
    <div className="input-wrap" ref={ref}>
      <input ref={input} id={id} className={"input" + (bad ? " invalid" : "")} value={text} disabled={disabled} placeholder="MM/DD/YYYY" autoComplete="off"
        onChange={(e) => { setText(e.target.value); const iso = parseDate(e.target.value); if (iso) { setBad(false); onValidity?.(true); onChange(iso); } else if (!e.target.value.trim()) { setBad(false); onValidity?.(true); onChange(""); } else onValidity?.(false); }}
        onBlur={(e) => commit(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") commit((e.target as HTMLInputElement).value); }} />
      {!disabled && (
        <button type="button" className="suffix-btn" aria-label="Open calendar" onClick={() => { setView((value || defaultMonth || new Date().toISOString()).slice(0, 7)); setOpen((o) => !o); }}>
          <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4"><rect x="2" y="3.5" width="12" height="10.5" rx="1.5" /><path d="M2 6.5h12M5 2v3M11 2v3" /></svg>
        </button>
      )}
      {bad && <div className="error" role="alert">Enter a date as MM/DD/YYYY.</div>}
      {open && (
        <div className="popover calendar" role="dialog" aria-label="Choose a date">
          <div className="cal-head">
            <button type="button" className="btn ghost sm icon" aria-label="Previous month" onClick={() => shift(-1)}>‹</button>
            <span>{MONTHS[m - 1]} {y}</span>
            <button type="button" className="btn ghost sm icon" aria-label="Next month" onClick={() => shift(1)}>›</button>
          </div>
          <table>
            <thead><tr>{["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((d) => <th key={d}>{d}</th>)}</tr></thead>
            <tbody>
              {Array.from({ length: 6 }, (_, w) => (
                <tr key={w}>{days.slice(w * 7, w * 7 + 7).map((d) => {
                  const iso = d.toISOString().slice(0, 10);
                  return <td key={iso}><button type="button" className={(iso === value ? "sel " : "") + (d.getUTCMonth() !== m - 1 ? "out" : "")}
                    onClick={() => { setBad(false); onValidity?.(true); onChange(iso); setText(fmtDate(iso)); setOpen(false); }}>{d.getUTCDate()}</button></td>;
                })}</tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/** A text box that grows with its text, so nothing scrolls inside it. */
export function AutoTextarea({ value, onChange, minRows = 3, ...rest }: { value: string; onChange: (v: string) => void; minRows?: number } & Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, "onChange" | "value">) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useLayoutEffect(() => {
    const el = ref.current; if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.max(el.scrollHeight + 2, minRows * 20 + 16) + "px";
  }, [value, minRows]);
  return <textarea ref={ref} className="textarea" value={value} rows={minRows} onChange={(e) => onChange(e.target.value)} {...rest} />;
}

export function Dialog({ title, children, footer, onClose, width }: { title: string; children: ReactNode; footer: ReactNode; onClose: () => void; width?: number }) {
  useEffect(() => {
    const key = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", key);
    return () => document.removeEventListener("keydown", key);
  }, [onClose]);
  return (
    <div className="backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="dialog" role="dialog" aria-modal="true" aria-label={title} style={width ? { width } : undefined}>
        <div className="dialog-head"><h2>{title}</h2></div>
        <div className="dialog-body">{children}</div>
        <div className="dialog-foot">{footer}</div>
      </div>
    </div>
  );
}

type Toast = { id: number; text: string; err?: boolean };
const ToastCtx = createContext<(text: string, err?: boolean) => void>(() => {});
export const useToast = () => useContext(ToastCtx);
export function Toasts({ children }: { children: ReactNode }) {
  const [list, setList] = useState<Toast[]>([]);
  const push = useCallback((text: string, err?: boolean) => {
    const id = Date.now() + Math.random();
    setList((l) => [...l, { id, text, err }]);
    setTimeout(() => setList((l) => l.filter((t) => t.id !== id)), err ? 7000 : 3500);
  }, []);
  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className="toasts" aria-live="polite">
        {list.map((t) => <div key={t.id} className={"toast" + (t.err ? " err" : "")} role="status">{t.err ? "!" : "✓"} {t.text}</div>)}
      </div>
    </ToastCtx.Provider>
  );
}

/**
 * While `dirty`, asks before the person leaves: the browser's own prompt on reload or
 * close, and `ask` (which shows the app's dialog) on a click on any link in the app.
 */
export function useUnsavedGuard(dirty: boolean, ask: (go: () => void) => void) {
  const bypass = useRef(false);
  useEffect(() => {
    if (!dirty) return;
    const unload = (e: BeforeUnloadEvent) => { if (bypass.current) return; e.preventDefault(); e.returnValue = ""; };
    const click = (e: MouseEvent) => {
      const a = (e.target as HTMLElement).closest?.("a[href]") as HTMLAnchorElement | null;
      if (!a || a.target === "_blank" || e.metaKey || e.ctrlKey || a.dataset.guard === "off") return;
      e.preventDefault(); e.stopPropagation();
      ask(() => { bypass.current = true; window.location.href = a.href; });
    };
    window.addEventListener("beforeunload", unload);
    document.addEventListener("click", click, true);
    return () => { window.removeEventListener("beforeunload", unload); document.removeEventListener("click", click, true); };
  }, [dirty, ask]);
}
