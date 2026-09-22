import * as RadixSelect from '@radix-ui/react-select'
import { useId } from 'react'
import { cn } from '@utils/cn'

export interface SelectOption {
  value: string
  label: string
  disabled?: boolean
}

export interface SelectProps {
  options: SelectOption[]
  value?: string
  onValueChange?: (value: string) => void
  placeholder?: string
  label?: string
  helperText?: string
  error?: string
  disabled?: boolean
  id?: string
  className?: string
}

export function Select({
  options,
  value,
  onValueChange,
  placeholder = 'Select an option',
  label,
  helperText,
  error,
  disabled,
  id,
  className,
}: SelectProps) {
  const generatedId = useId()
  const selectId = id ?? generatedId

  return (
    <div className={cn('flex flex-col gap-1.5 w-full', className)}>
      {label && (
        <label htmlFor={selectId} className="text-sm font-medium text-zinc-700">
          {label}
        </label>
      )}
      <RadixSelect.Root value={value} onValueChange={onValueChange} disabled={disabled}>
        <RadixSelect.Trigger
          id={selectId}
          aria-invalid={!!error}
          className={cn(
            'flex w-full items-center justify-between min-h-[44px] rounded-[10px] border bg-white px-3 py-2.5 text-sm text-zinc-900',
            'transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent',
            error
              ? 'border-red-400 focus:ring-red-400'
              : 'border-surface-300 hover:border-surface-400',
            disabled && 'bg-surface-100 cursor-not-allowed text-zinc-500',
          )}
        >
          <RadixSelect.Value placeholder={<span className="text-zinc-400">{placeholder}</span>} />
          <RadixSelect.Icon>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-zinc-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </RadixSelect.Icon>
        </RadixSelect.Trigger>
        <RadixSelect.Portal>
          <RadixSelect.Content
            position="popper"
            sideOffset={4}
            className="z-50 w-[var(--radix-select-trigger-width)] overflow-hidden rounded-lg border border-surface-200 bg-white shadow-elevated animate-fade-in"
          >
            <RadixSelect.Viewport className="p-1">
              {options.map((opt) => (
                <RadixSelect.Item
                  key={opt.value}
                  value={opt.value}
                  disabled={opt.disabled}
                  className={cn(
                    'relative flex w-full cursor-pointer select-none items-center rounded-md px-3 py-2.5 text-sm text-zinc-700 outline-none',
                    'data-[highlighted]:bg-brand-50 data-[highlighted]:text-brand-700',
                    'data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
                  )}
                >
                  <RadixSelect.ItemText>{opt.label}</RadixSelect.ItemText>
                  <RadixSelect.ItemIndicator className="ml-auto">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-brand-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg>
                  </RadixSelect.ItemIndicator>
                </RadixSelect.Item>
              ))}
            </RadixSelect.Viewport>
          </RadixSelect.Content>
        </RadixSelect.Portal>
      </RadixSelect.Root>
      {error && <p className="text-xs text-red-600">{error}</p>}
      {!error && helperText && <p className="text-xs text-zinc-500">{helperText}</p>}
    </div>
  )
}

