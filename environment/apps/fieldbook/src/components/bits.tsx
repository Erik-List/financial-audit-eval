// Small display pieces used by server and client components alike.
import { Fragment, type ReactNode } from "react";
import { STATUS_LABEL } from "@/lib/format";

export type Person = { id: string; name: string; initials: string; role?: string };

export function Avatar({ user, me, lg }: { user?: Person; me?: boolean; lg?: boolean }) {
  return <span className={"avatar" + (me ? " me" : "") + (lg ? " lg" : "")} title={user?.name}>{user?.initials ?? "?"}</span>;
}
export function PersonChip({ user, me }: { user?: Person; me?: boolean }) {
  if (!user) return <span className="muted">Unassigned</span>;
  return <span className="person"><Avatar user={user} me={me} />{user.name}</span>;
}
export function StatusChip({ status, label }: { status: string; label?: string }) {
  return <span className={"chip s-" + status}>{label ?? STATUS_LABEL[status] ?? status[0].toUpperCase() + status.slice(1)}</span>;
}
export function PageHead({ title, sub, crumbs, children }: { title: ReactNode; sub?: ReactNode; crumbs?: ReactNode; children?: ReactNode }) {
  return (
    <div className="page-head">
      <div>
        {crumbs && <div className="crumbs">{crumbs}</div>}
        <h1>{title}</h1>
        {sub && <div className="sub">{sub}</div>}
      </div>
      <div className="spacer" />
      {children}
    </div>
  );
}
export function Card({ title, aside, children, flush }: { title?: ReactNode; aside?: ReactNode; children: ReactNode; flush?: boolean }) {
  return (
    <section className="card">
      {title && <div className="card-head"><h2>{title}</h2><div className="spacer" />{aside}</div>}
      {flush ? <div className="table-wrap">{children}</div> : <div className="card-body">{children}</div>}
    </section>
  );
}

const paths: Record<string, string> = {
  home: "M2.5 7 8 2.5 13.5 7v6.5h-4v-4h-3v4h-4z",
  tasks: "M3 4h10M3 8h10M3 12h10",
  notes: "M2.5 3h11v7.5h-6L4.5 13v-2.5h-2z",
  docs: "M4 2h5.5L12 4.5V14H4zM9.5 2v2.5H12",
  requests: "M2 4h12v8H2zM2 4l6 5 6-5",
  profile: "M2.5 13.5v-10h7v10M9.5 6.5h4v7M5 6h2M5 8.5h2M5 11h2",
  materiality: "M8 2v12M3 5h10M3 5l-1.5 4a2 2 0 0 0 3 0zM13 5l-1.5 4a2 2 0 0 0 3 0zM5 14h6",
  risks: "M8 2 14.5 13.5h-13zM8 6.5v3.5M8 11.6v.4",
  accounts: "M2 3h12v10H2zM2 6.5h12M6 6.5V13",
  team: "M5.5 7.5a2.2 2.2 0 1 0 0-4.4 2.2 2.2 0 0 0 0 4.4zM1.5 13c.4-2.2 2-3.4 4-3.4s3.600 1.200 4 3.400M11 7.200a1.800 1.800 0 1 0 0-3.600M11.500 9.800c1.500.300 2.600 1.300 3 3.200",
  search: "M7 12A5 5 0 1 0 7 2a5 5 0 0 0 0 10zM11 11l3 3",
  bell: "M4 11V7a4 4 0 0 1 8 0v4l1.200 1.500H2.800zM6.500 14h3",
  help: "M8 14A6 6 0 1 0 8 2a6 6 0 0 0 0 12zM6.300 6.200a1.800 1.800 0 1 1 2.600 1.700c-.600.300-.900.700-.900 1.300M8 11.300v.300",
  chevron: "M4 6l4 4 4-4",
  external: "M6 3H3v10h10v-3M9 3h4v4M13 3 7.500 8.500",
  file: "M4 2h5.500L12 4.500V14H4z",
  sheet: "M2.500 3h11v10h-11zM2.500 6.300h11M2.500 9.600h11M6.200 3v10",
  lock: "M4 7h8v6.500H4zM5.500 7V5a2.500 2.500 0 0 1 5 0v2",
  more: "M3.500 8h.010M8 8h.010M12.500 8h.010",
  check: "M3 8.500 6.500 12 13 4.500",
};
export function Icon({ name, size = 16 }: { name: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={name === "more" ? 2.2 : 1.4} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d={paths[name] ?? ""} />
    </svg>
  );
}

/** The cells of a table row, keyed, so they can cross from a server page into a client table. */
export const cells = (...nodes: ReactNode[]) => nodes.map((n, i) => <Fragment key={i}>{n}</Fragment>);
