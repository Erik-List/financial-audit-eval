import { saveConclusion } from "@/lib/data";
import { handle } from "@/lib/session";

export async function PUT(req: Request, ctx: { params: Promise<{ ref: string }> }) {
  const { ref } = await ctx.params;
  const body = await req.json();
  return handle((user) => ({ conclusion: saveConclusion(ref, String(body.text ?? ""), user) }));
}
