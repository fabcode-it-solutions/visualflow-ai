import { forwardRef } from 'react'
import { motion } from 'framer-motion'
import { cn } from '@utils/cn'
import { Spinner } from './Spinner'

export interface ButtonProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'variant'> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'success'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
}

const variantClasses: Record<NonNullable<ButtonProps['variant']>, string> = {
  primary:
    'bg-brand-600 text-white hover:bg-brand-700 active:bg-brand-800 shadow-sm disabled:bg-brand-300',
  secondary:
    'bg-surface-100 text-zinc-800 border border-surface-300 hover:bg-surface-200 active:bg-surface-300 disabled:text-zinc-400',
  ghost:
    'bg-transparent text-brand-600 hover:bg-brand-50 active:bg-brand-100 disabled:text-brand-300',
  danger:
    'bg-red-600 text-white hover:bg-red-700 active:bg-red-800 shadow-sm disabled:bg-red-300',
  success:
    'bg-emerald-600 text-white hover:bg-emerald-700 active:bg-emerald-800 shadow-sm disabled:bg-emerald-300',
}

const sizeClasses: Record<NonNullable<ButtonProps['size']>, string> = {
  sm: 'min-h-[44px] px-3 text-sm gap-1.5',
  md: 'min-h-[44px] px-4 text-sm gap-2',
  lg: 'min-h-[52px] px-6 text-base gap-2',
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      loading = false,
      leftIcon,
      rightIcon,
      disabled,
      children,
      className,
      ...props
    },
    ref,
  ) => {
    const isDisabled = disabled || loading

    return (
      <motion.button
        ref={ref}
        whileTap={isDisabled ? undefined : { scale: 0.97 }}
        transition={{ duration: 0.1 }}
        disabled={isDisabled}
        className={cn(
          'inline-flex items-center justify-center rounded-[10px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 cursor-pointer disabled:cursor-not-allowed',
          variantClasses[variant],
          sizeClasses[size],
          className,
        )}
        {...(props as React.ComponentPropsWithoutRef<typeof motion.button>)}
      >
        {loading ? (
          <Spinner size="sm" className="text-current opacity-80" />
        ) : (
          leftIcon && <span className="shrink-0">{leftIcon}</span>
        )}
        {children}
        {!loading && rightIcon && <span className="shrink-0">{rightIcon}</span>}
      </motion.button>
    )
  },
)

Button.displayName = 'Button'

