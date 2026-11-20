import Link from "next/link";
import { notFound } from "next/navigation";
import { marked } from "marked";
import { Card, Icon, PageHead } from "@/components/bits";
import { SheetView } from "@/components/SheetView";
import { document, task, userMap } from "@/lib/data";
import { fmtDateTime } from "@/lib/format";

export default async function DocumentPage({ params }: { params: Promise<{ ref: string }> }) {
  const { ref } = await params;
  const d = document(decodeURIComponent(ref));
  if (!d) notFound();
  const people = userMap();
  const t = task(d.task_ref);
  const c = d.content;
  return (
    <div className="page">
      <PageHead
        crumbs={<><Link href="/documents">Documents</Link>›<Link href={`/tasks/${d.task_ref}?tab=evidence`}><span className="ref">{d.task_ref}</span> {t?.title}</Link></>}
        title={<><span className="ref" style={{ fontSize: 15, color: "var(--ink-2)", marginRight: 10 }}>{d.ref}</span>{d.title}</>}
        sub={<>{d.source === "client" ? "Provided by the client" : "Prepared by the firm"} · {people[d.author]?.name ?? d.author} · {fmtDateTime(d.created_at)}</>}>
        <Link className="btn" href={`/tasks/${d.task_ref}`}>Open task {d.task_ref}</Link>
      </PageHead>
      {c.intro && <p className="muted" style={{ maxWidth: 1100, marginBottom: 12 }}>{c.intro}</p>}
      {c.kind === "sheet" && <SheetView tabs={c.tabs} />}
      {c.kind === "memo" && <Card><div className="prose" dangerouslySetInnerHTML={{ __html: marked.parse(c.md, { async: false }) }} /></Card>}
      {c.kind === "file" && (
        <Card>
          <div className="row" style={{ gap: 14, padding: "10px 4px" }}>
            <Icon name="file" size={34} />
            <div>
              <b>{c.filename}</b><br /><span className="muted">{c.size}</span>
            </div>
            <span className="spacer" />
            {c.stored ? <a className="btn" href={`/api/files/${encodeURIComponent(d.ref)}`}>Download</a> : null}
          </div>
          {!c.stored && <div className="callout info" style={{ marginTop: 8 }}>This file type has no preview in the browser. Files in the engagement vault open in Fieldbook Desktop on a firm laptop.</div>}
        </Card>
      )}
    </div>
  );
}
