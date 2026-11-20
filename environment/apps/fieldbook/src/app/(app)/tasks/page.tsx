import Link from "next/link";
import { Avatar, PageHead, StatusChip, cells } from "@/components/bits";
import { FilterTable, type Row } from "@/components/FilterTable";
import { kv, me, notes, signoffs, tasks, userMap } from "@/lib/data";
import { now } from "@/lib/clock";
import { fmtDate, fmtDay, isoDay, STATUS_LABEL } from "@/lib/format";

export default function Tasks() {
  const user = me();
  const people = userMap();
  const all = tasks();
  const so = signoffs();
  const openNotes = notes().filter((n) => n.status === "open" && n.kind === "review");
  const today = isoDay(now());
  const sections: { code: string; name: string }[] = kv("sections");
  const rows: Row[] = all.map((t) => {
    const p = so.find((s) => s.task_ref === t.ref && s.role === "preparer");
    const r = so.find((s) => s.task_ref === t.ref && s.role === "reviewer");
    const n = openNotes.filter((x) => x.task_ref === t.ref).length;
    const late = t.due_date < today && ["not_started", "in_progress"].includes(t.status);
    return {
      key: t.ref, group: t.section,
      search: `${t.ref} ${t.title} ${people[t.assignee]?.name} ${people[t.reviewer]?.name}`,
      facets: { preparer: t.assignee, status: t.status },
      sort: [t.ref, t.title, people[t.assignee]?.name, people[t.reviewer]?.name, t.status, t.due_date, p?.signed_at ?? "", r?.signed_at ?? "", n],
      cells: cells(
        <Link href={`/tasks/${t.ref}`} className="ref">{t.ref}</Link>,
        <span className="title-cell"><Link href={`/tasks/${t.ref}`}>{t.title}</Link></span>,
        <span className="person"><Avatar user={people[t.assignee]} me={t.assignee === user.id} />{people[t.assignee]?.name}</span>,
        <span className="person"><Avatar user={people[t.reviewer]} />{people[t.reviewer]?.name}</span>,
        <StatusChip status={t.status} />,
        <span className={"nowrap" + (late ? " overdue" : "")}>{fmtDate(t.due_date)}</span>,
        <span className="nowrap muted">{p ? `${people[p.user_id]?.initials} ${fmtDay(p.signed_at)}` : ""}</span>,
        <span className="nowrap muted">{r ? `${people[r.user_id]?.initials} ${fmtDay(r.signed_at)}` : ""}</span>,
        n ? <span className="chip plain s-open">{n}</span> : "",
      ),
    };
  });
  const done = all.filter((t) => t.status === "reviewed").length;
  return (
    <div className="page">
      <PageHead title="Tasks" sub={`${all.length} tasks in the file · ${done} reviewed · ${all.filter((t) => t.status === "ready_for_review").length} ready for review`} />
      <div className="card">
        <FilterTable
          noun="tasks" placeholder="Filter by reference, title or person"
          columns={[{ label: "Ref", width: 80, sortable: true }, { label: "Task", sortable: true }, { label: "Preparer", sortable: true }, { label: "Reviewer", sortable: true }, { label: "Status", sortable: true }, { label: "Due", sortable: true }, { label: "Prepared", sortable: true }, { label: "Reviewed", sortable: true }, { label: "Open review notes", sortable: true }]}
          groups={sections.map((s) => ({ key: s.code, label: `${s.code}  ${s.name}` }))}
          facets={[
            { key: "preparer", label: "Preparer", options: [{ value: "", label: "Everyone" }, { value: user.id, label: "Me" }, ...Object.values(people).filter((p) => p.id !== user.id).map((p) => ({ value: p.id, label: p.name }))] },
            { key: "status", label: "Status", options: [{ value: "", label: "Any status" }, ...Object.entries(STATUS_LABEL).map(([value, label]) => ({ value, label }))] },
          ]}
          rows={rows}
        />
      </div>
    </div>
  );
}
