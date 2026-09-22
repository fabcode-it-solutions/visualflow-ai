import { forwardRef, useId, useRef, useEffect } from 'react'
import { cn } from '@utils/cn'

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  helperText?: string
  error?: string
  autoResize?: boolean
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, helperText, error, autoResize = false, className, id, onChange, ...props }, ref) => {
    const generatedId = useId()
    const textareaId = id ?? generatedId
    const internalRef = useRef<HTMLTextAreaElement>(null)
    const combinedRef = (node: HTMLTextAreaElement | null) => {
      internalRef.current = node
      if (typeof ref === 'function') ref(node)
      else if (ref) (ref as React.MutableRefObject<HTMLTextAreaElement | null>).current = node
    }

    const resize = () => {
      const el = internalRef.current
      if (!el || !autoResize) return
      el.style.height = 'auto'
      el.style.height = `${el.scrollHeight}px`
    }

    useEffect(() => {
      resize()
    })

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      resize()
      onChange?.(e)
    }

    return (
      <div className="flex flex-col gap-1.5 w-full">
        {label && (
          <label htmlFor={textareaId} className="text-sm font-medium text-zinc-700">
            {label}
          </label>
        )}
        <textarea
          ref={combinedRef}
          id={textareaId}
          aria-describedby={error ? `${textareaId}-error` : helperText ? `${textareaId}-helper` : undefined}
          aria-invalid={!!error}
          onChange={handleChange}
          className={cn(
            'w-full min-h-[44px] rounded-[10px] border bg-white px-3 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 resize-y',
            'transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent',
            error
              ? 'border-red-400 focus:ring-red-400'
              : 'border-surface-300 hover:border-surface-400',
            props.disabled && 'bg-surface-100 cursor-not-allowed text-zinc-500',
            autoResize && 'resize-none overflow-hidden',
            className,
          )}
          {...props}
        />
        {error && (
          <p id={`${textareaId}-error`} className="text-xs text-red-600">
            {error}
          </p>
        )}
        {!error && helperText && (
          <p id={`${textareaId}-helper`} className="text-xs text-zinc-500">
            {helperText}
          </p>
        )}
      </div>
    )
  },
)

Textarea.displayName = 'Textarea'

