import Link from "next/link";
import { notFound } from "next/navigation";
import { marked } from "marked";
import { Avatar, Card, Icon } from "@/components/bits";
import { EvidenceUpload } from "@/components/EvidenceUpload";
import { NotesThread } from "@/components/NotesThread";
import { TaskHeader } from "@/components/TaskHeader";
import { ConclusionTab, TestingTab } from "@/components/Workpaper";
import { activity, conclusion, documents, kv, me, notes, sampleItems, task, taskSummary, userMap } from "@/lib/data";
import { now } from "@/lib/clock";
import { fmtDate, fmtDateTime, fmtLongDate, fmtMoney, isoDay } from "@/lib/format";

export default async function TaskPage({ params, searchParams }: { params: Promise<{ ref: string }>; searchParams: Promise<{ tab?: string }> }) {
  const { ref } = await params;
  const t = task(decodeURIComponent(ref));
  if (!t) notFound();
  const user = me();
  const people = userMap();
  const names = Object.fromEntries(Object.values(people).map((p) => [p.id, p.name]));
  const eng = kv("engagement");
  const section = (kv("sections") as { code: string; name: string }[]).find((s) => s.code === t.section);
  const { preparer, reviewer } = taskSummary(t);
  const tod = t.kind === "test_of_details";
  const items = tod ? sampleItems(t.ref) : [];
  const concl = tod ? conclusion(t.ref) ?? null : null;
  const taskNotes = notes(t.ref);
  const docs = documents(t.ref);
  const history = activity(t.ref);
  const tabs = tod
    ? [["procedure", "Procedure"], ["testing", "Testing"], ["conclusion", "Conclusion"], ["evidence", "Evidence"], ["notes", "Notes"], ["history", "History"]]
    : [["overview", "Overview"], ["evidence", "Evidence"], ["notes", "Notes"], ["history", "History"]];
  const sp = await searchParams;
  const tab = tabs.some(([k]) => k === sp.tab) ? sp.tab! : tabs[0][0];
  const counts: Record<string, number | string> = { evidence: docs.length, notes: taskNotes.length };
  const isDone = (i: (typeof items)[number]) => !!(i.delivery_note_no && i.delivery_date && i.tick_quantity && i.tick_price && i.tick_period && i.tick_payment);
  if (tod) counts.testing = `${items.filter(isDone).length}/${items.length}`;

  const mine = t.assignee === user.id;
  const locked = !mine || !!preparer;
  const lockReason = !mine ? `Only the preparer, ${people[t.assignee]?.name}, can change this task.` : "You signed off this task. Remove your sign-off (More, next to Sign off) to make changes.";
  const checks: string[] = [];
  if (tod && mine) {
    const open = items.filter((i) => !isDone(i)).map((i) => i.item_no);
    if (open.length) checks.push(`${open.length} of ${items.length} sample items are not complete (${open.length > 1 ? "items" : "item"} ${open.join(", ")}).`);
    if (!concl?.text?.trim()) checks.push("The conclusion is not written.");
  }
  const openForMe = taskNotes.filter((n) => n.kind === "review" && n.status === "open" && n.to_user === user.id).length;
  if (openForMe) checks.push(`${openForMe} review note${openForMe > 1 ? "s" : ""} for you ${openForMe > 1 ? "are" : "is"} still open.`);
  const late = t.due_date < isoDay(now()) && ["not_started", "in_progress"].includes(t.status);
  const th = eng.thresholds;

  return (
    <>
      <TaskHeader task={t} sectionName={section?.name ?? ""} people={people} meId={user.id} preparer={preparer} reviewer={reviewer} checks={checks} late={late} />
      <nav className="tabs" aria-label="Task sections">
        {tabs.map(([k, label]) => (
          <Link key={k} href={`/tasks/${t.ref}${k === tabs[0][0] ? "" : `?tab=${k}`}`} className={"tab" + (k === tab ? " active" : "")} aria-current={k === tab ? "page" : undefined}>
            {label}{counts[k] !== undefined && <span className="count">{counts[k]}</span>}
          </Link>
        ))}
      </nav>
      {preparer && mine && <div className="banner"><Icon name="lock" /> You signed off this task on {fmtDateTime(preparer.signed_at)}. It is read only{reviewer ? " and reviewed" : ` until ${people[t.reviewer]?.name} reviews it or you remove your sign-off`}.</div>}
      <div className="page">
        {tab === "procedure" && (
          <div className="cols side" style={{ gridTemplateColumns: "minmax(0, 1fr) 420px" }}>
            <Card title="Procedure"><div className="prose" dangerouslySetInnerHTML={{ __html: marked.parse(t.procedure_md ?? "", { async: false }) }} /></Card>
            <div className="stack">
              <Card title="Thresholds" aside={<Link href="/materiality">Materiality</Link>}>
                <dl className="kv" style={{ gridTemplateColumns: "1fr auto" }}>
                  <dt>Tolerable misstatement</dt><dd className="num"><b>${fmtMoney(th.tolerable_misstatement)}</b></dd>
                  <dt>Clearly trivial</dt><dd className="num"><b>${fmtMoney(th.clearly_trivial)}</b></dd>
                  <dt>Planning materiality</dt><dd className="num">${fmtMoney(th.planning_materiality)}</dd>
                </dl>
              </Card>
              <Card title="About this task">
                <dl className="kv" style={{ gridTemplateColumns: "120px 1fr" }}>
                  <dt>Account</dt><dd>Revenue (<Link href="/accounts">trial balance</Link>, lead sheet <Link href="/tasks/I-100" className="ref">I-100</Link>)</dd>
                  <dt>Assertions</dt><dd>{t.assertions}</dd>
                  <dt>Risks addressed</dt><dd>{(JSON.parse(t.risks_json) as string[]).map((r, i) => <span key={r}>{i ? ", " : ""}<Link href={`/risks#${r}`} className="ref">{r}</Link></span>)}</dd>
                  <dt>Period</dt><dd>Year ended {fmtLongDate(eng.period_end)}</dd>
                  <dt>Sample</dt><dd>{items.length} sales invoices, selected by {people[t.reviewer]?.name} (<Link href="/documents/I-110.1" className="ref">I-110.1</Link>)</dd>
                  <dt>Prior year</dt><dd>{t.prior_year}</dd>
                </dl>
              </Card>
              <Card title="Related">
                <dl className="kv" style={{ gridTemplateColumns: "120px 1fr" }}>
                  <dt>Process</dt><dd><Link href="/documents/3-100.1"><span className="ref">3-100.1</span> Order to cash: process narrative</Link></dd>
                  <dt>Register</dt><dd><Link href="/documents/PBC-014"><span className="ref">PBC-014</span> Sales invoice register, fiscal 2026</Link></dd>
                  <dt>Client system</dt><dd>ERP, read-only user of the firm{process.env.FIELDBOOK_ERP_URL ? <> (<a href={process.env.FIELDBOOK_ERP_URL} target="_blank" rel="noreferrer">open</a>)</> : null}</dd>
                </dl>
              </Card>
            </div>
          </div>
        )}
        {tab === "testing" && <TestingTab key={String(locked)} taskRef={t.ref} initial={items} locked={locked} lockReason={lockReason} yearEnd={eng.period_end} people={names} />}
        {tab === "conclusion" && <ConclusionTab key={String(locked)} taskRef={t.ref} initial={concl} locked={locked} lockReason={lockReason} people={names} />}
        {tab === "overview" && (
          <div className="cols side" style={{ gridTemplateColumns: "minmax(0, 1fr) 420px", maxWidth: 1400 }}>
            <div className="stack">
              <Card title="What to do"><div className="prose"><p>{t.description}</p></div></Card>
              <Card title="Work performed and results">{t.result ? <div className="prose"><p>{t.result}</p></div> : <span className="muted">Not documented yet.</span>}</Card>
            </div>
            <Card title="About this task">
              <dl className="kv" style={{ gridTemplateColumns: "120px 1fr" }}>
                <dt>Section</dt><dd>{t.section} {section?.name}</dd>
                <dt>Period</dt><dd>Year ended {fmtLongDate(eng.period_end)}</dd>
                <dt>Evidence</dt><dd>{docs.length ? <Link href={`/tasks/${t.ref}?tab=evidence`}>{docs.length} document{docs.length > 1 ? "s" : ""}</Link> : "None"}</dd>
                <dt>Notes</dt><dd>{taskNotes.length ? <Link href={`/tasks/${t.ref}?tab=notes`}>{taskNotes.length} ({taskNotes.filter((n) => n.status === "open").length} open)</Link> : "None"}</dd>
              </dl>
            </Card>
          </div>
        )}
        {tab === "evidence" && (
          <section className="card" style={{ maxWidth: 1400 }}>
            <div className="card-head"><h2>Evidence</h2><span className="muted">{docs.length} document{docs.length === 1 ? "" : "s"}</span><span className="spacer" />{mine && !preparer && <EvidenceUpload taskRef={t.ref} />}</div>
            {docs.length === 0 ? <div className="empty">No evidence is attached to this task.</div> : (
              <div className="table-wrap"><table className="table">
                <thead><tr><th style={{ width: 100 }}>Ref</th><th>Document</th><th>Type</th><th>Source</th><th>Added by</th><th>Added</th></tr></thead>
                <tbody>
                  {docs.map((d) => (
                    <tr key={d.ref} className="hover">
                      <td className="ref"><Link href={`/documents/${d.ref}`}>{d.ref}</Link></td>
                      <td className="title-cell"><Link href={`/documents/${d.ref}`}>{d.title}</Link></td>
                      <td>{d.content.kind === "sheet" ? "Worksheet" : d.content.kind === "memo" ? "Memo" : (d.content.filename.split(".").pop() ?? "File").toUpperCase()}</td>
                      <td>{d.source === "client" ? <span className="tag">Client</span> : "Firm"}</td>
                      <td>{people[d.author]?.name ?? d.author}</td>
                      <td className="nowrap">{fmtDateTime(d.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table></div>
            )}
          </section>
        )}
        {tab === "notes" && <NotesThread taskRef={t.ref} notes={taskNotes} people={people} meId={user.id} defaultTo={t.reviewer === user.id ? t.assignee : t.reviewer} />}
        {tab === "history" && (
          <section className="card" style={{ maxWidth: 900 }}>
            <div className="card-head"><h2>History</h2><span className="muted">Newest first</span></div>
            <ul className="feed">
              {history.map((a) => (
                <li key={a.id}><Avatar user={people[a.user_id]} me={a.user_id === user.id} /><div><b>{people[a.user_id]?.name}</b> · {a.detail}<time>{fmtDateTime(a.at)}</time></div></li>
              ))}
              {history.length === 0 && <li className="empty" style={{ display: "block" }}>Nothing has happened on this task yet.</li>}
            </ul>
          </section>
        )}
      </div>
    </>
  );
}
