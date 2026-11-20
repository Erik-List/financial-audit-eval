import { removeSignOff, signOff } from "@/lib/data";
import { handle } from "@/lib/session";

type Ctx = { params: Promise<{ ref: string }> };
export async function POST(_: Request, ctx: Ctx) {
  const { ref } = await ctx.params;
  return handle((user) => signOff(ref, user));
}
export async function DELETE(_: Request, ctx: Ctx) {
  const { ref } = await ctx.params;
  return handle((user) => removeSignOff(ref, user));
}
