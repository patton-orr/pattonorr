// Presentational wrapper for a settings section: a heading, optional
// description, and a stack of setting cards.
export function SettingsSection({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h2 className="text-base font-semibold text-black dark:text-zinc-50">
          {title}
        </h2>
        {description && <p className="text-sm text-zinc-500">{description}</p>}
      </div>
      <div className="flex flex-col gap-3">{children}</div>
    </div>
  );
}
