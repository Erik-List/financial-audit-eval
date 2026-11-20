import Link from "next/link";
import { Card, PageHead, StatusChip } from "@/components/bits";
import { documents, notes, requests, tasks } from "@/lib/data";

export default async function Search({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const q = ((await searchParams).q ?? "").trim();
  const words = q.toLowerCase().split(/\s+/).filter(Boolean);
  const hit = (s: string) => words.length > 0 && words.every((w) => s.toLowerCase().includes(w));
  const t = tasks().filter((x) => hit(`${x.ref} ${x.title} ${x.description}`));
  const d = documents().filter((x) => hit(`${x.ref} ${x.title}`));
  const r = requests().filter((x) => hit(`${x.ref} ${x.title} ${x.owner}`));
  const n = notes().filter((x) => hit(`${x.task_ref} ${x.body}`));
  const total = t.length + d.length + r.length + n.length;
  return (
    <div className="page">
      <PageHead title={q ? `Search: ${q}` : "Search"} sub={q ? `${total} result${total === 1 ? "" : "s"} in this engagement` : "Type in the search box at the top"} />
      <form action="/search" role="search" className="row" style={{ maxWidth: 1100, marginBottom: 16 }}>
        <input className="input" name="q" defaultValue={q} placeholder="Search tasks, documents, requests and notes" aria-label="Search the engagement" style={{ height: 34 }} />
        <button className="btn primary" style={{ height: 34 }}>Search</button>
      </form>
      <div className="stack" style={{ maxWidth: 1100 }}>
        {t.length > 0 && <Card title={`Tasks (${t.length})`} flush><table className="table"><tbody>{t.map((x) => <tr key={x.ref} className="hover"><td className="ref" style={{ width: 90 }}><Link href={`/tasks/${x.ref}`}>{x.ref}</Link></td><td className="title-cell"><Link href={`/tasks/${x.ref}`}>{x.title}</Link><div className="muted">{x.description}</div></td><td style={{ width: 150 }}><StatusChip status={x.status} /></td></tr>)}</tbody></table></Card>}
        {d.length > 0 && <Card title={`Documents (${d.length})`} flush><table className="table"><tbody>{d.map((x) => <tr key={x.ref} className="hover"><td className="ref" style={{ width: 90 }}><Link href={`/documents/${x.ref}`}>{x.ref}</Link></td><td className="title-cell"><Link href={`/documents/${x.ref}`}>{x.title}</Link></td><td style={{ width: 150 }} className="muted">Task {x.task_ref}</td></tr>)}</tbody></table></Card>}
        {r.length > 0 && <Card title={`Client requests (${r.length})`} flush><table className="table"><tbody>{r.map((x) => <tr key={x.ref} className="hover"><td className="ref" style={{ width: 90 }}>{x.ref}</td><td><Link href="/requests">{x.title}</Link></td><td style={{ width: 150 }}><StatusChip status={x.status} /></td></tr>)}</tbody></table></Card>}
        {n.length > 0 && <Card title={`Notes (${n.length})`} flush><table className="table"><tbody>{n.map((x) => <tr key={x.id} className="hover"><td className="ref" style={{ width: 90 }}><Link href={`/tasks/${x.task_ref}?tab=notes`}>{x.task_ref}</Link></td><td>{x.body}</td></tr>)}</tbody></table></Card>}
        {q && total === 0 && <div className="card empty">Nothing in this engagement matches &ldquo;{q}&rdquo;.</div>}
      </div>
    </div>
  );
}
