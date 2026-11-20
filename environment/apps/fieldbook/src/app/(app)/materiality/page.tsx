import Link from "next/link";
import { Card, PageHead } from "@/components/bits";
import { kv, userMap } from "@/lib/data";
import { fmtDateTime, fmtMoney } from "@/lib/format";

export default function Materiality() {
  const eng = kv("engagement");
  const m = eng.materiality, th = eng.thresholds;
  const people = userMap();
  const stat = (label: string, value: number, note: string) => (
    <div className="card stat"><div className="label">{label}</div><div className="value">${fmtMoney(value)}</div><div className="stat-note">{note}</div></div>
  );
  return (
    <div className="page">
      <PageHead title="Materiality" sub={<>From <Link href="/tasks/2-200" className="ref">2-200</Link> Materiality · approved by {people[m.approved_by]?.name}, {fmtDateTime(m.approved_at)}</>}>
        <Link className="btn" href="/documents/2-200.1">Open memorandum 2-200.1</Link>
      </PageHead>
      <div className="stack" style={{ maxWidth: 1200 }}>
        <div className="cols three" style={{ gridTemplateColumns: "repeat(3, 1fr)" }}>
          {stat("Planning materiality", th.planning_materiality, `${m.percentage} of ${m.benchmark.toLowerCase()}`)}
          {stat("Tolerable misstatement", th.tolerable_misstatement, "50% of planning materiality")}
          {stat("Clearly trivial", th.clearly_trivial, "5% of planning materiality")}
        </div>
        <Card title="Basis">
          <dl className="kv" style={{ gridTemplateColumns: "210px 1fr" }}>
            <dt>Benchmark</dt><dd>{m.benchmark}: ${fmtMoney(m.benchmark_amount_planning)}. {m.benchmark_note}</dd>
            <dt>Why this benchmark</dt><dd>{m.rationale}</dd>
            <dt>Tolerable misstatement</dt><dd>{m.tolerable_rationale}</dd>
            <dt>Clearly trivial</dt><dd>{m.trivial_rationale}</dd>
            <dt>Reassessment at year end</dt><dd>{m.reassessment}</dd>
          </dl>
        </Card>
        <Card title="How the amounts are used">
          <div className="prose">
            <ul style={{ marginBottom: 0 }}>
              <li>Tolerable misstatement applies to each account and to each test of details. Known misstatement found in a test is compared with it.</li>
              <li>Misstatements above the clearly trivial amount are accumulated on the summary of audit differences (<Link href="/tasks/9-100" className="ref">9-100</Link>) and evaluated in total.</li>
              <li>A difference at or below the clearly trivial amount is noted in the workpaper and not accumulated.</li>
            </ul>
          </div>
        </Card>
      </div>
    </div>
  );
}
