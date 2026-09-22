# Mobile-First Patterns — visualflow_frontend

## Core Rules
- Base styles = 375px mobile
- Scale UP with md: lg: prefixes
- Touch targets: minimum 44×44px always
- No hover-only states — use active: states too

## Bottom Sheet Modal (mobile-friendly alternative to centered modal)

```tsx
import * as Dialog from '@radix-ui/react-dialog'
import { motion, AnimatePresence } from 'framer-motion'

export function BottomSheet({ open, onClose, children, title }: Props) {
  return (
    <Dialog.Root open={open} onOpenChange={onClose}>
      <AnimatePresence>
        {open && (
          <Dialog.Portal forceMount>
            <Dialog.Overlay asChild>
              <motion.div
                className="fixed inset-0 bg-black/50 z-40"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              />
            </Dialog.Overlay>
            <Dialog.Content asChild>
              <motion.div
                className="fixed bottom-0 left-0 right-0 z-50 
                  bg-white rounded-t-2xl safe-bottom
                  max-h-[90vh] overflow-y-auto"
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              >
                <div className="w-10 h-1 bg-surface-200 rounded-full 
                  mx-auto mt-3 mb-4" />
                <div className="px-4 pb-6">
                  <Dialog.Title className="font-display font-bold 
                    text-lg text-zinc-900 mb-4">
                    {title}
                  </Dialog.Title>
                  {children}
                </div>
              </motion.div>
            </Dialog.Content>
          </Dialog.Portal>
        )}
      </AnimatePresence>
    </Dialog.Root>
  )
}
```

## Mobile List Item (tappable rows)

```tsx
<button
  className="w-full flex items-center gap-3 p-4 
    min-h-[56px] text-left
    active:bg-surface-50 transition-colors
    border-b border-surface-100 last:border-0"
  onClick={onTap}
>
  <div className="flex-1 min-w-0">
    <p className="text-sm font-medium text-zinc-900 truncate">{title}</p>
    <p className="text-xs text-zinc-500 mt-0.5 truncate">{subtitle}</p>
  </div>
  <ChevronRight className="w-4 h-4 text-zinc-400 shrink-0" />
</button>
```

## Responsive Grid

```tsx
// 1 col mobile → 2 col tablet → 3/4 col desktop
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-4">
```

## Floating Action Button (mobile)

```tsx
<button className="fixed bottom-6 right-4 z-30
  w-14 h-14 bg-brand-600 text-white
  rounded-full shadow-elevated
  flex items-center justify-center
  active:scale-95 transition-transform
  safe-bottom">
  <Plus className="w-6 h-6" />
</button>
```

## Page Animation (mobile-optimized)

```tsx
import { motion } from 'framer-motion'

const pageVariants = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -4 },
}

export function PageWrapper({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={{ duration: 0.15 }}
      className="px-4 py-4 md:px-6 md:py-6 max-w-screen-xl mx-auto"
    >
      {children}
    </motion.div>
  )
}
```
