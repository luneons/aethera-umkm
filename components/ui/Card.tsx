import { forwardRef } from "react";
import { cn } from "@/lib/utils/cn";

type CardProps = React.HTMLAttributes<HTMLDivElement>;

export const Card = forwardRef<HTMLDivElement, CardProps>(function Card(
  { className, children, ...props },
  ref
) {
  return (
    <div
      ref={ref}
      className={cn(
        "aethera-card rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-card)] p-4 sm:p-5",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
});
