import * as RadixCheckbox from '@radix-ui/react-checkbox'
import { useId } from 'react'
import { cn } from '@utils/cn'

export interface CheckboxProps {
  checked?: boolean | 'indeterminate'
  onCheckedChange?: (checked: boolean | 'indeterminate') => void
  label?: string
  disabled?: boolean
  id?: string
  className?: string
}

export function Checkbox({ checked, onCheckedChange, label, disabled, id, className }: CheckboxProps) {
  const generatedId = useId()
  const checkboxId = id ?? generatedId

  return (
    <div className={cn('flex items-center gap-2.5 min-h-[44px]', className)}>
      <RadixCheckbox.Root
        id={checkboxId}
        checked={checked}
        onCheckedChange={onCheckedChange}
        disabled={disabled}
        className={cn(
          'flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2',
          checked === true
            ? 'border-brand-600 bg-brand-600'
            : checked === 'indeterminate'
            ? 'border-brand-600 bg-brand-600'
            : 'border-surface-300 bg-white hover:border-brand-400',
          disabled && 'cursor-not-allowed opacity-50',
        )}
      >
        <RadixCheckbox.Indicator>
          {checked === 'indeterminate' ? (
            <svg className="h-3 w-3 text-white" fill="currentColor" viewBox="0 0 12 12">
              <rect x="2" y="5" width="8" height="2" rx="1" />
            </svg>
          ) : (
            <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 12 12" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M2 6l3 3 5-5" />
            </svg>
          )}
        </RadixCheckbox.Indicator>
      </RadixCheckbox.Root>
      {label && (
        <label
          htmlFor={checkboxId}
          className={cn('text-sm text-zinc-700 select-none', !disabled && 'cursor-pointer')}
        >
          {label}
        </label>
      )}
    </div>
  )
}

