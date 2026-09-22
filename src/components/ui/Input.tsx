import { forwardRef, useState, useId } from 'react'
import { cn } from '@utils/cn'

export interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label?: string
  helperText?: string
  error?: string
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, helperText, error, leftIcon, rightIcon, type = 'text', className, id, ...props }, ref) => {
    const generatedId = useId()
    const inputId = id ?? generatedId
    const [showPassword, setShowPassword] = useState(false)
    const isPassword = type === 'password'
    const resolvedType = isPassword ? (showPassword ? 'text' : 'password') : type

    return (
      <div className="flex flex-col gap-1.5 w-full">
        {label && (
          <label htmlFor={inputId} className="text-sm font-medium text-zinc-700">
            {label}
          </label>
        )}
        <div className="relative flex items-center">
          {leftIcon && (
            <span className="absolute left-3 text-zinc-400 pointer-events-none">{leftIcon}</span>
          )}
          <input
            ref={ref}
            id={inputId}
            type={resolvedType}
            aria-describedby={error ? `${inputId}-error` : helperText ? `${inputId}-helper` : undefined}
            aria-invalid={!!error}
            className={cn(
              'w-full min-h-[44px] rounded-[10px] border bg-white px-3 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400',
              'transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent',
              error
                ? 'border-red-400 focus:ring-red-400'
                : 'border-surface-300 hover:border-surface-400',
              leftIcon && 'pl-10',
              (rightIcon || isPassword) && 'pr-10',
              props.disabled && 'bg-surface-100 cursor-not-allowed text-zinc-500',
              className,
            )}
            {...props}
          />
          {isPassword && (
            <button
              type="button"
              tabIndex={-1}
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-3 text-zinc-400 hover:text-zinc-600 min-h-[44px] flex items-center"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
              )}
            </button>
          )}
          {!isPassword && rightIcon && (
            <span className="absolute right-3 text-zinc-400 pointer-events-none">{rightIcon}</span>
          )}
        </div>
        {error && (
          <p id={`${inputId}-error`} className="text-xs text-red-600 flex items-center gap-1">
            {error}
          </p>
        )}
        {!error && helperText && (
          <p id={`${inputId}-helper`} className="text-xs text-zinc-500">
            {helperText}
          </p>
        )}
      </div>
    )
  },
)

Input.displayName = 'Input'

