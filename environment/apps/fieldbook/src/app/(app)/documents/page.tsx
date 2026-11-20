import Link from "next/link";
import { PageHead, cells } from "@/components/bits";
import { FilterTable, type Row } from "@/components/FilterTable";
import { documents, tasks, userMap } from "@/lib/data";
import { fmtDateTime } from "@/lib/format";

const kind = (c: any) => (c.kind === "sheet" ? "Worksheet" : c.kind === "memo" ? "Memo" : (c.filename.split(".").pop() ?? "file").toUpperCase());

export default function Documents() {
  const people = userMap();
  const title = Object.fromEntries(tasks().map((t) => [t.ref, t.title]));
  const docs = documents();
  const rows: Row[] = docs.map((d) => ({
    key: d.ref,
    search: `${d.ref} ${d.title} ${d.task_ref} ${title[d.task_ref]} ${people[d.author]?.name ?? d.author}`,
    facets: { source: d.source, kind: kind(d.content) },
    sort: [d.ref, d.title, kind(d.content), d.source, d.task_ref, people[d.author]?.name ?? d.author, d.created_at],
    cells: cells(
      <Link href={`/documents/${d.ref}`} className="ref">{d.ref}</Link>,
      <span className="title-cell"><Link href={`/documents/${d.ref}`}>{d.title}</Link></span>,
      kind(d.content),
      d.source === "client" ? <span className="tag">Client</span> : "Firm",
      <Link href={`/tasks/${d.task_ref}`}><span className="ref">{d.task_ref}</span> {title[d.task_ref]}</Link>,
      people[d.author]?.name ?? d.author,
      <span className="nowrap">{fmtDateTime(d.created_at)}</span>,
    ),
  }));
  const kinds = [...new Set(docs.map((d) => kind(d.content)))].sort();
  return (
    <div className="page">
      <PageHead title="Documents" sub="Evidence and workpapers in the file, with the task each one belongs to" />
      <div className="card">
        <FilterTable noun="documents" placeholder="Filter by reference, title or task"
          columns={[{ label: "Ref", width: 100, sortable: true }, { label: "Document", sortable: true }, { label: "Type", sortable: true }, { label: "Source", sortable: true }, { label: "Task", sortable: true }, { label: "Added by", sortable: true }, { label: "Added", sortable: true }]}
          facets={[
            { key: "source", label: "Source", options: [{ value: "", label: "Firm and client" }, { value: "firm", label: "Firm" }, { value: "client", label: "Client" }] },
            { key: "kind", label: "Type", options: [{ value: "", label: "Any type" }, ...kinds.map((k) => ({ value: k, label: k }))] },
          ]}
          rows={rows} />
      </div>
    </div>
  );
}
