"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { Avatar, Icon, type Person } from "./bits";
import { api, useDismiss } from "./ui";
import { fmtDateTime, fmtLongDate } from "@/lib/format";

type Eng = { id: string; client: string; name: string; period_end: string; status: string; role?: string; code?: string };
type Notif = { id: number; created_at: string; read: number; text: string; href: string };

function Pop({ button, children, className, label, left }: { button: React.ReactNode; children: (close: () => void) => React.ReactNode; className: string; label: string; left?: boolean }) {
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  const ref = useDismiss(open, close);
  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button type="button" className={className} aria-expanded={open} aria-label={label} title={label} onClick={() => setOpen((o) => !o)}>{button}</button>
      {open && <div className={"popover" + (left ? " left" : "")}>{children(close)}</div>}
    </div>
  );
}

export function TopBar({ user, firm, engagement, others, notifications, erpUrl }: { user: Person & { email: string }; firm: { name: string; office: string }; engagement: Eng; others: Eng[]; notifications: Notif[]; erpUrl: string | null }) {
  const router = useRouter();
  const unread = notifications.filter((n) => !n.read).length;
  const [q, setQ] = useState("");
  return (
    <header className="topbar">
      <Link href="/" className="brandmark">
        <svg width="26" height="26" viewBox="0 0 26 26" aria-hidden><rect x="3" y="2" width="20" height="22" rx="3" fill="#e2a03a" /><rect x="7" y="2" width="16" height="22" rx="2" fill="#f6efe0" /><path d="M11 8h8M11 12h8M11 16h5" stroke="#10302f" strokeWidth="1.6" strokeLinecap="round" /></svg>
        <span className="brand-text">Fieldbook<small>{firm.name}</small></span>
      </Link>
      <Pop className="eng-switch" label="Switch engagement" left button={<><span className="eng-text"><b>{engagement.client}</b><span>{engagement.name}</span></span><Icon name="chevron" size={14} /></>}>
        {(close) => (
          <div style={{ width: 400 }}>
            <div className="menu-head"><b>My engagements</b></div>
            <div className="menu">
              <Link className="menu-item" href="/" onClick={close}>
                <span><b>{engagement.client}</b><br /><span className="muted">{engagement.name} · {engagement.status}</span></span>
                <span className="spacer" /><Icon name="check" />
              </Link>
              {others.map((o) => (
                <Link key={o.id} className="menu-item" href={`/engagements/${o.id}`} onClick={close}>
                  <span><b>{o.client}</b><br /><span className="muted">{o.name} · {o.status}</span></span>
                </Link>
              ))}
            </div>
          </div>
        )}
      </Pop>
      <form className="search" role="search" onSubmit={(e) => { e.preventDefault(); if (q.trim()) router.push("/search?q=" + encodeURIComponent(q.trim())); }}>
        <Icon name="search" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search tasks, documents, requests and notes" aria-label="Search the engagement" />
      </form>
      <Link className="top-btn search-link" href="/search" title="Search" aria-label="Search"><Icon name="search" size={18} /></Link>
      {erpUrl && <a className="top-btn" href={erpUrl} target="_blank" rel="noreferrer" title="Open the client's ERP in a new tab" aria-label="Open the client's ERP"><Icon name="external" /></a>}
      <Pop className="top-btn" label="Help" button={<Icon name="help" size={18} />}>
        {() => (
          <div style={{ width: 300 }}>
            <div className="menu-head"><b>Help</b></div>
            <div className="card-body">
              <p>Fieldbook holds the audit file of an engagement: tasks, evidence, review notes and sign-offs.</p>
              <p className="muted" style={{ margin: 0 }}>Questions about the engagement go to your senior. For problems with Fieldbook, call the service desk, extension 4400.</p>
            </div>
          </div>
        )}
      </Pop>
      <Pop className="top-btn" label={`Notifications${unread ? `, ${unread} unread` : ""}`} button={<><Icon name="bell" size={18} />{unread > 0 && <span className="badge">{unread}</span>}</>}>
        {(close) => (
          <div style={{ width: 420 }}>
            <div className="menu-head row"><b>Notifications</b><span className="spacer" />
              {unread > 0 && <button className="btn ghost sm" onClick={async () => { await api("POST", "/api/notifications", {}); router.refresh(); }}>Mark all as read</button>}
            </div>
            <div className="menu" style={{ maxHeight: 460, overflow: "auto" }}>
              {notifications.map((n) => (
                <Link key={n.id} href={n.href} className="menu-item" style={{ alignItems: "flex-start" }}
                  onClick={() => { close(); if (!n.read) api("POST", "/api/notifications", { id: n.id }).then(() => router.refresh()); }}>
                  <span className="dot" style={{ marginTop: 6, flex: "none", background: n.read ? "transparent" : "#e2a03a" }} />
                  <span><span style={{ fontWeight: n.read ? 400 : 500 }}>{n.text}</span><br /><span className="muted" style={{ fontSize: 11.5 }}>{fmtDateTime(n.created_at)}</span></span>
                </Link>
              ))}
            </div>
          </div>
        )}
      </Pop>
      <Pop className="user-btn" label="Account" button={<><Avatar user={user} me lg /><span className="user-name">{user.name}</span><Icon name="chevron" size={14} /></>}>
        {(close) => (
          <div style={{ width: 260 }}>
            <div className="menu-head"><b>{user.name}</b><br /><span className="muted">{user.role} · {firm.office}<br />{user.email}</span></div>
            <div className="menu">
              <Link className="menu-item" href="/team" onClick={close}>Engagement team</Link>
              <button className="menu-item" disabled>Preferences</button>
              <div className="menu-sep" />
              <button className="menu-item" onClick={async () => { await api("DELETE", "/api/session"); window.location.href = "/signin"; }}>Sign out</button>
            </div>
          </div>
        )}
      </Pop>
    </header>
  );
}

export function SideNav({ counts, engagement }: { counts: Record<string, number>; engagement: Eng }) {
  const path = usePathname();
  const item = (href: string, icon: string, label: string, count?: number) => {
    const active = href === "/" ? path === "/" : path.startsWith(href);
    return (
      <Link href={href} className={"nav-item" + (active ? " active" : "")} aria-current={active ? "page" : undefined} title={label}>
        <Icon name={icon} /><span className="nav-label">{label}</span>{count ? <span className="count">{count}</span> : null}
      </Link>
    );
  };
  return (
    <nav className="sidenav" aria-label="Engagement">
      <div className="nav-group" style={{ paddingTop: 2 }}>Work</div>
      {item("/", "home", "My work")}
      {item("/tasks", "tasks", "Tasks", counts.tasks)}
      {item("/notes", "notes", "Review notes", counts.notes)}
      {item("/documents", "docs", "Documents", counts.documents)}
      {item("/requests", "requests", "Client requests", counts.requests)}
      <div className="nav-group">Engagement</div>
      {item("/profile", "profile", "Client profile")}
      {item("/materiality", "materiality", "Materiality")}
      {item("/risks", "risks", "Risks", counts.risks)}
      {item("/accounts", "accounts", "Trial balance")}
      {item("/team", "team", "Team and timeline")}
      <div className="nav-foot">
        <b>{engagement.code}</b>
        Year end {fmtLongDate(engagement.period_end)}<br />{engagement.status}
      </div>
    </nav>
  );
}
