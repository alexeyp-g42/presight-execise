interface StatusPanelProps {
  variant: 'empty' | 'error'
  message: string
  actionLabel?: string
  onAction?: () => void
}

export function StatusPanel({ variant, message, actionLabel, onAction }: StatusPanelProps) {
  return (
    <div
      role={variant === 'error' ? 'alert' : undefined}
      className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-slate-300 p-10 text-center"
    >
      <p className={variant === 'error' ? 'text-red-600' : 'text-slate-500'}>{message}</p>
      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-700"
        >
          {actionLabel}
        </button>
      )}
    </div>
  )
}
