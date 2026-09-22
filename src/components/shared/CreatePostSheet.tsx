import * as Dialog from '@radix-ui/react-dialog'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Sparkles, ShoppingBag, Star, ArrowRight } from 'lucide-react'
import { cn } from '@utils/cn'

interface CreatePostSheetProps {
  open: boolean
  onClose: () => void
  onSinglePost: () => void
  onCollection: () => void
  onTestimonial: () => void
  collectionDisabled?: boolean
  testimonialDisabled?: boolean
}

const OPTIONS = [
  {
    key: 'single',
    icon: Sparkles,
    iconBg: 'bg-brand-600',
    iconColor: 'text-white',
    badge: 'AI Powered',
    badgeClass: 'bg-brand-100 text-brand-700',
    title: 'Single Product Post',
    desc: 'Feed, Story, Carousel or Reel — AI writes the caption, generates the image.',
    cta: 'Create post',
    ctaColor: 'text-brand-600',
    border: 'border-brand-100 hover:border-brand-300 hover:shadow-brand/10',
    activeBg: 'active:bg-brand-50',
  },
  {
    key: 'collection',
    icon: ShoppingBag,
    iconBg: 'bg-violet-600',
    iconColor: 'text-white',
    badge: '3–6 Products',
    badgeClass: 'bg-violet-100 text-violet-700',
    title: 'Collection Post',
    desc: 'Bundle multiple products into one branded campaign carousel.',
    cta: 'Build campaign',
    ctaColor: 'text-violet-600',
    border: 'border-violet-100 hover:border-violet-300 hover:shadow-violet-600/10',
    activeBg: 'active:bg-violet-50',
  },
  {
    key: 'testimonial',
    icon: Star,
    iconBg: 'bg-amber-400',
    iconColor: 'text-white',
    badge: 'Social Proof',
    badgeClass: 'bg-amber-100 text-amber-700',
    title: 'Testimonial Post',
    desc: 'Turn a customer review into a branded visual post with stars and quote.',
    cta: 'Add review',
    ctaColor: 'text-amber-600',
    border: 'border-amber-100 hover:border-amber-300 hover:shadow-amber-400/10',
    activeBg: 'active:bg-amber-50',
  },
]

export function CreatePostSheet({
  open,
  onClose,
  onSinglePost,
  onCollection,
  onTestimonial,
  collectionDisabled = false,
  testimonialDisabled = false,
}: CreatePostSheetProps) {
  const handlers: Record<string, () => void> = {
    single: onSinglePost,
    collection: onCollection,
    testimonial: onTestimonial,
  }
  const disabled: Record<string, boolean> = {
    single: false,
    collection: collectionDisabled,
    testimonial: testimonialDisabled,
  }

  return (
    <Dialog.Root open={open} onOpenChange={v => !v && onClose()}>
      <AnimatePresence>
        {open && (
          <Dialog.Portal forceMount>
            {/* Backdrop */}
            <Dialog.Overlay asChild>
              <motion.div
                className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
              />
            </Dialog.Overlay>

            {/* Sheet — slides up on mobile, centered on desktop */}
            <Dialog.Content asChild>
              <motion.div
                className={cn(
                  'fixed z-50 bg-white outline-none',
                  // Mobile: bottom sheet
                  'bottom-0 left-0 right-0 rounded-t-3xl max-h-[90vh] overflow-y-auto',
                  // Desktop: centered modal
                  'sm:bottom-auto sm:left-1/2 sm:top-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-3xl sm:w-full sm:max-w-md sm:max-h-none',
                )}
                initial={{ y: '100%', opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: '100%', opacity: 0 }}
                transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              >
                {/* Drag handle (mobile only) */}
                <div className="flex justify-center pt-3 pb-1 sm:hidden">
                  <div className="w-10 h-1 rounded-full bg-zinc-200" />
                </div>

                {/* Header */}
                <div className="flex items-center justify-between px-6 pt-4 pb-2 sm:pt-6">
                  <div>
                    <Dialog.Title className="font-display font-bold text-lg text-zinc-900">
                      Create a Post
                    </Dialog.Title>
                    <Dialog.Description className="text-sm text-zinc-400 mt-0.5">
                      What would you like to create?
                    </Dialog.Description>
                  </div>
                  <button
                    onClick={onClose}
                    className="w-9 h-9 flex items-center justify-center rounded-xl bg-zinc-100 hover:bg-zinc-200 transition-colors cursor-pointer text-zinc-500"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                {/* Options */}
                <div className="px-4 pb-6 pt-3 space-y-3 sm:px-6">
                  {OPTIONS.map(opt => {
                    const Icon = opt.icon
                    const isDisabled = disabled[opt.key]
                    return (
                      <button
                        key={opt.key}
                        onClick={() => { handlers[opt.key](); onClose() }}
                        disabled={isDisabled}
                        className={cn(
                          'group w-full flex items-center gap-4 p-4 rounded-2xl border bg-white transition-all duration-150 cursor-pointer text-left',
                          'hover:shadow-lg',
                          opt.border,
                          opt.activeBg,
                          'active:scale-[0.98]',
                          isDisabled && 'opacity-40 cursor-not-allowed pointer-events-none',
                        )}
                      >
                        {/* Icon */}
                        <div className={cn('w-12 h-12 rounded-2xl flex items-center justify-center shrink-0', opt.iconBg)}>
                          <Icon className={cn('h-5 w-5', opt.iconColor)} />
                        </div>

                        {/* Text */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <p className="font-display font-bold text-sm text-zinc-900">{opt.title}</p>
                            <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-full', opt.badgeClass)}>
                              {opt.badge}
                            </span>
                          </div>
                          <p className="text-xs text-zinc-500 leading-relaxed">{opt.desc}</p>
                        </div>

                        {/* Arrow */}
                        <ArrowRight className={cn('h-4 w-4 shrink-0 transition-transform group-hover:translate-x-1', opt.ctaColor)} />
                      </button>
                    )
                  })}

                  {collectionDisabled && (
                    <p className="text-[11px] text-zinc-400 text-center px-2">
                      Collection requires at least 3 products with price &amp; stock
                    </p>
                  )}
                </div>
              </motion.div>
            </Dialog.Content>
          </Dialog.Portal>
        )}
      </AnimatePresence>
    </Dialog.Root>
  )
}
