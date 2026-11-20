"use client";
// The test-of-details worksheet: the sample grid, the item panel and the conclusion.
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { fmtDate, fmtDateTime, fmtMoney, parseAmount, TICK_LABEL } from "@/lib/format";
import { api, AutoTextarea, DateField, Dialog, Select, useToast, useUnsavedGuard } from "./ui";
import { unsaved } from "./unsaved";
import { Icon } from "./bits";

export type Item = {
  item_no: number; invoice_no: string; invoice_date: string; customer: string; amount: number;
  delivery_note_no: string | null; delivery_date: string | null;
  tick_quantity: string | null; tick_price: string | null; tick_period: string | null; tick_payment: string | null;
  difference: number | null; comment: string | null; updated_at: string | null; updated_by: string | null;
};
type Draft = { dn: string; date: string; quantity: string; price: string; period: string; payment: string; diff: string; comment: string };

const ATTRS = [
  { key: "quantity", label: "Quantity", hint: "Units the customer received and kept" },
  { key: "price", label: "Price", hint: "A price the customer agreed to" },
  { key: "period", label: "Period", hint: "Delivered on or before year end" },
  { key: "payment", label: "Payment", hint: "The amount due was received" },
] as const;
const TICK_OPTIONS = [
  { value: "", label: "Not tested" },
  { value: "agrees", label: "Agrees", icon: <span className="tick agrees">✓</span> },
  { value: "does_not_agree", label: "Does not agree", icon: <span className="tick does_not_agree">✗</span> },
];

const toDraft = (i: Item): Draft => ({
  dn: i.delivery_note_no ?? "", date: i.delivery_date ?? "",
  quantity: i.tick_quantity ?? "", price: i.tick_price ?? "", period: i.tick_period ?? "", payment: i.tick_payment ?? "",
  diff: i.difference === null ? "" : fmtMoney(i.difference), comment: i.comment ?? "",
});
const progress = (i: Item) => {
  const filled = [i.delivery_note_no, i.delivery_date, i.tick_quantity, i.tick_price, i.tick_period, i.tick_payment].filter(Boolean).length;
  return filled === 6 ? "done" : filled || i.difference !== null || i.comment ? "part" : "none";
};
function Tick({ v }: { v: string | null }) {
  return <span className={"tick " + (v ?? "")} title={v ? TICK_LABEL[v] : "Not tested"}>{v === "agrees" ? "✓" : v === "does_not_agree" ? "✗" : ""}</span>;
}

function UnsavedDialog({ what, onSave, onDiscard, onStay, saving }: { what: string; onSave: () => void; onDiscard: () => void; onStay: () => void; saving: boolean }) {
  return (
    <Dialog title="Unsaved changes" onClose={onStay}
      footer={<><button className="btn" onClick={onStay}>Keep editing</button><button className="btn danger" onClick={onDiscard}>Discard changes</button><button className="btn primary" onClick={onSave} disabled={saving}>Save changes</button></>}>
      <p>{what} has changes that are not saved.</p>
    </Dialog>
  );
}

export function TestingTab({ taskRef, initial, locked, lockReason, yearEnd, people }: {
  taskRef: string; initial: Item[]; locked: boolean; lockReason: string; yearEnd: string; people: Record<string, string>;
}) {
  const toast = useToast();
  const router = useRouter();
  const [items, setItems] = useState(initial);
  const [sel, setSel] = useState<number | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [dateOk, setDateOk] = useState(true);
  const [diffErr, setDiffErr] = useState(false);
  const [saving, setSaving] = useState(false);
  const [pending, setPending] = useState<null | (() => void)>(null);

  const item = items.find((i) => i.item_no === sel) ?? null;
  const dirty = !!item && !!draft && JSON.stringify(draft) !== JSON.stringify(toDraft(item));
  useEffect(() => { unsaved.current = dirty; return () => { unsaved.current = false; }; }, [dirty]);

  const open = useCallback((no: number | null, list = items) => {
    const it = list.find((i) => i.item_no === no) ?? null;
    setSel(it ? it.item_no : null); setDraft(it ? toDraft(it) : null); setDateOk(true); setDiffErr(false);
  }, [items]);
  const attempt = (action: () => void) => (dirty ? setPending(() => action) : action());
  useUnsavedGuard(dirty, useCallback((go: () => void) => setPending(() => go), []));

  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setDraft((d) => (d ? { ...d, [k]: v } : d));

  async function save(): Promise<Item[] | null> {
    if (!item || !draft) return null;
    const amount = parseAmount(draft.diff);
    if (amount === "invalid") { setDiffErr(true); toast("The difference is not an amount. Nothing was saved.", true); return null; }
    if (!dateOk) { toast("The delivery date is not a valid date. Nothing was saved.", true); return null; }
    setSaving(true);
    try {
      const res = await api("PUT", `/api/tasks/${taskRef}/items/${item.item_no}`, {
        delivery_note_no: draft.dn, delivery_date: draft.date || null,
        tick_quantity: draft.quantity || null, tick_price: draft.price || null, tick_period: draft.period || null, tick_payment: draft.payment || null,
        difference: amount, comment: draft.comment,
      });
      const list = items.map((i) => (i.item_no === item.item_no ? { ...i, ...res.item } : i));
      setItems(list); setDraft(toDraft(res.item));
      toast(`Item ${item.item_no} saved`);
      router.refresh();
      return list;
    } catch (e: any) {
      toast(e.message, true); return null;
    } finally { setSaving(false); }
  }

  const totals = useMemo(() => ({ amount: items.reduce((s, i) => s + i.amount, 0), diff: items.some((i) => i.difference !== null) ? items.reduce((s, i) => s + (i.difference ?? 0), 0) : null }), [items]);
  const complete = items.filter((i) => progress(i) === "done").length;

  return (
    <div className="wp">
      <section className={"card wp-grid" + (item ? " narrow" : "")}>
        <div className="card-head">
          <h2>Sample items</h2><span className="muted">{complete} of {items.length} complete</span>
          <span className="spacer" />
          <span className="muted">Select an item to {locked ? "view" : "record"} the testing</span>
        </div>
        <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th style={{ width: 34 }}>#</th><th>Sales invoice</th><th>Invoice date</th><th>Customer</th><th className="num">Invoice amount</th>
              <th>Delivery note</th><th>Delivery date</th>
              {ATTRS.map((a) => <th key={a.key} className="tickcol" title={a.hint}>{a.label}</th>)}
              <th className="num">Difference</th><th>{item ? "" : "Comment"}</th><th style={{ width: 28 }} />
            </tr>
          </thead>
          <tbody>
            {items.map((i) => (
              <tr key={i.item_no} className={"hover" + (i.item_no === sel ? " sel" : "")} tabIndex={0} aria-selected={i.item_no === sel}
                onClick={() => i.item_no !== sel && attempt(() => open(i.item_no))}
                onKeyDown={(e) => { if (e.key === "Enter" && i.item_no !== sel) attempt(() => open(i.item_no)); }}>
                <td className="num">{i.item_no}</td>
                <td className="mono nowrap">{i.invoice_no}</td>
                <td className="nowrap">{fmtDate(i.invoice_date)}</td>
                <td>{i.customer}</td>
                <td className="num">{fmtMoney(i.amount)}</td>
                <td className="mono nowrap">{i.delivery_note_no}</td>
                <td className="nowrap">{fmtDate(i.delivery_date)}</td>
                <td className="tickcol"><Tick v={i.tick_quantity} /></td>
                <td className="tickcol"><Tick v={i.tick_price} /></td>
                <td className="tickcol"><Tick v={i.tick_period} /></td>
                <td className="tickcol"><Tick v={i.tick_payment} /></td>
                <td className="num">{fmtMoney(i.difference)}</td>
                {item ? <td style={{ width: 28, color: "var(--ink-3)" }} title={i.comment ?? ""}>{i.comment ? <Icon name="notes" size={14} /> : null}</td> : <td className="comment-cell"><div title={i.comment ?? ""}>{i.comment}</div></td>}
                <td><span className={"dot " + progress(i)} title={{ done: "Complete", part: "In progress", none: "Not started" }[progress(i)]} /></td>
              </tr>
            ))}
            <tr className="total">
              <td /><td>Total</td><td /><td /><td className="num">{fmtMoney(totals.amount)}</td><td colSpan={6} /><td className="num">{fmtMoney(totals.diff)}</td><td colSpan={2} />
            </tr>
          </tbody>
        </table>
        </div>
        <div className="legend">
          <span><Tick v="agrees" /> Agrees</span><span><Tick v="does_not_agree" /> Does not agree</span><span><Tick v={null} /> Not tested</span>
          <span className="spacer" />
          <span><i className="dot done" /> Complete</span><span><i className="dot part" /> In progress</span><span><i className="dot" /> Not started</span>
        </div>
      </section>

      {item && draft && (
        <aside className="card panel" aria-label={`Item ${item.item_no}`}>
          <div className="panel-head">
            <h2>Item {item.item_no} of {items.length}</h2>
            <span className="spacer" />
            <button className="btn ghost sm icon" aria-label="Previous item" title="Previous item" disabled={item.item_no === 1} onClick={() => attempt(() => open(item.item_no - 1))}>‹</button>
            <button className="btn ghost sm icon" aria-label="Next item" title="Next item" disabled={item.item_no === items.length} onClick={() => attempt(() => open(item.item_no + 1))}>›</button>
            <button className="btn ghost sm icon" aria-label="Close" title="Close" onClick={() => attempt(() => open(null))}>✕</button>
          </div>
          <div className="panel-body">
            <div className="facts">
              <div><div className="k">Sales invoice</div><div className="mono">{item.invoice_no}</div></div>
              <div><div className="k">Invoice date</div>{fmtDate(item.invoice_date)}</div>
              <div><div className="k">Customer</div>{item.customer}</div>
              <div><div className="k">Invoice amount</div>${fmtMoney(item.amount)}</div>
            </div>
            {locked && <div className="callout info">{lockReason}</div>}
            <div className="cols pair" style={{ gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div className="field">
                <label className="label" htmlFor="dn">Delivery note number</label>
                <input id="dn" className="input mono" value={draft.dn} disabled={locked} autoComplete="off" spellCheck={false} onChange={(e) => set("dn", e.target.value)} />
              </div>
              <div className="field">
                <label className="label" htmlFor="dd">Delivery date</label>
                <DateField key={item.item_no} id="dd" value={draft.date} disabled={locked} defaultMonth={item.invoice_date} onChange={(v) => set("date", v)} onValidity={setDateOk} />
              </div>
            </div>
            <div>
              <div className="section-title">Attributes tested</div>
              {ATTRS.map((a) => (
                <div className="attr" key={a.key}>
                  <label htmlFor={"tick-" + a.key}><b>{a.label}</b><small>{a.key === "period" ? `Delivered on or before ${fmtDate(yearEnd)}` : a.hint}</small></label>
                  <Select id={"tick-" + a.key} block value={draft[a.key]} options={TICK_OPTIONS} disabled={locked} onChange={(v) => set(a.key, v)} ariaLabel={a.label} />
                </div>
              ))}
            </div>
            <div className="field" style={{ width: 240 }}>
              <label className="label" htmlFor="diff">Difference</label>
              <div className="input-wrap">
                <span className="prefix">$</span>
                <input id="diff" className={"input with-prefix num" + (diffErr ? " invalid" : "")} value={draft.diff} disabled={locked} inputMode="decimal" autoComplete="off"
                  onChange={(e) => { set("diff", e.target.value); setDiffErr(false); }}
                  onBlur={(e) => { const n = parseAmount(e.target.value); if (n === "invalid") setDiffErr(true); else set("diff", n === null ? "" : fmtMoney(n)); }} />
              </div>
              {diffErr ? <span className="error" role="alert">Enter an amount in dollars, for example 12,500.</span> : <span className="hint">Leave blank when there is no difference.</span>}
            </div>
            <div className="field">
              <label className="label" htmlFor="comment">Comment</label>
              <AutoTextarea id="comment" value={draft.comment} onChange={(v) => set("comment", v)} minRows={5} disabled={locked} />
            </div>
          </div>
          <div className="panel-foot">
            {locked ? <span className="saved">Read only</span> : (
              <>
                <button className="btn primary" disabled={saving || !dirty} onClick={() => save()}>Save</button>
                <button className="btn" disabled={saving || !dirty || item.item_no === items.length} onClick={async () => { const list = await save(); if (list) open(item.item_no + 1, list); }}>Save and next</button>
                <button className="btn ghost" disabled={saving || !dirty} onClick={() => open(item.item_no)}>Cancel</button>
              </>
            )}
            <span className="spacer" />
            {dirty ? <span className="dirty">Unsaved changes</span> : item.updated_at ? <span className="saved" title={`Saved by ${people[item.updated_by ?? ""] ?? ""}`}>Saved {fmtDateTime(item.updated_at)}</span> : <span className="saved">Nothing recorded yet</span>}
          </div>
        </aside>
      )}

      {pending && item && (
        <UnsavedDialog what={`Item ${item.item_no}`} saving={saving}
          onStay={() => setPending(null)}
          onDiscard={() => { const go = pending; setPending(null); setDraft(toDraft(item)); unsaved.current = false; setTimeout(go, 0); }}
          onSave={async () => { const go = pending; const ok = await save(); setPending(null); if (ok) setTimeout(go, 0); }} />
      )}
    </div>
  );
}

export function ConclusionTab({ taskRef, initial, locked, lockReason, people }: {
  taskRef: string; initial: { text: string; updated_at: string; updated_by: string } | null; locked: boolean; lockReason: string; people: Record<string, string>;
}) {
  const toast = useToast();
  const router = useRouter();
  const [saved, setSaved] = useState(initial);
  const [text, setText] = useState(initial?.text ?? "");
  const [saving, setSaving] = useState(false);
  const [pending, setPending] = useState<null | (() => void)>(null);
  const dirty = text !== (saved?.text ?? "");
  useEffect(() => { unsaved.current = dirty; return () => { unsaved.current = false; }; }, [dirty]);
  useUnsavedGuard(dirty, useCallback((go: () => void) => setPending(() => go), []));

  async function save() {
    setSaving(true);
    try {
      const res = await api("PUT", `/api/tasks/${taskRef}/conclusion`, { text });
      setSaved(res.conclusion); setText(res.conclusion.text);
      toast("Conclusion saved"); router.refresh();
      return true;
    } catch (e: any) { toast(e.message, true); return false; } finally { setSaving(false); }
  }
  return (
    <section className="card" style={{ maxWidth: 1040 }}>
      <div className="card-head"><h2>Conclusion</h2><span className="spacer" />
        {dirty ? <span className="dirty">Unsaved changes</span> : saved?.updated_at ? <span className="saved">Saved {fmtDateTime(saved.updated_at)} by {people[saved.updated_by] ?? ""}</span> : <span className="saved">Not written yet</span>}
      </div>
      <div className="card-body" style={{ display: "grid", gap: 12 }}>
        {locked && <div className="callout info">{lockReason}</div>}
        <div className="field">
          <label className="label" htmlFor="conclusion">Results of the test and conclusion</label>
          <AutoTextarea id="conclusion" value={text} onChange={setText} minRows={12} disabled={locked} />
        </div>
        {!locked && (
          <div className="row">
            <button className="btn primary" disabled={!dirty || saving} onClick={save}>Save</button>
            <button className="btn ghost" disabled={!dirty || saving} onClick={() => setText(saved?.text ?? "")}>Cancel</button>
          </div>
        )}
      </div>
      {pending && (
        <UnsavedDialog what="The conclusion" saving={saving}
          onStay={() => setPending(null)}
          onDiscard={() => { const go = pending; setPending(null); setText(saved?.text ?? ""); unsaved.current = false; setTimeout(go, 0); }}
          onSave={async () => { const go = pending; const ok = await save(); setPending(null); if (ok) setTimeout(go, 0); }} />
      )}
    </section>
  );
}
