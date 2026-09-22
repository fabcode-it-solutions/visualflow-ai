import * as RadixSwitch from '@radix-ui/react-switch'
import { useId } from 'react'
import { cn } from '@utils/cn'

export interface SwitchProps {
  checked?: boolean
  onCheckedChange?: (checked: boolean) => void
  label?: string
  disabled?: boolean
  id?: string
  className?: string
}

export function Switch({ checked, onCheckedChange, label, disabled, id, className }: SwitchProps) {
  const generatedId = useId()
  const switchId = id ?? generatedId

  return (
    <div className={cn('flex items-center gap-3 min-h-[44px]', className)}>
      <RadixSwitch.Root
        id={switchId}
        checked={checked}
        onCheckedChange={onCheckedChange}
        disabled={disabled}
        className={cn(
          'relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2',
          checked ? 'bg-brand-600' : 'bg-surface-300',
          disabled && 'cursor-not-allowed opacity-50',
        )}
      >
        <RadixSwitch.Thumb className="pointer-events-none block h-5 w-5 rounded-full bg-white shadow-sm transition-transform data-[state=checked]:translate-x-5 data-[state=unchecked]:translate-x-0" />
      </RadixSwitch.Root>
      {label && (
        <label
          htmlFor={switchId}
          className={cn('text-sm text-zinc-700 select-none', !disabled && 'cursor-pointer')}
        >
          {label}
        </label>
      )}
    </div>
  )
}

