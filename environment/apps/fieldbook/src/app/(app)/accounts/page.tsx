import Link from "next/link";
import { Fragment } from "react";
import { PageHead } from "@/components/bits";
import { kv } from "@/lib/data";
import { fmtLongDate, fmtMoney, fmtPct } from "@/lib/format";

export default function Accounts() {
  const eng = kv("engagement");
  const tb: { account: string; name: string; group: string; cy: number; py: number; lead: string }[] = kv("trial_balance");
  const groups = [...new Set(tb.map((r) => r.group))];
  return (
    <div className="page">
      <PageHead title="Trial balance" sub={<>Client&apos;s closing trial balance at {fmtLongDate(eng.period_end)} (<Link href="/documents/PBC-001" className="ref">PBC-001</Link>). Debits positive, credits in parentheses.</>} />
      <div className="card table-wrap" style={{ maxWidth: 1400 }}>
        <table className="table">
          <thead><tr><th style={{ width: 80 }}>Account</th><th>Name</th><th className="num">Sep 26, 2026</th><th className="num">Sep 27, 2025</th><th className="num">Change</th><th className="num">Change %</th><th>Lead sheet</th></tr></thead>
          <tbody>
            {groups.map((g) => {
              const rows = tb.filter((r) => r.group === g);
              const cy = rows.reduce((s, r) => s + r.cy, 0), py = rows.reduce((s, r) => s + r.py, 0);
              return (
                <Fragment key={g}>
                  <tr className="group"><td colSpan={7} style={{ cursor: "default" }}>{g}</td></tr>
                  {rows.map((r) => (
                    <tr key={r.account} className="hover">
                      <td className="mono">{r.account}</td><td>{r.name}</td>
                      <td className="num">{fmtMoney(r.cy)}</td><td className="num">{fmtMoney(r.py)}</td>
                      <td className="num">{fmtMoney(r.cy - r.py)}</td><td className="num">{r.py ? fmtPct((Math.abs(r.cy) - Math.abs(r.py)) / Math.abs(r.py)) : ""}</td>
                      <td>{r.lead && <Link href={`/tasks/${r.lead}`} className="ref">{r.lead}</Link>}</td>
                    </tr>
                  ))}
                  <tr className="total"><td /><td>Total {g.toLowerCase()}</td><td className="num">{fmtMoney(cy)}</td><td className="num">{fmtMoney(py)}</td><td className="num">{fmtMoney(cy - py)}</td><td /><td /></tr>
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
