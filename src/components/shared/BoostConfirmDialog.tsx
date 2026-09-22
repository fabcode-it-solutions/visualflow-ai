import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Zap } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { cn } from '@utils/cn'

interface BoostConfirmDialogProps {
  open: boolean
  onClose: () => void
  onConfirm: (budget: number, durationHours: number) => void
  isConfirming: boolean
}

const BUDGET_OPTIONS = [
  { label: '₹500', value: 500 },
  { label: '₹1,000', value: 1000 },
  { label: '₹2,000', value: 2000 },
]

const DURATION_OPTIONS = [
  { label: '24 hrs', value: 24 },
  { label: '48 hrs', value: 48 },
  { label: '72 hrs', value: 72 },
]

export function BoostConfirmDialog({
  open,
  onClose,
  onConfirm,
  isConfirming,
}: BoostConfirmDialogProps) {
  const [selectedBudget, setSelectedBudget] = useState(500)
  const [customBudget, setCustomBudget] = useState('')
  const [selectedDuration, setSelectedDuration] = useState(48)
  const [estimatedReach] = useState(() => Math.floor(500 * 4) + Math.floor(Math.random() * 1000))

  const budget = customBudget ? parseInt(customBudget) : selectedBudget

  const handleConfirm = () => {
    if (budget && budget > 0) {
      onConfirm(budget, selectedDuration)
    }
  }

  const handleClose = () => {
    setCustomBudget('')
    setSelectedBudget(500)
    setSelectedDuration(48)
    onClose()
  }

  if (!open) return null

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Overlay */}
          <motion.div
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
          />

          {/* Modal */}
          <motion.div
            className="fixed z-50 left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-sm pointer-events-auto"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
          >
            <div className="bg-white rounded-2xl shadow-xl p-6 space-y-6">
              {/* Header */}
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-zinc-900 flex items-center gap-2">
                    <Zap className="h-5 w-5 text-amber-500" />
                    Boost this post?
                  </h2>
                  <p className="text-sm text-zinc-500 mt-1">
                    Run this as a paid ad for better reach
                  </p>
                </div>
                <button
                  onClick={handleClose}
                  className="text-zinc-400 hover:text-zinc-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
                  disabled={isConfirming}
                  type="button"
                  aria-label="Close"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Budget Selector */}
              <div className="space-y-3">
                <label className="block text-sm font-semibold text-zinc-900">Budget</label>
                <div className="grid grid-cols-3 gap-2">
                  {BUDGET_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => {
                        setSelectedBudget(option.value)
                        setCustomBudget('')
                      }}
                      className={cn(
                        'py-2.5 px-3 rounded-lg text-sm font-medium transition-all',
                        selectedBudget === option.value && !customBudget
                          ? 'bg-amber-500 text-white'
                          : 'bg-surface-100 text-zinc-700 hover:bg-surface-200'
                      )}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>

                {/* Custom Budget */}
                <div>
                  <input
                    type="number"
                    value={customBudget}
                    onChange={(e) => {
                      setCustomBudget(e.target.value)
                      if (e.target.value) setSelectedBudget(0)
                    }}
                    placeholder="Custom amount in ₹"
                    className="w-full px-3 py-2.5 text-sm border border-surface-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>

              {/* Duration Selector */}
              <div className="space-y-3">
                <label className="block text-sm font-semibold text-zinc-900">Duration</label>
                <div className="grid grid-cols-3 gap-2">
                  {DURATION_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => setSelectedDuration(option.value)}
                      className={cn(
                        'py-2.5 px-3 rounded-lg text-sm font-medium transition-all',
                        selectedDuration === option.value
                          ? 'bg-amber-500 text-white'
                          : 'bg-surface-100 text-zinc-700 hover:bg-surface-200'
                      )}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Estimated Reach */}
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <p className="text-sm font-medium text-amber-900">
                  Estimated reach: ~{estimatedReach.toLocaleString()} people
                </p>
                <p className="text-xs text-amber-700 mt-1">
                  Based on {budget} INR budget and audience targeting
                </p>
              </div>

              {/* Footer */}
              <div className="flex gap-2 pt-2">
                <Button
                  variant="ghost"
                  onClick={handleClose}
                  disabled={isConfirming}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  className="flex-1 bg-amber-500 hover:bg-amber-600 text-white"
                  onClick={handleConfirm}
                  disabled={!budget || budget <= 0 || isConfirming}
                  loading={isConfirming}
                  leftIcon={<Zap className="h-4 w-4" />}
                >
                  Boost for ₹{budget || selectedBudget}
                </Button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
