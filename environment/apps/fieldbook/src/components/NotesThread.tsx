"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Avatar, type Person } from "./bits";
import { api, AutoTextarea, Select, useToast } from "./ui";
import { fmtDateTime } from "@/lib/format";

type Note = { id: number; kind: string; author: string; to_user: string; body: string; status: string; created_at: string; closed_at: string | null; replies: { id: number; author: string; body: string; created_at: string }[] };

export function NotesThread({ taskRef, notes, people, meId, defaultTo }: { taskRef: string; notes: Note[]; people: Record<string, Person>; meId: string; defaultTo: string }) {
  const router = useRouter();
  const toast = useToast();
  const [body, setBody] = useState("");
  const [kind, setKind] = useState("comment");
  const [to, setTo] = useState(defaultTo);
  const [replyTo, setReplyTo] = useState<number | null>(null);
  const [reply, setReply] = useState("");
  const [busy, setBusy] = useState(false);
  const act = async (fn: () => Promise<unknown>, done: string) => {
    setBusy(true);
    try { await fn(); toast(done); router.refresh(); return true; } catch (e: any) { toast(e.message, true); return false; } finally { setBusy(false); }
  };
  const team = Object.values(people).filter((p) => p.id !== meId);
  return (
    <div className="cols side" style={{ gridTemplateColumns: "minmax(0, 1fr) 440px", maxWidth: 1400 }}>
      <section className="card">
        <div className="card-head"><h2>Notes</h2><span className="muted">{notes.length} on this task</span></div>
        {notes.length === 0 && <div className="empty">No notes on this task.</div>}
        {notes.map((n) => (
          <div className="note" key={n.id}>
            <Avatar user={people[n.author]} me={n.author === meId} lg />
            <div>
              <div className="note-meta">
                <b>{people[n.author]?.name}</b><span className="muted">to {people[n.to_user]?.name} · {fmtDateTime(n.created_at)}</span>
                <span className="spacer" />
                <span className={"chip plain s-" + (n.kind === "comment" ? "comment" : n.status)}>{n.kind === "comment" ? "Comment" : `Review note · ${n.status === "cleared" ? "addressed" : n.status}`}</span>
              </div>
              <div className="note-body">{n.body}</div>
              {n.replies.map((r) => (
                <div className="reply" key={r.id}>
                  <div className="note-meta"><b>{people[r.author]?.name}</b><span className="muted">{fmtDateTime(r.created_at)}</span></div>
                  <div className="note-body">{r.body}</div>
                </div>
              ))}
              {replyTo === n.id ? (
                <div className="reply" style={{ display: "grid", gap: 8 }}>
                  <AutoTextarea value={reply} onChange={setReply} minRows={2} aria-label="Reply" autoFocus />
                  <div className="row">
                    <button className="btn primary sm" disabled={busy || !reply.trim()} onClick={async () => { if (await act(() => api("POST", `/api/notes/${n.id}`, { body: reply }), "Reply posted")) { setReply(""); setReplyTo(null); } }}>Post reply</button>
                    <button className="btn ghost sm" onClick={() => { setReplyTo(null); setReply(""); }}>Cancel</button>
                  </div>
                </div>
              ) : (
                <div className="row" style={{ marginTop: 8 }}>
                  <button className="btn sm" onClick={() => { setReplyTo(n.id); setReply(""); }}>Reply</button>
                  {n.kind === "review" && n.status === "open" && n.to_user === meId && <button className="btn sm" disabled={busy} onClick={() => act(() => api("PATCH", `/api/notes/${n.id}`, { status: "cleared" }), "Marked as addressed")}>Mark as addressed</button>}
                  {n.status !== "closed" && n.author === meId && <button className="btn sm" disabled={busy} onClick={() => act(() => api("PATCH", `/api/notes/${n.id}`, { status: "closed" }), "Note closed")}>Close note</button>}
                </div>
              )}
            </div>
          </div>
        ))}
      </section>
      <section className="card">
        <div className="card-head"><h2>Add a note</h2></div>
        <div className="card-body" style={{ display: "grid", gap: 12 }}>
          <div className="cols pair" style={{ gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div className="field"><span className="label">Type</span>
              <Select block value={kind} onChange={setKind} ariaLabel="Type" options={[{ value: "comment", label: "Comment" }, { value: "review", label: "Review note" }]} />
            </div>
            <div className="field"><span className="label">For</span>
              <Select block value={to} onChange={setTo} ariaLabel="For" options={team.map((p) => ({ value: p.id, label: `${p.name} (${p.role})` }))} />
            </div>
          </div>
          <div className="field"><label className="label" htmlFor="note-body">Note</label>
            <AutoTextarea id="note-body" value={body} onChange={setBody} minRows={4} />
          </div>
          <div><button className="btn primary" disabled={busy || !body.trim()} onClick={async () => { if (await act(() => api("POST", `/api/tasks/${taskRef}/notes`, { kind, to, body }), "Note posted")) setBody(""); }}>Post note</button></div>
        </div>
      </section>
    </div>
  );
}
