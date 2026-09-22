import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

/**
 * Merge Tailwind CSS classes with proper precedence.
 * Combines clsx (conditional classes) with tailwind-merge (dedup/override).
 *
 * @example
 * cn('px-4 py-2', isActive && 'bg-brand-600 text-white', className)
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs))
}
