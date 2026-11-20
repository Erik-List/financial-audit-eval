import { markNotificationsRead } from "@/lib/data";
import { handle } from "@/lib/session";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  return handle((user) => markNotificationsRead(user, body.id));
}
