export function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div role="alert" className="p-6 m-4 bg-red-50 border border-red-200 rounded-md text-red-800">
      <p className="font-medium mb-2">Something went wrong.</p>
      <p className="text-sm mb-3">{message}</p>
      <button
        type="button"
        onClick={onRetry}
        className="px-3 py-1.5 text-sm rounded-md border border-red-300 hover:bg-red-100"
      >
        Retry
      </button>
    </div>
  );
}
