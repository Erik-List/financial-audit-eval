"use client";
// A list with a text filter, dropdown filters, sortable columns and optional grouping.
import { useMemo, useState, type ReactNode } from "react";
import { Select, type Option } from "./ui";

export type Column = { label: string; num?: boolean; width?: number | string; sortable?: boolean; center?: boolean };
export type Row = { key: string; cells: ReactNode[]; search: string; facets?: Record<string, string>; sort?: (string | number | null)[]; group?: string };
export type Facet = { key: string; label: string; options: Option[]; initial?: string };

export function FilterTable({ columns, rows, facets = [], groups, placeholder = "Filter", noun = "items", toolbarEnd }: {
  columns: Column[]; rows: Row[]; facets?: Facet[]; groups?: { key: string; label: string }[]; placeholder?: string; noun?: string; toolbarEnd?: ReactNode;
}) {
  const [q, setQ] = useState("");
  const [sel, setSel] = useState<Record<string, string>>(() => Object.fromEntries(facets.map((f) => [f.key, f.initial ?? ""])));
  const [sort, setSort] = useState<{ col: number; dir: 1 | -1 } | null>(null);
  const [closed, setClosed] = useState<Record<string, boolean>>({});

  const shown = useMemo(() => {
    const words = q.toLowerCase().split(/\s+/).filter(Boolean);
    let out = rows.filter((r) => words.every((w) => r.search.toLowerCase().includes(w)) && facets.every((f) => !sel[f.key] || r.facets?.[f.key] === sel[f.key]));
    if (sort) {
      out = [...out].sort((a, b) => {
        const x = a.sort?.[sort.col] ?? "", y = b.sort?.[sort.col] ?? "";
        return (typeof x === "number" && typeof y === "number" ? x - y : String(x).localeCompare(String(y))) * sort.dir;
      });
    }
    return out;
  }, [rows, q, sel, sort, facets]);

  const grouped = groups && !sort;
  const body: ReactNode[] = [];
  const line = (r: Row) => (
    <tr key={r.key} className="hover">
      {r.cells.map((c, i) => <td key={i} className={(columns[i]?.num ? "num " : "") + (columns[i]?.center ? "tickcol" : "")}>{c}</td>)}
    </tr>
  );
  if (grouped) {
    for (const g of groups!) {
      const inGroup = shown.filter((r) => r.group === g.key);
      if (!inGroup.length) continue;
      body.push(
        <tr key={"g" + g.key} className="group" onClick={() => setClosed((c) => ({ ...c, [g.key]: !c[g.key] }))}>
          <td colSpan={columns.length} aria-expanded={!closed[g.key]}>
            <span style={{ display: "inline-block", width: 16 }}>{closed[g.key] ? "▸" : "▾"}</span>{g.label}<span className="muted">{inGroup.length}</span>
          </td>
        </tr>,
      );
      if (!closed[g.key]) body.push(...inGroup.map(line));
    }
  } else body.push(...shown.map(line));

  return (
    <>
      <div className="toolbar">
        <input className="input" style={{ width: 260 }} value={q} onChange={(e) => setQ(e.target.value)} placeholder={placeholder} aria-label={placeholder} />
        {facets.map((f) => (
          <label key={f.key} className="field-inline">{f.label}
            <Select value={sel[f.key]} options={f.options} onChange={(v) => setSel((s) => ({ ...s, [f.key]: v }))} placeholder={f.options[0]?.label} ariaLabel={f.label} width={170} />
          </label>
        ))}
        {(q || Object.values(sel).some(Boolean) || sort) && <button className="btn ghost sm" onClick={() => { setQ(""); setSel(Object.fromEntries(facets.map((f) => [f.key, ""]))); setSort(null); }}>Clear</button>}
        <span className="spacer" />
        <span className="muted">{shown.length === rows.length ? `${rows.length} ${noun}` : `${shown.length} of ${rows.length} ${noun}`}</span>
        {toolbarEnd}
      </div>
      <div className="table-wrap">
      <table className="table">
        <thead>
          <tr>
            {columns.map((c, i) => (
              <th key={i} className={(c.num ? "num " : "") + (c.sortable ? "sortable " : "") + (c.center ? "tickcol" : "")} style={{ width: c.width }}
                aria-sort={sort?.col === i ? (sort.dir === 1 ? "ascending" : "descending") : undefined}
                onClick={c.sortable ? () => setSort((s) => (s?.col === i ? (s.dir === 1 ? { col: i, dir: -1 } : null) : { col: i, dir: 1 })) : undefined}>
                {c.label}{sort?.col === i ? (sort.dir === 1 ? " ↑" : " ↓") : ""}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{body.length ? body : <tr><td colSpan={columns.length} className="empty">Nothing matches the filters.</td></tr>}</tbody>
      </table>
      </div>
    </>
  );
}
