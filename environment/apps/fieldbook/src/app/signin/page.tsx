import { SignIn } from "./SignIn";
import { kv, me } from "@/lib/data";

export const dynamic = "force-dynamic";

export default function SignInPage() {
  return <SignIn firm={kv("firm").name} name={me().name} />;
}
