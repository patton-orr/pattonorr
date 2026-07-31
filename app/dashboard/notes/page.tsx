import { requireSection } from "@/lib/require-access";
import { getQuickNotes } from "@/lib/notes";
import { NotesList } from "./notes-list";

export const dynamic = "force-dynamic";

export default async function Notes() {
  await requireSection("notes");
  const notes = await getQuickNotes();

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight text-black dark:text-zinc-50">
          Notes
        </h1>
        <p className="text-zinc-600 dark:text-zinc-400">
          Quick jottings, kept per-account across your devices.
        </p>
      </div>
      <NotesList notes={notes} />
    </div>
  );
}
