import * as Dialog from '@radix-ui/react-dialog'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@utils/cn'

export interface ModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title?: string
  description?: string
  children: React.ReactNode
  footer?: React.ReactNode
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const sizeClasses: Record<NonNullable<ModalProps['size']>, string> = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
}

export function Modal({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  size = 'md',
  className,
}: ModalProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal forceMount>
        <AnimatePresence>
          {open && (
            <>
              <Dialog.Overlay asChild>
                <motion.div
                  key="overlay"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
                />
              </Dialog.Overlay>
              <Dialog.Content asChild>
                {/* Mobile: bottom sheet. Desktop: centered modal */}
                <motion.div
                  key="content"
                  initial={{ opacity: 0, y: 40 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 40 }}
                  transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                  className={cn(
                    'fixed z-50 bg-white shadow-modal focus:outline-none',
                    // Mobile: bottom sheet
                    'bottom-0 left-0 right-0 rounded-t-2xl max-h-[90dvh] overflow-y-auto',
                    // Desktop: centered
                    'md:bottom-auto md:left-1/2 md:top-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-xl md:w-full',
                    sizeClasses[size],
                    className,
                  )}
                >
                  {/* Drag handle on mobile */}
                  <div className="md:hidden flex justify-center pt-3 pb-1">
                    <div className="h-1 w-10 rounded-full bg-surface-300" />
                  </div>
                  <div className="px-4 pt-4 pb-2 md:px-6 md:pt-6">
                    {title && (
                      <Dialog.Title className="font-display font-semibold text-lg text-zinc-900">
                        {title}
                      </Dialog.Title>
                    )}
                    {description && (
                      <Dialog.Description className="mt-1 text-sm text-zinc-500">
                        {description}
                      </Dialog.Description>
                    )}
                  </div>
                  <div className="px-4 pb-4 md:px-6 md:pb-6">{children}</div>
                  {footer && (
                    <div className="px-4 pb-6 pt-3 border-t border-surface-200 md:px-6">
                      {footer}
                    </div>
                  )}
                  <Dialog.Close className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full text-zinc-400 hover:bg-surface-100 hover:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-brand-500">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    <span className="sr-only">Close</span>
                  </Dialog.Close>
                </motion.div>
              </Dialog.Content>
            </>
          )}
        </AnimatePresence>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

