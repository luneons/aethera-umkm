import type { LucideIcon } from "lucide-react";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-6 py-14 text-center">
      <div className="grid h-16 w-16 place-items-center rounded-2xl bg-[var(--color-bg-elevated)] text-[var(--color-text-muted)]">
        <Icon size={28} />
      </div>
      <h3 className="text-base font-semibold">{title}</h3>
      {description && (
        <p className="max-w-xs text-sm text-[var(--color-text-secondary)]">{description}</p>
      )}
      {action && <div className="mt-1">{action}</div>}
    </div>
  );
}
