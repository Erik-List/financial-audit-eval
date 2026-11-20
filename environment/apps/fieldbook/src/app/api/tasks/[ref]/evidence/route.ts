import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { addEvidence, Refused } from "@/lib/data";
import { uploadsDir } from "@/lib/db";
import { handle } from "@/lib/session";

export async function POST(req: Request, ctx: { params: Promise<{ ref: string }> }) {
  const { ref } = await ctx.params;
  const form = await req.formData();
  return handle(async (user) => {
    const file = form.get("file");
    if (!(file instanceof File) || !file.size) throw new Refused(400, "Choose a file to add.");
    if (file.size > 25 * 1024 * 1024) throw new Refused(400, "Files can be up to 25 MB.");
    const stored = `${Date.now()}-${file.name.replace(/[^A-Za-z0-9._-]/g, "_")}`;
    const dir = uploadsDir();
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(/*turbopackIgnore: true*/ dir, stored), Buffer.from(await file.arrayBuffer()));
    return { ref: addEvidence(ref, { filename: file.name, size: file.size, stored }, user) };
  });
}
