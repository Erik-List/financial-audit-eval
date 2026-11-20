import { replyToNote, setNoteStatus } from "@/lib/data";
import { handle } from "@/lib/session";

type Ctx = { params: Promise<{ id: string }> };
export async function POST(req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const body = await req.json();
  return handle((user) => replyToNote(Number(id), String(body.body ?? ""), user));
}
export async function PATCH(req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const body = await req.json();
  return handle((user) => setNoteStatus(Number(id), String(body.status), user));
}
