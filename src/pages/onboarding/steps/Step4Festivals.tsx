import { useQuery } from '@tanstack/react-query'
import { festivalService } from '@/services/festivalService'
import { Skeleton } from '@/components/ui/Skeleton'
import { motion, AnimatePresence } from 'framer-motion'
import { format, parseISO } from 'date-fns'
import { AlertCircle, ChevronDown } from 'lucide-react'
import { useState } from 'react'
import type { OnboardingData } from '../Onboarding'
import type { Festival } from '@/types/brand.types'

interface Props {
  data: OnboardingData
  updateData: (updates: Partial<OnboardingData>) => void
  errors?: {
    festivalError?: string | null
  }
}

const FESTIVAL_EMOJIS: Record<string, string> = {
  'Diwali': '🪔',
  'Holi': '🎨',
  'Eid': '🌙',
  'Raksha Bandhan': '🪢',
  'Navratri': '💃',
  'Durga Puja': '🙏',
  'Ganesh Chaturthi': '🐘',
  'Janmashtami': '🦚',
  'Makar Sankranti': '🪁',
  'Lohri': '🔥',
  'Pongal': '🌾',
  'Baisakhi': '🌻',
  'Onam': '🌺',
  'Christmas': '🎄',
  'New Year': '🎆',
  "Valentine's Day": '💝',
  "Mother's Day": '💐',
  "Father's Day": '👨‍👦',
  'Independence Day': '🇮🇳',
  'Republic Day': '🇮🇳',
  'Dussehra': '🏹',
  'Karva Chauth': '🌕',
  'Dhanteras': '💰',
  "Women's Day": '👩',
  'Black Friday': '🛍️',
  'End of Season': '🏷️',
  'Ugadi': '🌿',
  'Gudi Padwa': '🎋',
  'Bhai Dooj': '👫',
}

// Per-festival preferred categories stored separately so toggling categories
// doesn't require touching OnboardingData shape.
type FestivalCategoryMap = Record<string, string[]>

export default function Step4Festivals({ data: onboardingData, updateData, errors = {} }: Props) {
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [festivalCategories, setFestivalCategories] = useState<FestivalCategoryMap>({})

  const { data: festivalsData, isLoading } = useQuery({
    queryKey: ['festivals'],
    queryFn: async () => {
      const res = await festivalService.getAll()
      return res.data
    },
  })

  const { data: categoriesData } = useQuery({
    queryKey: ['product-categories'],
    queryFn: async () => {
      const res = await festivalService.getProductCategories()
      return res.data.categories
    },
  })

  const productCategories: string[] = categoriesData ?? []

  const toggle = (id: string) => {
    const selected = onboardingData.selectedFestivals
    if (selected.includes(id)) {
      updateData({ selectedFestivals: selected.filter(s => s !== id) })
      setExpandedId(prev => (prev === id ? null : prev))
    } else {
      updateData({ selectedFestivals: [...selected, id] })
    }
  }

  const toggleCategory = (festivalId: string, cat: string) => {
    setFestivalCategories(prev => {
      const existing = prev[festivalId] ?? []
      const updated = existing.includes(cat)
        ? existing.filter(c => c !== cat)
        : [...existing, cat]
      return { ...prev, [festivalId]: updated }
    })
  }

  const selectAll = () => updateData({ selectedFestivals: (festivalsData ?? []).map((f: Festival) => f.id) })
  const deselectAll = () => {
    updateData({ selectedFestivals: [] })
    setExpandedId(null)
  }

  if (isLoading) return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
      {[1,2,3,4,5,6].map(i => <Skeleton key={i} className="h-24 rounded-2xl" />)}
    </div>
  )

  const festivalList: Festival[] = festivalsData ?? []
  const getEmoji = (name: string) => {
    for (const [key, emoji] of Object.entries(FESTIVAL_EMOJIS)) {
      if (name.includes(key)) return emoji
    }
    return '🎉'
  }

  return (
    <div className="space-y-8 md:space-y-10">
      {/* Header */}
      <div>
        <div className="text-4xl mb-3">🎊</div>
        <h2 className="font-display font-bold text-2xl md:text-3xl text-zinc-900 mb-2">
          Select your festivals
        </h2>
        <p className="text-base text-zinc-600">
          VisualFlow AI will automatically create special campaigns for these events
        </p>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-zinc-700">
            {onboardingData.selectedFestivals.length} of {festivalList.length} selected
          </p>
          <p className="text-xs text-zinc-500 mt-1">
            Choose at least one festival to continue
          </p>
        </div>
        <div className="flex gap-2">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            type="button"
            onClick={selectAll}
            className="text-xs font-semibold text-brand-600 hover:text-brand-700 px-4 py-2 rounded-lg hover:bg-brand-50 transition-colors cursor-pointer"
          >
            Select all
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            type="button"
            onClick={deselectAll}
            className="text-xs font-semibold text-zinc-500 hover:text-zinc-700 px-4 py-2 rounded-lg hover:bg-zinc-100 transition-colors cursor-pointer"
          >
            Clear
          </motion.button>
        </div>
      </div>

      {/* Festival Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
        {festivalList.map((festival, idx) => {
          const isSelected = onboardingData.selectedFestivals.includes(festival.id)
          const isExpanded = expandedId === festival.id
          const emoji = getEmoji(festival.name)
          const selectedCats = festivalCategories[festival.id] ?? []

          return (
            <motion.div
              key={festival.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.02 }}
              className={`relative rounded-2xl border-2 transition-all ${
                isSelected
                  ? 'border-brand-500 bg-brand-50'
                  : 'border-zinc-200 bg-white hover:border-brand-300'
              }`}
            >
              {/* Checkmark Badge */}
              {isSelected && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute -top-2 -right-2 w-6 h-6 bg-emerald-500 rounded-full flex items-center justify-center shadow-md z-10"
                >
                  <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                </motion.div>
              )}

              {/* Main toggle button */}
              <button
                type="button"
                onClick={() => toggle(festival.id)}
                className="w-full p-4 flex flex-col items-center justify-center text-center min-h-24 group cursor-pointer"
              >
                <div className="text-3xl mb-2 group-hover:scale-110 transition-transform">
                  {emoji}
                </div>
                <h3 className="font-semibold text-zinc-900 text-sm">
                  {festival.name}
                </h3>
                <p className="text-xs text-zinc-600 mt-1">
                  {format(parseISO(festival.date), 'dd MMM')}
                </p>
                {festival.nameHindi && (
                  <p className="text-xs text-zinc-500 mt-1">
                    {festival.nameHindi}
                  </p>
                )}
              </button>

              {/* Category expander — only shown when festival is selected and categories exist */}
              {isSelected && productCategories.length > 0 && (
                <div className="border-t border-brand-200">
                  <button
                    type="button"
                    onClick={() => setExpandedId(isExpanded ? null : festival.id)}
                    className="w-full flex items-center justify-between px-3 py-2 text-xs font-medium text-brand-700 hover:bg-brand-100 transition-colors rounded-b-xl cursor-pointer"
                  >
                    <span>
                      {selectedCats.length > 0
                        ? `${selectedCats.length} categories`
                        : 'Add categories'}
                    </span>
                    <ChevronDown
                      className={`w-3.5 h-3.5 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                    />
                  </button>

                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <div className="p-2 flex flex-wrap gap-1.5">
                          {productCategories.map(cat => {
                            const active = selectedCats.includes(cat)
                            return (
                              <button
                                key={cat}
                                type="button"
                                onClick={() => toggleCategory(festival.id, cat)}
                                className={`text-xs px-2.5 py-1 rounded-full border transition-colors cursor-pointer ${
                                  active
                                    ? 'border-brand-500 bg-brand-500 text-white'
                                    : 'border-zinc-300 bg-white text-zinc-700 hover:border-brand-300'
                                }`}
                              >
                                {cat}
                              </button>
                            )
                          })}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}
            </motion.div>
          )
        })}
      </div>

      {/* Error Message */}
      {errors?.festivalError && (
        <p className="text-xs text-red-600 mt-2 flex items-center gap-1">
          <AlertCircle className="w-3 h-3" />
          {errors.festivalError}
        </p>
      )}

      {/* Info Box */}
      {onboardingData.selectedFestivals.length === 0 && !errors?.festivalError && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="bg-blue-50 border border-blue-200 rounded-2xl p-4 text-center"
        >
          <p className="text-sm text-blue-900">
            Select at least one festival to enable campaign automation
          </p>
        </motion.div>
      )}
    </div>
  )
}
