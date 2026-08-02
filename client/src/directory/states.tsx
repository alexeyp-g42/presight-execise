export function CardSkeleton() {
  return (
    <div className="flex animate-pulse gap-4 rounded-lg border border-line bg-surface p-4">
      <div className="size-11 shrink-0 rounded-md bg-line" />
      <div className="flex-1 space-y-2 py-0.5">
        <div className="h-3.5 w-2/5 rounded bg-line" />
        <div className="h-3 w-1/4 rounded bg-line" />
        <div className="mt-3 h-4 w-1/2 rounded bg-line" />
      </div>
    </div>
  );
}

export function ListSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="space-y-2" aria-busy="true" aria-label="Loading people">
      {Array.from({ length: count }, (_, index) => (
        <CardSkeleton key={index} />
      ))}
    </div>
  );
}

export function FacetSkeleton({ rows = 8 }: { rows?: number }) {
  return (
    <div className="animate-pulse space-y-1.5" aria-busy="true">
      {Array.from({ length: rows }, (_, index) => (
        <div key={index} className="h-7 rounded bg-line" />
      ))}
    </div>
  );
}

export function EmptyState({ onClear }: { onClear: () => void }) {
  return (
    <div className="rounded-lg border border-dashed border-line px-6 py-16 text-center">
      <p className="font-medium text-ink">No matches</p>
      <p className="mx-auto mt-1 max-w-xs text-sm text-muted">
        No one in the directory matches these filters. Remove one to widen the search.
      </p>
      <button
        type="button"
        onClick={onClear}
        className="mt-5 rounded-md bg-ink px-3 py-1.5 text-sm font-medium text-paper transition-opacity hover:opacity-85"
      >
        Clear filters
      </button>
    </div>
  );
}

export function ErrorState({
  title,
  message,
  onRetry,
}: {
  title: string;
  message: string;
  onRetry: () => void;
}) {
  return (
    <div role="alert" className="rounded-lg border border-line bg-danger-surface px-5 py-6 text-center">
      <p className="font-medium text-danger">{title}</p>
      <p className="mx-auto mt-1 max-w-sm text-sm text-muted">{message}</p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-4 rounded-md border border-line bg-surface px-3 py-1.5 text-sm font-medium text-ink transition-colors hover:border-faint"
      >
        Try again
      </button>
    </div>
  );
}
