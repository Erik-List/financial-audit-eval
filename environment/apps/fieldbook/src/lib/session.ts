// The firm signs people in through single sign-on, so the app opens signed in. Signing
// out sets a cookie; the sign-in page clears it again.
import { cookies } from "next/headers";
import { me, Refused, type User } from "./data";

export const SIGNED_OUT = "fb_signed_out";

export async function currentUser(): Promise<User | null> {
  const jar = await cookies();
  return jar.get(SIGNED_OUT) ? null : me();
}

/** Runs a write for the signed-in user and turns refusals into JSON errors. */
export async function handle(fn: (user: User) => unknown | Promise<unknown>): Promise<Response> {
  try {
    const user = await currentUser();
    if (!user) return Response.json({ error: "You are signed out. Sign in again to continue." }, { status: 401 });
    const result = await fn(user);
    return Response.json(result ?? { ok: true });
  } catch (e) {
    if (e instanceof Refused) return Response.json({ error: e.message }, { status: e.status });
    console.error(e);
    return Response.json({ error: "Something went wrong. Your change was not saved." }, { status: 500 });
  }
}
