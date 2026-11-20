import { existsSync, readFileSync } from "node:fs";
import { basename, join } from "node:path";
import { uploadsDir } from "@/lib/db";
import { document } from "@/lib/data";
import { currentUser } from "@/lib/session";

export async function GET(_: Request, ctx: { params: Promise<{ ref: string }> }) {
  const { ref } = await ctx.params;
  if (!(await currentUser())) return new Response("Signed out", { status: 401 });
  const doc = document(decodeURIComponent(ref));
  const stored = doc?.content?.stored;
  const path = stored ? join(/*turbopackIgnore: true*/ uploadsDir(), basename(stored)) : "";
  if (!doc || !path || !existsSync(path)) return new Response("Not found", { status: 404 });
  const filename = String(doc.content?.filename ?? basename(path)).replace(/"/g, "");
  return new Response(readFileSync(path), {
    headers: { "content-type": "application/octet-stream", "content-disposition": `attachment; filename="${filename}"` },
  });
}
