import { redirect } from "next/navigation";
import { SideNav, TopBar } from "@/components/Shell";
import { Toasts } from "@/components/ui";
import { kv, notes, notifications, requests, tasks } from "@/lib/data";
import { currentUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await currentUser();
  if (!user) redirect("/signin");
  const engagement = kv("engagement");
  const counts = {
    tasks: tasks().filter((t) => t.assignee === user.id && ["not_started", "in_progress"].includes(t.status)).length,
    notes: notes().filter((n) => n.to_user === user.id && n.status === "open").length,
    requests: requests().filter((r) => r.status !== "received").length,
  };
  return (
    <Toasts>
      <div className="app">
        <TopBar user={user} firm={kv("firm")} engagement={engagement} others={kv("otherEngagements")} notifications={notifications(user.id)} erpUrl={process.env.FIELDBOOK_ERP_URL || null} />
        <SideNav counts={counts} engagement={engagement} />
        <main className="main">{children}</main>
      </div>
    </Toasts>
  );
}
