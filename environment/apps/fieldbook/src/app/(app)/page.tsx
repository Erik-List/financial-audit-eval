import Link from "next/link";
import { Avatar, Card, PageHead, StatusChip } from "@/components/bits";
import { activity, kv, me, notes, tasks, userMap } from "@/lib/data";
import { now } from "@/lib/clock";
import { fmtDate, fmtDateTime, fmtLongDate, isoDay } from "@/lib/format";

export default function Home() {
  const user = me();
  const people = userMap();
  const eng = kv("engagement");
  const today = isoDay(now());
  const order = ["in_progress", "not_started", "ready_for_review", "reviewed"];
  const mine = tasks().filter((t) => t.assignee === user.id).sort((a, b) => order.indexOf(a.status) - order.indexOf(b.status) || a.due_date.localeCompare(b.due_date));
  const open = mine.filter((t) => ["not_started", "in_progress"].includes(t.status));
  const forMe = notes().filter((n) => n.to_user === user.id);
  const taskTitle = Object.fromEntries(tasks().map((t) => [t.ref, t.title]));
  const next = eng.milestones.find((m: any) => !m.done);
  return (
    <div className="page">
      <PageHead title="My work" sub={`${fmtLongDate(today)} · ${eng.client} · ${eng.status}`} />
      <div className="cols side" style={{ gridTemplateColumns: "minmax(0, 1fr) 420px" }}>
        <div className="stack">
          <Card title="My tasks" aside={<span className="muted">{open.length} open · {mine.length} assigned to me</span>} flush>
            <table className="table">
              <thead><tr><th style={{ width: 80 }}>Ref</th><th>Task</th><th>Status</th><th>Due</th><th>Reviewer</th><th className="num">Budget (h)</th></tr></thead>
              <tbody>
                {mine.map((t) => {
                  const late = t.due_date < today && ["not_started", "in_progress"].includes(t.status);
                  return (
                    <tr key={t.ref} className="hover">
                      <td className="ref"><Link href={`/tasks/${t.ref}`}>{t.ref}</Link></td>
                      <td className="title-cell"><Link href={`/tasks/${t.ref}`}>{t.title}</Link></td>
                      <td><StatusChip status={t.status} /></td>
                      <td className={"nowrap" + (late ? " overdue" : "")}>{fmtDate(t.due_date)}{late ? " · overdue" : ""}</td>
                      <td><span className="person"><Avatar user={people[t.reviewer]} />{people[t.reviewer]?.name}</span></td>
                      <td className="num">{t.budget_hours.toFixed(1)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </Card>
          <Card title="Notes for me" aside={<Link href="/notes">All review notes</Link>} flush>
            {forMe.map((n) => (
              <div className="note" key={n.id}>
                <Avatar user={people[n.author]} lg />
                <div>
                  <div className="note-meta">
                    <b>{people[n.author]?.name}</b>
                    <span className="muted">on</span>
                    <Link href={`/tasks/${n.task_ref}?tab=notes`}><span className="ref">{n.task_ref}</span> {taskTitle[n.task_ref]}</Link>
                    <span className="muted">{fmtDateTime(n.created_at)}</span>
                    <span className="spacer" />
                    <span className={"chip plain s-" + (n.kind === "comment" ? "comment" : n.status)}>{n.kind === "comment" ? "Comment" : "Review note · " + n.status}</span>
                  </div>
                  <div className="note-body">{n.body}</div>
                </div>
              </div>
            ))}
          </Card>
        </div>
        <div className="stack">
          <Card title="Announcements" flush>
            {eng.announcements.map((a: any, i: number) => (
              <div className="note" key={i}>
                <Avatar user={people[a.author]} lg />
                <div><div className="note-meta"><b>{people[a.author]?.name}</b><span className="muted">{fmtDateTime(a.at)}</span></div>{a.body}</div>
              </div>
            ))}
          </Card>
          <Card title="Timeline" aside={<Link href="/team">Team and timeline</Link>} flush>
            <div style={{ padding: "6px 0" }}>
              {eng.milestones.filter((m: any) => m.date >= "2026-09-26").map((m: any) => (
                <div key={m.date + m.label} className={"milestone" + (m.done ? " done" : m === next ? " next" : "")}>
                  <i /><span className="nowrap">{fmtDate(m.date)}</span><span>{m.label}</span>
                </div>
              ))}
            </div>
          </Card>
          <Card title="Recent activity in the file" flush>
            <ul className="feed">
              {activity(undefined, 12).map((a) => (
                <li key={a.id}>
                  <Avatar user={people[a.user_id]} me={a.user_id === user.id} />
                  <div><b>{people[a.user_id]?.name}</b> · <Link href={`/tasks/${a.task_ref}`} className="ref">{a.task_ref}</Link><br />{a.detail}<time>{fmtDateTime(a.at)}</time></div>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </div>
    </div>
  );
}
