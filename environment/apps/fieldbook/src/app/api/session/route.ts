import { cookies } from "next/headers";
import { SIGNED_OUT } from "@/lib/session";

export async function POST() {
  (await cookies()).delete(SIGNED_OUT);
  return Response.json({ ok: true });
}
export async function DELETE() {
  (await cookies()).set(SIGNED_OUT, "1", { path: "/", httpOnly: true, sameSite: "lax" });
  return Response.json({ ok: true });
}
