import { useToast as useToastContext } from '@/components/ui/Toast'

type ToastType = 'success' | 'error' | 'info' | 'warning'

/**
 * Thin bridge hook — keeps the `showToast(message, type)` call-site API
 * used across all pages while routing into the global Radix ToastProvider.
 */
export function useToast() {
  const { toast } = useToastContext()

  const showToast = (message: string, type: ToastType = 'info') => {
    toast({ variant: type, title: message })
  }

  // no-op: Radix handles auto-dismiss internally
  const clearToast = () => {}

  return { showToast, clearToast }
}
