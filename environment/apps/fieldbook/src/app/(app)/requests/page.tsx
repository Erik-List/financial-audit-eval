import Link from "next/link";
import { PageHead, StatusChip, cells } from "@/components/bits";
import { FilterTable, type Row } from "@/components/FilterTable";
import { documents, requests, tasks, userMap } from "@/lib/data";
import { fmtDate } from "@/lib/format";

export default function Requests() {
  const people = userMap();
  const all = requests();
  const title = Object.fromEntries(tasks().map((t) => [t.ref, t.title]));
  const docs = new Set(documents().map((d) => d.ref));
  const areas = [...new Set(all.map((r) => r.area))];
  const rows: Row[] = all.map((r) => ({
    key: r.ref,
    search: `${r.ref} ${r.title} ${r.owner} ${r.area} ${r.task_ref}`,
    facets: { status: r.status, area: r.area },
    sort: [r.ref, r.title, r.area, r.owner, r.requested, r.due, r.status, r.received ?? "", r.task_ref],
    cells: cells(
      docs.has(r.ref) ? <Link href={`/documents/${r.ref}`} className="ref">{r.ref}</Link> : <span className="ref">{r.ref}</span>,
      <span className="title-cell">{docs.has(r.ref) ? <Link href={`/documents/${r.ref}`}>{r.title}</Link> : r.title}</span>,
      r.area, r.owner,
      <span className="nowrap">{fmtDate(r.requested)}</span>,
      <span className={"nowrap" + (r.status === "overdue" ? " overdue" : "")}>{fmtDate(r.due)}</span>,
      <StatusChip status={r.status} />,
      <span className="nowrap">{fmtDate(r.received)}</span>,
      <Link href={`/tasks/${r.task_ref}`} title={title[r.task_ref]} className="ref">{r.task_ref}</Link>,
      people[r.requested_by]?.name,
    ),
  }));
  const n = (s: string) => all.filter((r) => r.status === s).length;
  return (
    <div className="page">
      <PageHead title="Client requests" sub={`Items requested from the client · ${n("received")} received · ${n("outstanding")} outstanding · ${n("overdue")} overdue`} />
      <div className="card">
        <FilterTable noun="requests" placeholder="Filter by reference, item or client contact"
          columns={[{ label: "Ref", width: 90, sortable: true }, { label: "Item", sortable: true }, { label: "Area", sortable: true }, { label: "Client contact", sortable: true }, { label: "Requested", sortable: true }, { label: "Due", sortable: true }, { label: "Status", sortable: true }, { label: "Received", sortable: true }, { label: "Task", sortable: true }, { label: "Requested by" }]}
          facets={[
            { key: "status", label: "Status", options: [{ value: "", label: "Any status" }, { value: "received", label: "Received" }, { value: "outstanding", label: "Outstanding" }, { value: "overdue", label: "Overdue" }] },
            { key: "area", label: "Area", options: [{ value: "", label: "All areas" }, ...areas.map((a) => ({ value: a, label: a }))] },
          ]}
          rows={rows} />
      </div>
    </div>
  );
}
