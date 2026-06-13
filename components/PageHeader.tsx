export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <header className="mb-4 flex items-end justify-between gap-3">
      <div>
        <h1 className="font-heading text-2xl font-extrabold">{title}</h1>
        {subtitle && (
          <p className="mt-0.5 text-sm text-[var(--color-text-secondary)]">
            {subtitle}
          </p>
        )}
      </div>
      {action}
    </header>
  );
}
