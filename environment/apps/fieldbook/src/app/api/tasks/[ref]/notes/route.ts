import { addNote } from "@/lib/data";
import { handle } from "@/lib/session";

export async function POST(req: Request, ctx: { params: Promise<{ ref: string }> }) {
  const { ref } = await ctx.params;
  const body = await req.json();
  return handle((user) => addNote(ref, body, user));
}
