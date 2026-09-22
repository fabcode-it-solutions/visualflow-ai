import { cn } from '@utils/cn'
import { Button } from './Button'

export interface ErrorStateProps {
  title?: string
  message?: string
  onRetry?: () => void
  className?: string
}

export function ErrorState({
  title = 'Something went wrong',
  message = 'An unexpected error occurred. Please try again.',
  onRetry,
  className,
}: ErrorStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center px-4 py-12 gap-4',
        className,
      )}
    >
      <div className="flex items-center justify-center h-16 w-16 rounded-full bg-red-50 text-red-400">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-8 w-8"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
          />
        </svg>
      </div>
      <div className="space-y-1">
        <h3 className="font-display font-semibold text-zinc-800 text-base">{title}</h3>
        <p className="text-sm text-zinc-500 max-w-xs mx-auto">{message}</p>
      </div>
      {onRetry && (
        <Button variant="secondary" size="md" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  )
}

