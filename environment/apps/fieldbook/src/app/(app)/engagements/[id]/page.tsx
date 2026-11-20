import Link from "next/link";
import { notFound } from "next/navigation";
import { Icon, PageHead } from "@/components/bits";
import { kv } from "@/lib/data";
import { fmtLongDate } from "@/lib/format";

export default async function OtherEngagement({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const e = (kv("otherEngagements") as any[]).find((x) => x.id === id);
  if (!e) notFound();
  return (
    <div className="page">
      <PageHead title={e.client} sub={`${e.name} · period end ${fmtLongDate(e.period_end)} · ${e.status}`} />
      <div className="card" style={{ maxWidth: 720 }}>
        <div className="card-body row" style={{ gap: 14, alignItems: "flex-start" }}>
          <Icon name="lock" size={22} />
          <div>
            <b>{e.status === "Archived" ? "This engagement is archived." : "You do not have access to this engagement yet."}</b>
            <p className="muted" style={{ marginTop: 4 }}>{e.status === "Archived" ? "Archived files are read through the firm's records team. Ask the engagement manager if you need a prior-year workpaper." : `Your role: ${e.role}. The engagement manager opens the file to the team at the planning meeting.`}</p>
            <Link className="btn" href="/">Back to Larkspur Devices, Inc.</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
