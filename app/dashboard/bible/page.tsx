import { redirect } from "next/navigation";

// The Bible reader is now the full-screen app at /bible.
export default function BibleRedirect() {
  redirect("/bible");
}
