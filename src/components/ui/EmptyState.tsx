import { cn } from '@utils/cn'
import { Button } from './Button'

export interface EmptyStateProps {
  icon?: React.ReactNode
  title: string
  description?: string
  action?: {
    label: string
    onClick: () => void
  }
  className?: string
}

export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center px-4 py-12 gap-4',
        className,
      )}
    >
      {icon && (
        <div className="flex items-center justify-center h-16 w-16 rounded-full bg-brand-50 text-brand-400">
          {icon}
        </div>
      )}
      <div className="space-y-1">
        <h3 className="font-display font-semibold text-zinc-800 text-base">{title}</h3>
        {description && (
          <p className="text-sm text-zinc-500 max-w-xs mx-auto">{description}</p>
        )}
      </div>
      {action && (
        <Button variant="primary" size="md" onClick={action.onClick}>
          {action.label}
        </Button>
      )}
    </div>
  )
}

