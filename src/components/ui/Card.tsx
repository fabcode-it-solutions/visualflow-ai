import { cn } from '@utils/cn'

export interface CardProps {
  children: React.ReactNode
  className?: string
  interactive?: boolean
  header?: React.ReactNode
  footer?: React.ReactNode
  padding?: 'none' | 'sm' | 'md' | 'lg'
}

const paddingClasses: Record<NonNullable<CardProps['padding']>, string> = {
  none: '',
  sm: 'p-3',
  md: 'p-4',
  lg: 'p-6',
}

export function Card({
  children,
  className,
  interactive = false,
  header,
  footer,
  padding = 'md',
}: CardProps) {
  return (
    <div
      className={cn(
        'bg-white rounded-lg shadow-card border border-surface-200',
        interactive && 'hover:shadow-elevated transition-shadow cursor-pointer',
        className,
      )}
    >
      {header && (
        <div className="px-4 pt-4 pb-3 border-b border-surface-200">{header}</div>
      )}
      <div className={cn(paddingClasses[padding])}>{children}</div>
      {footer && (
        <div className="px-4 pb-4 pt-3 border-t border-surface-200">{footer}</div>
      )}
    </div>
  )
}

