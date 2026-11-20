import { Avatar, Card, PageHead } from "@/components/bits";
import { kv, me, userMap } from "@/lib/data";
import { fmtDate, fmtWeekday } from "@/lib/format";

export default function Team() {
  const eng = kv("engagement");
  const firm = kv("firm");
  const people = userMap();
  const user = me();
  const next = eng.milestones.find((m: any) => !m.done);
  const sum = (k: string) => eng.team.reduce((s: number, t: any) => s + t[k], 0);
  return (
    <div className="page">
      <PageHead title="Team and timeline" sub={`${firm.name}, ${firm.office} office`} />
      <div className="cols side" style={{ gridTemplateColumns: "minmax(0, 1fr) 560px" }}>
        <Card title="Engagement team" flush>
          <table className="table">
            <thead><tr><th>Name</th><th>Role</th><th>Email</th><th className="num">Budget (h)</th><th className="num">Charged (h)</th><th className="num">Used</th></tr></thead>
            <tbody>
              {eng.team.map((t: any) => {
                const p = people[t.user];
                return (
                  <tr key={t.user} className="hover">
                    <td><span className="person"><Avatar user={p} me={p.id === user.id} /><b>{p.name}</b>{p.id === user.id && <span className="tag">You</span>}</span></td>
                    <td>{p.role}</td><td className="muted">{p.email}</td>
                    <td className="num">{t.hours_budget.toFixed(1)}</td><td className="num">{t.hours_actual.toFixed(1)}</td><td className="num">{Math.round((t.hours_actual / t.hours_budget) * 100)}%</td>
                  </tr>
                );
              })}
              <tr className="total"><td>Total</td><td /><td /><td className="num">{sum("hours_budget").toFixed(1)}</td><td className="num">{sum("hours_actual").toFixed(1)}</td><td className="num">{Math.round((sum("hours_actual") / sum("hours_budget")) * 100)}%</td></tr>
            </tbody>
          </table>
        </Card>
        <Card title="Timeline" flush>
          <div style={{ padding: "8px 0" }}>
            {eng.milestones.map((m: any) => (
              <div key={m.date + m.label} className={"milestone" + (m.done ? " done" : m === next ? " next" : "")} style={{ gridTemplateColumns: "16px 96px 96px 1fr" }}>
                <i /><span className="nowrap">{fmtDate(m.date)}</span><span className="nowrap muted">{fmtWeekday(m.date).split(",")[0]}</span><span>{m.label}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
