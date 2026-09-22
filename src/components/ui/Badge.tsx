import { cn } from '@utils/cn'

export interface BadgeProps {
  variant?: 'default' | 'success' | 'error' | 'warning' | 'info' | 'brand'
  size?: 'sm' | 'md'
  children: React.ReactNode
  className?: string
}

const variantClasses: Record<NonNullable<BadgeProps['variant']>, string> = {
  default: 'bg-surface-100 text-zinc-700 border border-surface-300',
  success: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
  error: 'bg-red-50 text-red-700 border border-red-200',
  warning: 'bg-amber-50 text-amber-700 border border-amber-200',
  info: 'bg-blue-50 text-blue-700 border border-blue-200',
  brand: 'bg-brand-50 text-brand-700 border border-brand-200',
}

const sizeClasses: Record<NonNullable<BadgeProps['size']>, string> = {
  sm: 'px-2 py-0.5 text-xs',
  md: 'px-2.5 py-1 text-xs',
}

export function Badge({ variant = 'default', size = 'md', children, className }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center font-medium rounded-full',
        variantClasses[variant],
        sizeClasses[size],
        className,
      )}
    >
      {children}
    </span>
  )
}

