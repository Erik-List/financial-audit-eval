import Link from "next/link";
import { Avatar, PageHead, cells } from "@/components/bits";
import { FilterTable, type Row } from "@/components/FilterTable";
import { me, notes, tasks, userMap } from "@/lib/data";
import { fmtDateTime } from "@/lib/format";

export default function Notes() {
  const user = me();
  const people = userMap();
  const title = Object.fromEntries(tasks().map((t) => [t.ref, t.title]));
  const all = notes();
  const label = (n: (typeof all)[number]) => (n.kind === "comment" ? "Comment" : n.status === "cleared" ? "Addressed" : n.status[0].toUpperCase() + n.status.slice(1));
  const rows: Row[] = all.map((n) => ({
    key: String(n.id),
    search: `${n.task_ref} ${title[n.task_ref]} ${n.body} ${people[n.author]?.name} ${people[n.to_user]?.name}`,
    facets: { to: n.to_user, status: n.kind === "comment" ? "comment" : n.status },
    sort: [n.task_ref, n.body, people[n.author]?.name, people[n.to_user]?.name, label(n), n.replies.length, n.created_at],
    cells: cells(
      <Link href={`/tasks/${n.task_ref}?tab=notes`}><span className="ref">{n.task_ref}</span> {title[n.task_ref]}</Link>,
      <span style={{ display: "block", maxWidth: 640 }}>{n.body}</span>,
      <span className="person"><Avatar user={people[n.author]} me={n.author === user.id} />{people[n.author]?.name}</span>,
      <span className="person"><Avatar user={people[n.to_user]} me={n.to_user === user.id} />{people[n.to_user]?.name}</span>,
      <span className={"chip plain s-" + (n.kind === "comment" ? "comment" : n.status)}>{label(n)}</span>,
      n.replies.length || "",
      <span className="nowrap">{fmtDateTime(n.created_at)}</span>,
    ),
  }));
  return (
    <div className="page">
      <PageHead title="Review notes" sub={`Notes and comments across the file · ${all.filter((n) => n.status === "open" && n.kind === "review").length} review notes open`} />
      <div className="card">
        <FilterTable noun="notes" placeholder="Filter by task, text or person"
          columns={[{ label: "Task", sortable: true, width: 330 }, { label: "Note" }, { label: "From", sortable: true }, { label: "For", sortable: true }, { label: "Status", sortable: true }, { label: "Replies", num: true, sortable: true }, { label: "Written", sortable: true }]}
          facets={[
            { key: "to", label: "For", options: [{ value: "", label: "Everyone" }, { value: user.id, label: "Me" }, ...Object.values(people).filter((p) => p.id !== user.id).map((p) => ({ value: p.id, label: p.name }))] },
            { key: "status", label: "Status", options: [{ value: "", label: "Any status" }, { value: "open", label: "Open" }, { value: "cleared", label: "Addressed" }, { value: "closed", label: "Closed" }, { value: "comment", label: "Comment" }] },
          ]}
          rows={rows} />
      </div>
    </div>
  );
}
