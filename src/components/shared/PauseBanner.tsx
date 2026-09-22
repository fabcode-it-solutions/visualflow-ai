import { motion, AnimatePresence } from 'framer-motion'
import { AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { useShopStore } from '@/store/shopStore'

interface PauseBannerProps {
  onResume?: () => void
}

export function PauseBanner({ onResume }: PauseBannerProps) {
  const shop = useShopStore((s) => s.shop)
  const isPaused = shop?.isGlobalPaused ?? false

  return (
    <AnimatePresence>
      {isPaused && (
        <motion.div
          className="bg-amber-50 border-b border-amber-200 px-4 py-3 sm:px-6 sm:py-4"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.2 }}
        >
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0" />
              <p className="text-sm font-medium text-amber-900">
                ⚠️ All activity is paused. Posts and ads are not running.
              </p>
            </div>
            {onResume && (
              <Button
                variant="secondary"
                size="sm"
                onClick={onResume}
                className="shrink-0 bg-amber-600 text-white hover:bg-amber-700"
              >
                Resume Activity
              </Button>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
