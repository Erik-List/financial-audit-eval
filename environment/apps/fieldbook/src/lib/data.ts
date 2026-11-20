// Reads and writes on the audit file. Server only.
import { db } from "./db";
import { nowIso } from "./clock";

export type User = { id: string; name: string; initials: string; role: string; rank: number; email: string };
export type Task = {
  ref: string; title: string; section: string; kind: string; assignee: string; reviewer: string; status: string;
  due_date: string; budget_hours: number; description: string; result: string; procedure_md: string | null;
  assertions: string | null; risks_json: string; prior_year: string | null;
};
export type Signoff = { id: number; task_ref: string; user_id: string; role: string; signed_at: string; removed_at: string | null };
export type Tick = "agrees" | "does_not_agree" | null;
export type SampleItem = {
  task_ref: string; item_no: number; invoice_no: string; invoice_date: string; customer: string; amount: number;
  delivery_note_no: string | null; delivery_date: string | null;
  tick_quantity: Tick; tick_price: Tick; tick_period: Tick; tick_payment: Tick;
  difference: number | null; comment: string | null; updated_at: string | null; updated_by: string | null;
};
export type Note = {
  id: number; task_ref: string; kind: string; author: string; to_user: string; body: string; status: string;
  created_at: string; closed_at: string | null; replies: { id: number; author: string; body: string; created_at: string }[];
};
export type Doc = { ref: string; task_ref: string; title: string; source: string; author: string; created_at: string; content: any };
export type Request = { ref: string; title: string; area: string; owner: string; requested: string; due: string; status: string; received: string | null; task_ref: string; requested_by: string };
export type Activity = { id: number; at: string; user_id: string; task_ref: string; action: string; detail: string };
export type Notification = { id: number; user_id: string; created_at: string; read: number; text: string; href: string };

const all = <T>(sql: string, ...p: unknown[]) => db().prepare(sql).all(...p) as T[];
const one = <T>(sql: string, ...p: unknown[]) => db().prepare(sql).get(...p) as T | undefined;

export const kv = <T = any>(key: string): T => JSON.parse(one<{ json: string }>("SELECT json FROM kv WHERE key = ?", key)!.json);
export const meta = (key: string) => one<{ value: string }>("SELECT value FROM meta WHERE key = ?", key)?.value ?? "";
export const users = () => all<User>("SELECT * FROM users ORDER BY rank");
export const userMap = () => Object.fromEntries(users().map((u) => [u.id, u])) as Record<string, User>;
export const me = () => one<User>("SELECT * FROM users WHERE id = ?", meta("me"))!;

export const tasks = () => all<Task>("SELECT * FROM tasks ORDER BY rowid");
export const task = (ref: string) => one<Task>("SELECT * FROM tasks WHERE ref = ?", ref);
export const signoffs = (ref?: string) =>
  ref ? all<Signoff>("SELECT * FROM signoffs WHERE task_ref = ? AND removed_at IS NULL ORDER BY signed_at", ref)
      : all<Signoff>("SELECT * FROM signoffs WHERE removed_at IS NULL ORDER BY signed_at");
export const sampleItems = (ref: string) => all<SampleItem>("SELECT * FROM sample_items WHERE task_ref = ? ORDER BY item_no", ref);
export const conclusion = (ref: string) => one<{ text: string; updated_at: string; updated_by: string }>("SELECT * FROM conclusions WHERE task_ref = ?", ref);

export function notes(ref?: string): Note[] {
  const rows = ref ? all<Note>("SELECT * FROM notes WHERE task_ref = ? ORDER BY created_at", ref) : all<Note>("SELECT * FROM notes ORDER BY created_at DESC");
  const replies = all<{ id: number; note_id: number; author: string; body: string; created_at: string }>("SELECT * FROM note_replies ORDER BY created_at");
  return rows.map((n) => ({ ...n, replies: replies.filter((r) => r.note_id === n.id) }));
}
const toDoc = (r: any): Doc => ({ ...r, content: JSON.parse(r.content_json) });
export const documents = (ref?: string) =>
  (ref ? all<any>("SELECT * FROM documents WHERE task_ref = ? ORDER BY ref", ref) : all<any>("SELECT * FROM documents ORDER BY ref")).map(toDoc);
export const document = (ref: string) => { const r = one<any>("SELECT * FROM documents WHERE ref = ?", ref); return r ? toDoc(r) : undefined; };
export const requests = () => all<Request>("SELECT * FROM requests ORDER BY ref");
export const activity = (ref?: string, limit = 200) =>
  ref ? all<Activity>("SELECT * FROM activity WHERE task_ref = ? ORDER BY at DESC, id DESC LIMIT ?", ref, limit)
      : all<Activity>("SELECT * FROM activity ORDER BY at DESC, id DESC LIMIT ?", limit);
export const notifications = (user: string) => all<Notification>("SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC", user);

// ------------------------------------------------------------------------ writes ----
export class Refused extends Error {
  constructor(public status: number, message: string) { super(message); }
}

function log(user: string, task_ref: string, action: string, detail: string, data?: unknown) {
  db().prepare("INSERT INTO activity (at, user_id, task_ref, action, detail, data_json) VALUES (?, ?, ?, ?, ?, ?)")
    .run(nowIso(), user, task_ref, action, detail, data === undefined ? null : JSON.stringify(data));
}

/** The task, if the signed-in user may still change its content. */
function editable(ref: string, user: User): Task {
  const t = task(ref);
  if (!t) throw new Refused(404, "This task does not exist.");
  if (t.assignee !== user.id) throw new Refused(403, `Only the preparer, ${userMap()[t.assignee]?.name}, can change this task.`);
  if (signoffs(ref).some((s) => s.role === "preparer")) throw new Refused(409, "This task is signed off. Remove your sign-off to make changes.");
  return t;
}
function touch(t: Task) {
  if (t.status === "not_started") db().prepare("UPDATE tasks SET status = 'in_progress' WHERE ref = ?").run(t.ref);
}

const ITEM_FIELDS = ["delivery_note_no", "delivery_date", "tick_quantity", "tick_price", "tick_period", "tick_payment", "difference", "comment"] as const;
const FIELD_LABEL: Record<string, string> = {
  delivery_note_no: "delivery note", delivery_date: "delivery date", tick_quantity: "quantity", tick_price: "price",
  tick_period: "period", tick_payment: "payment", difference: "difference", comment: "comment",
};
export type ItemInput = Pick<SampleItem, (typeof ITEM_FIELDS)[number]>;

export function saveItem(ref: string, itemNo: number, input: ItemInput, user: User): SampleItem {
  const t = editable(ref, user);
  const before = one<SampleItem>("SELECT * FROM sample_items WHERE task_ref = ? AND item_no = ?", ref, itemNo);
  if (!before) throw new Refused(404, "This sample item does not exist.");
  const text = (v: unknown) => (typeof v === "string" && v.trim() !== "" ? v.trim() : null);
  const tick = (v: unknown): Tick => {
    if (v === null || v === undefined || v === "") return null;
    if (v === "agrees" || v === "does_not_agree") return v;
    throw new Refused(400, "A tickmark is either Agrees or Does not agree.");
  };
  const clean: ItemInput = {
    delivery_note_no: text(input.delivery_note_no),
    delivery_date: text(input.delivery_date),
    tick_quantity: tick(input.tick_quantity), tick_price: tick(input.tick_price),
    tick_period: tick(input.tick_period), tick_payment: tick(input.tick_payment),
    difference: input.difference === null || input.difference === undefined ? null : Number(input.difference),
    comment: typeof input.comment === "string" && input.comment.trim() !== "" ? input.comment : null,
  };
  if (clean.delivery_date && !/^\d{4}-\d{2}-\d{2}$/.test(clean.delivery_date)) throw new Refused(400, "Enter the delivery date as MM/DD/YYYY.");
  if (clean.difference !== null && !Number.isFinite(clean.difference)) throw new Refused(400, "Enter the difference as an amount in dollars.");
  const changed = ITEM_FIELDS.filter((k) => (before[k] ?? null) !== (clean[k] ?? null));
  const at = nowIso();
  db().prepare(`UPDATE sample_items SET delivery_note_no = @delivery_note_no, delivery_date = @delivery_date,
      tick_quantity = @tick_quantity, tick_price = @tick_price, tick_period = @tick_period, tick_payment = @tick_payment,
      difference = @difference, comment = @comment, updated_at = @at, updated_by = @by
      WHERE task_ref = @ref AND item_no = @no`).run({ ...clean, at, by: user.id, ref, no: itemNo });
  touch(t);
  if (changed.length)
    log(user.id, ref, "item_saved", `Saved item ${itemNo} (${before.invoice_no}): ${changed.map((k) => FIELD_LABEL[k]).join(", ")}`,
      { item_no: itemNo, before: Object.fromEntries(changed.map((k) => [k, before[k]])), after: Object.fromEntries(changed.map((k) => [k, clean[k]])) });
  return one<SampleItem>("SELECT * FROM sample_items WHERE task_ref = ? AND item_no = ?", ref, itemNo)!;
}

export function saveConclusion(ref: string, text: string, user: User) {
  const t = editable(ref, user);
  const before = conclusion(ref)?.text ?? "";
  const at = nowIso();
  db().prepare(`INSERT INTO conclusions (task_ref, text, updated_at, updated_by) VALUES (?, ?, ?, ?)
      ON CONFLICT (task_ref) DO UPDATE SET text = excluded.text, updated_at = excluded.updated_at, updated_by = excluded.updated_by`).run(ref, text, at, user.id);
  touch(t);
  if (before !== text) log(user.id, ref, "conclusion_saved", before ? "Changed the conclusion" : "Wrote the conclusion", { before, after: text });
  return conclusion(ref)!;
}

export function signOff(ref: string, user: User) {
  const t = task(ref);
  if (!t) throw new Refused(404, "This task does not exist.");
  const role = t.assignee === user.id ? "preparer" : t.reviewer === user.id ? "reviewer" : null;
  if (!role) throw new Refused(403, "You are neither the preparer nor the reviewer of this task.");
  if (signoffs(ref).some((s) => s.role === role)) throw new Refused(409, `This task is already signed off by its ${role}.`);
  db().prepare("INSERT INTO signoffs (task_ref, user_id, role, signed_at) VALUES (?, ?, ?, ?)").run(ref, user.id, role, nowIso());
  db().prepare("UPDATE tasks SET status = ? WHERE ref = ?").run(role === "preparer" ? "ready_for_review" : "reviewed", ref);
  log(user.id, ref, "signed_off", `Signed off as ${role}`);
  if (role === "preparer" && t.reviewer !== user.id)
    db().prepare("INSERT INTO notifications (user_id, created_at, read, text, href) VALUES (?, ?, 0, ?, ?)")
      .run(t.reviewer, nowIso(), `${user.name} signed off ${t.ref} ${t.title}. It is ready for your review.`, `/tasks/${t.ref}`);
}

export function removeSignOff(ref: string, user: User) {
  const mine = signoffs(ref).find((s) => s.user_id === user.id);
  if (!mine) throw new Refused(409, "You have not signed off this task.");
  if (mine.role === "preparer" && signoffs(ref).some((s) => s.role === "reviewer")) throw new Refused(409, "This task is reviewed. Ask the reviewer to remove the review sign-off first.");
  db().prepare("UPDATE signoffs SET removed_at = ? WHERE id = ?").run(nowIso(), mine.id);
  db().prepare("UPDATE tasks SET status = ? WHERE ref = ?").run(mine.role === "preparer" ? "in_progress" : "ready_for_review", ref);
  log(user.id, ref, "signoff_removed", `Removed the ${mine.role} sign-off`);
}

export function addNote(ref: string, input: { kind: string; to: string; body: string }, user: User) {
  if (!task(ref)) throw new Refused(404, "This task does not exist.");
  const body = (input.body ?? "").trim();
  if (!body) throw new Refused(400, "Write the note before you post it.");
  const to = userMap()[input.to];
  if (!to) throw new Refused(400, "Choose who the note is for.");
  const kind = input.kind === "review" ? "review" : "comment";
  const at = nowIso();
  db().prepare("INSERT INTO notes (task_ref, kind, author, to_user, body, status, created_at) VALUES (?, ?, ?, ?, ?, 'open', ?)").run(ref, kind, user.id, to.id, body, at);
  log(user.id, ref, "note_added", `${kind === "review" ? "Review note" : "Comment"} for ${to.name}`, { body });
  if (to.id !== user.id)
    db().prepare("INSERT INTO notifications (user_id, created_at, read, text, href) VALUES (?, ?, 0, ?, ?)")
      .run(to.id, at, `${user.name} left a ${kind === "review" ? "review note" : "comment"} for you on ${ref} ${task(ref)!.title}.`, `/tasks/${ref}?tab=notes`);
}

export function replyToNote(id: number, body: string, user: User) {
  const n = one<Note>("SELECT * FROM notes WHERE id = ?", id);
  if (!n) throw new Refused(404, "This note does not exist.");
  if (!body.trim()) throw new Refused(400, "Write the reply before you post it.");
  db().prepare("INSERT INTO note_replies (note_id, author, body, created_at) VALUES (?, ?, ?, ?)").run(id, user.id, body.trim(), nowIso());
  log(user.id, n.task_ref, "note_reply", "Replied to a note", { note_id: id, body: body.trim() });
}

export function setNoteStatus(id: number, status: string, user: User) {
  const n = one<Note>("SELECT * FROM notes WHERE id = ?", id);
  if (!n) throw new Refused(404, "This note does not exist.");
  if (status === "cleared" && n.to_user !== user.id) throw new Refused(403, "Only the person the note is for can mark it as addressed.");
  if (status === "closed" && n.author !== user.id) throw new Refused(403, "Only the author can close a note.");
  if (!["open", "cleared", "closed"].includes(status)) throw new Refused(400, "Unknown status.");
  db().prepare("UPDATE notes SET status = ?, closed_at = ? WHERE id = ?").run(status, status === "closed" ? nowIso() : null, id);
  log(user.id, n.task_ref, "note_" + status, status === "cleared" ? "Marked a note as addressed" : status === "closed" ? "Closed a note" : "Reopened a note", { note_id: id });
}

export function markNotificationsRead(user: User, id?: number) {
  if (id) db().prepare("UPDATE notifications SET read = 1 WHERE user_id = ? AND id = ?").run(user.id, id);
  else db().prepare("UPDATE notifications SET read = 1 WHERE user_id = ?").run(user.id);
}

/** What the header of a task needs: its people and its live sign-offs. */
export function taskSummary(t: Task) {
  const so = signoffs(t.ref);
  return { preparer: so.find((s) => s.role === "preparer") ?? null, reviewer: so.find((s) => s.role === "reviewer") ?? null };
}

/** Records an uploaded evidence file on a task. The bytes are stored by the caller. */
export function addEvidence(ref: string, file: { filename: string; size: number; stored: string }, user: User): string {
  if (!task(ref)) throw new Refused(404, "This task does not exist.");
  const taken = all<{ ref: string }>("SELECT ref FROM documents WHERE task_ref = ? AND ref LIKE ?", ref, ref + ".%").map((d) => Number(d.ref.slice(ref.length + 1)) || 0);
  const docRef = `${ref}.${Math.max(0, ...taken) + 1}`;
  const size = file.size < 1024 * 1024 ? Math.max(1, Math.round(file.size / 1024)) + " KB" : (file.size / 1024 / 1024).toFixed(1) + " MB";
  db().prepare("INSERT INTO documents VALUES (?, ?, ?, 'firm', ?, ?, ?)")
    .run(docRef, ref, file.filename.replace(/\.[A-Za-z0-9]+$/, ""), user.id, nowIso(), JSON.stringify({ kind: "file", filename: file.filename, size, stored: file.stored }));
  log(user.id, ref, "document_added", `Added ${docRef} ${file.filename}`);
  return docRef;
}
