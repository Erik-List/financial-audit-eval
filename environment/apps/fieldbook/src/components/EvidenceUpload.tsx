"use client";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { useToast } from "./ui";

export function EvidenceUpload({ taskRef }: { taskRef: string }) {
  const input = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  return (
    <>
      <input ref={input} type="file" hidden onChange={async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setBusy(true);
        const body = new FormData(); body.append("file", file);
        const res = await fetch(`/api/tasks/${taskRef}/evidence`, { method: "POST", body });
        const json = await res.json().catch(() => ({}));
        setBusy(false); e.target.value = "";
        if (!res.ok) return toast(json.error || "The file was not added.", true);
        toast(`Added ${json.ref}`); router.refresh();
      }} />
      <button className="btn sm" disabled={busy} onClick={() => input.current?.click()}>Add evidence</button>
    </>
  );
}
