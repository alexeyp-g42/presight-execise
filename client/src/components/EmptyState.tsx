export function EmptyState({ onClear }: { onClear: () => void }) {
  return (
    <div className="p-10 text-center text-gray-600">
      <p className="mb-3">No users match these filters.</p>
      <button
        type="button"
        onClick={onClear}
        className="px-3 py-1.5 text-sm rounded-md border border-gray-300 hover:bg-gray-50"
      >
        Clear filters
      </button>
    </div>
  );
}
