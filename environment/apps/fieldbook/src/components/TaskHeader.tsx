"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { Avatar, Icon, StatusChip, type Person } from "./bits";
import { api, Dialog, useDismiss, useToast } from "./ui";
import { unsaved } from "./unsaved";
import { fmtDate, fmtDateTime } from "@/lib/format";

type Sign = { user_id: string; signed_at: string } | null;

export function TaskHeader({ task, sectionName, people, meId, preparer, reviewer, checks, late }: {
  task: { ref: string; title: string; status: string; due_date: string; budget_hours: number; assignee: string; reviewer: string; section: string };
  sectionName: string; people: Record<string, Person>; meId: string; preparer: Sign; reviewer: Sign; checks: string[]; late: boolean;
}) {
  const router = useRouter();
  const toast = useToast();
  const [dialog, setDialog] = useState<null | "sign" | "remove">(null);
  const [menu, setMenu] = useState(false);
  const [busy, setBusy] = useState(false);
  const closeMenu = useCallback(() => setMenu(false), []);
  const menuRef = useDismiss(menu, closeMenu);
  const myRole = task.assignee === meId ? "preparer" : task.reviewer === meId ? "reviewer" : null;
  const mySign = myRole === "preparer" ? preparer : myRole === "reviewer" ? reviewer : null;
  const canSign = !!myRole && !mySign && (myRole === "preparer" || !!preparer);
  const canRemove = !!mySign && !(myRole === "preparer" && reviewer);

  const ask = (which: "sign" | "remove") => {
    setMenu(false);
    if (unsaved.current) { toast("Save or discard your changes first.", true); return; }
    setDialog(which);
  };
  async function run(method: "POST" | "DELETE") {
    setBusy(true);
    try {
      await api(method, `/api/tasks/${task.ref}/signoff`);
      toast(method === "POST" ? `Signed off as ${myRole}` : "Sign-off removed");
      setDialog(null); router.refresh();
    } catch (e: any) { toast(e.message, true); } finally { setBusy(false); }
  }
  const slot = (label: string, who: string, s: Sign) => (
    <div className={"slot" + (s ? " signed" : "")}>
      <span className="k">{label}</span>
      <span className="v">{s ? people[s.user_id]?.name : people[who]?.name}</span>
      <span className="t">{s ? `Signed ${fmtDateTime(s.signed_at)}` : "Not signed"}</span>
    </div>
  );
  return (
    <>
      <div className="task-head">
        <div>
          <div className="crumbs"><Link href="/tasks">Tasks</Link>›<span>{task.section} {sectionName}</span></div>
          <h1><span className="ref">{task.ref}</span>{task.title}</h1>
          <div className="task-meta">
            <div><span className="k">Status</span><StatusChip status={task.status} /></div>
            <div><span className="k">Due</span><span className={late ? "overdue" : ""}>{fmtDate(task.due_date)}{late ? " · overdue" : ""}</span></div>
            <div><span className="k">Preparer</span><span className="person"><Avatar user={people[task.assignee]} me={task.assignee === meId} />{people[task.assignee]?.name}</span></div>
            <div><span className="k">Reviewer</span><span className="person"><Avatar user={people[task.reviewer]} me={task.reviewer === meId} />{people[task.reviewer]?.name}</span></div>
            <div><span className="k">Budget</span><span>{task.budget_hours.toFixed(1)} h</span></div>
          </div>
        </div>
        <div className="signoffs">
          {slot("Preparer", task.assignee, preparer)}
          {slot("Reviewer", task.reviewer, reviewer)}
          <div style={{ display: "grid", gap: 6, alignContent: "center" }}>
            <button className="btn primary" disabled={!canSign} onClick={() => ask("sign")} title={canSign ? "" : mySign ? "You have signed off this task" : "Only the preparer and the reviewer sign off"}>
              <Icon name="check" /> Sign off
            </button>
            <div ref={menuRef} style={{ position: "relative", justifySelf: "end" }}>
              <button className="btn sm" aria-label="More actions" aria-expanded={menu} onClick={() => setMenu((m) => !m)}>More <Icon name="chevron" size={12} /></button>
              {menu && (
                <div className="popover menu" style={{ minWidth: 200 }}>
                  <button className="menu-item" disabled={!canRemove} onClick={() => ask("remove")}>Remove my sign-off</button>
                  <button className="menu-item" onClick={() => { navigator.clipboard?.writeText(window.location.href); setMenu(false); toast("Link copied"); }}>Copy link to task</button>
                  <button className="menu-item" onClick={() => { setMenu(false); window.print(); }}>Print</button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      {dialog === "sign" && (
        <Dialog title={`Sign off as ${myRole}`} onClose={() => setDialog(null)}
          footer={<><button className="btn" onClick={() => setDialog(null)}>Cancel</button><button className="btn primary" disabled={busy} onClick={() => run("POST")}>Sign off</button></>}>
          <p>By signing off you confirm that your work on <b>{task.ref} {task.title}</b> is complete{myRole === "preparer" ? <> and ready for review by {people[task.reviewer]?.name}</> : null}. Your name and the time are recorded.</p>
          {myRole === "preparer" && <p>After the sign-off the task is read only. You can remove your sign-off until the reviewer has signed.</p>}
          {checks.length > 0 && (
            <div className="callout warn" style={{ marginTop: 10 }}>
              <div><b>Before you sign off</b><ul>{checks.map((c) => <li key={c}>{c}</li>)}</ul></div>
            </div>
          )}
        </Dialog>
      )}
      {dialog === "remove" && (
        <Dialog title="Remove your sign-off" onClose={() => setDialog(null)}
          footer={<><button className="btn" onClick={() => setDialog(null)}>Cancel</button><button className="btn primary" disabled={busy} onClick={() => run("DELETE")}>Remove sign-off</button></>}>
          <p>The task goes back to In progress and can be changed again. The removed sign-off stays in the history.</p>
        </Dialog>
      )}
    </>
  );
}
