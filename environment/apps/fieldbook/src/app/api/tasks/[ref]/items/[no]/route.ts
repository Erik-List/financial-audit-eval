import { saveItem } from "@/lib/data";
import { handle } from "@/lib/session";

export async function PUT(req: Request, ctx: { params: Promise<{ ref: string; no: string }> }) {
  const { ref, no } = await ctx.params;
  const body = await req.json();
  return handle((user) => ({ item: saveItem(ref, Number(no), body, user) }));
}
