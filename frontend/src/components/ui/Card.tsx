import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/cn';

/** A surface for one group of related things: white on the snow canvas, a hairline and a whisper of shadow. */
export function Card({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('rounded-lg border border-line bg-surface shadow-card [&>*:first-child]:rounded-t-[inherit] [&>*:last-child]:rounded-b-[inherit]', className)} {...rest} />;
}

export function CardHeader({ title, description, action, className }: { title: ReactNode; description?: ReactNode; action?: ReactNode; className?: string }) {
  return (
    // Spacing, not a divider, separates the title from the content.
    <div className={cn('flex items-start justify-between gap-3 px-4 pt-4 pb-1 sm:px-5 sm:pt-5', className)}>
      <div className="min-w-0">
        <h2 className="text-[15px] leading-snug font-semibold text-ink">{title}</h2>
        {description && <p className="mt-0.5 text-[13px] leading-relaxed text-muted">{description}</p>}
      </div>
      {action && <div className="flex shrink-0 items-center gap-2">{action}</div>}
    </div>
  );
}

export function CardBody({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('px-4 py-4 sm:px-5 sm:pt-4 sm:pb-5', className)} {...rest} />;
}
