"use client";
import { useState } from "react";

export function SignIn({ firm, name }: { firm: string; name: string }) {
  const [busy, setBusy] = useState(false);
  return (
    <div className="signin">
      <div className="card">
        <h1>Fieldbook</h1>
        <p className="muted" style={{ margin: "4px 0 20px" }}>{firm}</p>
        <p>You are signed out.</p>
        <button className="btn primary" style={{ width: "100%", justifyContent: "center", height: 36 }} disabled={busy}
          onClick={async () => { setBusy(true); await fetch("/api/session", { method: "POST" }); window.location.href = "/"; }}>
          Sign in with firm single sign-on
        </button>
        <p className="muted" style={{ margin: "14px 0 0", fontSize: 12 }}>Continues as {name} on this device.</p>
      </div>
    </div>
  );
}
