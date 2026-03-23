import { cn } from '../../lib/utils';

interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className }: SkeletonProps) {
  return (
    <div className={cn('animate-pulse bg-zinc-200 dark:bg-zinc-800 rounded', className)} />
  );
}

/** Pre-composed skeleton that mimics an OrderCard shape. */
export function SkeletonCard() {
  return (
    <div className="bg-white p-4 rounded-xl border border-zinc-200 space-y-3">
      <div className="flex items-start justify-between">
        <Skeleton className="h-4 w-36 rounded-md" />
        <Skeleton className="h-2 w-2 rounded-full" />
      </div>
      <Skeleton className="h-3 w-24 rounded-md" />
      <div className="flex gap-1">
        <Skeleton className="h-4 w-16 rounded-full" />
        <Skeleton className="h-4 w-20 rounded-full" />
      </div>
      <div className="flex items-center justify-between pt-1">
        <Skeleton className="h-3 w-14 rounded-md" />
        <Skeleton className="h-3 w-20 rounded-md" />
      </div>
    </div>
  );
}

/** Pre-composed skeleton row for the AI Cotizador items table. */
export function SkeletonTableRow() {
  return (
    <div className="grid items-center gap-x-2 px-3 py-3"
      style={{ gridTemplateColumns: '28px 1fr 140px 120px 56px 130px 128px 112px' }}>
      <Skeleton className="h-3 w-4 rounded" />
      <Skeleton className="h-3 w-full rounded" />
      <Skeleton className="h-3 w-24 rounded" />
      <div className="flex gap-1">
        <Skeleton className="h-5 w-12 rounded" />
        <Skeleton className="h-5 w-12 rounded" />
      </div>
      <Skeleton className="h-5 w-10 rounded" />
      <div className="flex gap-1">
        <Skeleton className="h-4 w-14 rounded-full" />
      </div>
      <Skeleton className="h-5 w-24 rounded-lg ml-auto" />
      <Skeleton className="h-3 w-16 rounded ml-auto" />
    </div>
  );
}
