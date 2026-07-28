export function LoadingSkeleton({ rows = 8 }: { rows?: number }) {
  return (
    <div className="p-4 space-y-3" data-testid="loading-skeleton">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="h-24 rounded-lg bg-gray-100 animate-pulse" />
      ))}
    </div>
  );
}
