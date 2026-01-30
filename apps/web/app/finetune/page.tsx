// Redirect legacy /finetune URL to canonical /tools/finetune
import { redirect } from "next/navigation";

export default function FineTuneLegacyRedirect() {
  redirect("/tools/finetune");
}
