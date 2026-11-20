import Link from "next/link";
import { PageHead } from "@/components/bits";
import { kv, tasks } from "@/lib/data";

export default function Risks() {
  const risks: any[] = kv("risks");
  const title = Object.fromEntries(tasks().map((t) => [t.ref, t.title]));
  return (
    <div className="page">
      <PageHead title="Risks" sub={<>Risks of material misstatement, from <Link href="/tasks/2-300" className="ref">2-300</Link> Risk assessment summary · {risks.filter((r) => r.level === "Significant").length} significant</>} />
      <div className="card table-wrap">
        <table className="table">
          <thead><tr><th style={{ width: 60 }}>Ref</th><th style={{ width: "36%" }}>Risk</th><th>Level</th><th>Assertions</th><th>Accounts</th><th>Our response</th></tr></thead>
          <tbody>
            {risks.map((r) => (
              <tr key={r.ref} id={r.ref}>
                <td className="ref">{r.ref}</td>
                <td><b>{r.title}</b><div className="muted" style={{ marginTop: 3 }}>{r.description}</div></td>
                <td><span className={"chip plain lvl-" + r.level}>{r.level}</span>{r.fraud && <div style={{ marginTop: 4 }}><span className="tag">Fraud risk</span></div>}</td>
                <td>{r.assertions}</td>
                <td>{r.accounts}</td>
                <td>{r.response.map((ref: string) => <div key={ref}><Link href={`/tasks/${ref}`}><span className="ref">{ref}</span> {title[ref]}</Link></div>)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
