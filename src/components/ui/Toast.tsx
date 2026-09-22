import * as RadixToast from '@radix-ui/react-toast'
import { createContext, useContext, useState, useCallback, useRef } from 'react'
import { CheckCircle2, XCircle, AlertTriangle, Info, X } from 'lucide-react'
import { cn } from '@utils/cn'

export type ToastVariant = 'success' | 'error' | 'warning' | 'info'

export interface ToastItem {
  id: string
  variant: ToastVariant
  title: string
  description?: string
}

interface ToastContextValue {
  toast: (opts: Omit<ToastItem, 'id'>) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used inside ToastProvider')
  return ctx
}

const variantConfig: Record<
  ToastVariant,
  {
    icon: React.ReactNode
    bgColor: string
    borderColor: string
    iconColor: string
    titleColor: string
    descColor: string
  }
> = {
  success: {
    icon: <CheckCircle2 className="h-[18px] w-[18px]" strokeWidth={2} />,
    bgColor: 'bg-green-50',
    borderColor: 'border border-green-200',
    iconColor: 'text-green-600',
    titleColor: 'text-zinc-900',
    descColor: 'text-zinc-600',
  },
  error: {
    icon: <XCircle className="h-[18px] w-[18px]" strokeWidth={2} />,
    bgColor: 'bg-red-50',
    borderColor: 'border border-red-200',
    iconColor: 'text-red-600',
    titleColor: 'text-zinc-900',
    descColor: 'text-zinc-600',
  },
  warning: {
    icon: <AlertTriangle className="h-[18px] w-[18px]" strokeWidth={2} />,
    bgColor: 'bg-amber-50',
    borderColor: 'border border-amber-200',
    iconColor: 'text-amber-600',
    titleColor: 'text-zinc-900',
    descColor: 'text-zinc-600',
  },
  info: {
    icon: <Info className="h-[18px] w-[18px]" strokeWidth={2} />,
    bgColor: 'bg-violet-50',
    borderColor: 'border border-violet-200',
    iconColor: 'text-violet-600',
    titleColor: 'text-zinc-900',
    descColor: 'text-zinc-600',
  },
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const counterRef = useRef(0)

  const toast = useCallback((opts: Omit<ToastItem, 'id'>) => {
    const id = String(++counterRef.current)
    setToasts((prev) => [...prev.slice(-3), { ...opts, id }])
  }, [])

  const dismiss = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }

  return (
    <ToastContext.Provider value={{ toast }}>
      <RadixToast.Provider swipeDirection="right" duration={4000}>
        {children}

        {toasts.map((t) => {
          const cfg = variantConfig[t.variant]
          return (
            <RadixToast.Root
              key={t.id}
              onOpenChange={(open) => { if (!open) dismiss(t.id) }}
              className={cn(
                'group relative flex items-start gap-3',
                'w-[min(360px,calc(100vw-32px))]',
                'rounded-xl px-4 py-3.5 font-sans text-sm',
                'shadow-elevated',
                'overflow-hidden',
                cfg.bgColor,
                cfg.borderColor,
                'data-[state=open]:animate-in data-[state=open]:fade-in data-[state=open]:slide-in-from-bottom-4',
                'data-[state=closed]:animate-fade-out',
                'data-[swipe=move]:translate-x-[var(--radix-toast-swipe-move-x)]',
                'data-[swipe=end]:translate-x-[var(--radix-toast-swipe-end-x)]',
                'data-[swipe=cancel]:translate-x-0 data-[swipe=cancel]:transition-transform',
              )}
            >
              {/* Icon */}
              <span className={cn('mt-0.5 shrink-0', cfg.iconColor)}>
                {cfg.icon}
              </span>

              {/* Content */}
              <div className="flex-1 min-w-0 pr-1">
                <RadixToast.Title className={cn('text-sm font-semibold leading-snug', cfg.titleColor)}>
                  {t.title}
                </RadixToast.Title>
                {t.description && (
                  <RadixToast.Description className={cn('mt-0.5 text-xs leading-relaxed', cfg.descColor)}>
                    {t.description}
                  </RadixToast.Description>
                )}
              </div>

              {/* Close */}
              <RadixToast.Close
                className="shrink-0 mt-0.5 p-0.5 rounded-md text-zinc-400
                  hover:text-zinc-700 hover:bg-zinc-100 transition-colors"
                aria-label="Close"
              >
                <X className="h-3.5 w-3.5" strokeWidth={2.5} />
              </RadixToast.Close>
            </RadixToast.Root>
          )
        })}

        <RadixToast.Viewport
          className="fixed bottom-4 left-1/2 -translate-x-1/2 md:bottom-6 md:right-6 md:left-auto md:translate-x-0 flex flex-col gap-2.5 z-[200] outline-none pointer-events-none"
        />
      </RadixToast.Provider>
    </ToastContext.Provider>
  )
}
