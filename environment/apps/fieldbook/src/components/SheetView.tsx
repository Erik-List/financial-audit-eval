"use client";
import { useState } from "react";
import { fmtDate, fmtMoney, fmtPct } from "@/lib/format";

type Col = { key: string; label: string; type: string };
type Tab = { name: string; note?: string; columns: Col[]; rows: Record<string, any>[] };

export function SheetView({ tabs }: { tabs: Tab[] }) {
  const [i, setI] = useState(0);
  const tab = tabs[i];
  const cell = (c: Col, v: any) => (v === null || v === undefined || v === "" ? "" : c.type === "money" ? fmtMoney(v) : c.type === "date" ? fmtDate(v) : c.type === "pct" ? fmtPct(v) : c.type === "num" ? Number(v).toLocaleString("en-US") : String(v));
  const numeric = (c: Col) => ["money", "pct", "num"].includes(c.type);
  return (
    <section className="card">
      {tabs.length > 1 && (
        <div className="tabs" style={{ padding: "0 8px", borderRadius: "6px 6px 0 0" }} role="tablist">
          {tabs.map((t, n) => <button key={t.name} role="tab" aria-selected={n === i} className={"tab" + (n === i ? " active" : "")} onClick={() => setI(n)}>{t.name}</button>)}
        </div>
      )}
      {tab.note && <div className="card-body muted" style={{ borderBottom: "1px solid var(--line-2)", maxWidth: 1100 }}>{tab.note}</div>}
      <div className="sheet-wrap">
        <table className="table">
          <thead><tr>{tab.columns.map((c) => <th key={c.key} className={numeric(c) ? "num" : ""}>{c.label}</th>)}</tr></thead>
          <tbody>
            {tab.rows.map((r, n) => (
              <tr key={n} className={r.bold ? "total" : "hover"}>
                {tab.columns.map((c) => <td key={c.key} className={(numeric(c) ? "num " : "") + (c.key === "no" || c.key === "invoice_no" || c.key === "account" ? "mono nowrap" : "")}>{cell(c, r[c.key])}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
