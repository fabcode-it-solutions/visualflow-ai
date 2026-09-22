import { motion } from 'framer-motion'
import { AlertCircle, Sparkles } from 'lucide-react'
import { cn } from '@/utils/cn'
import { VALID_TIME_SLOTS } from '@/utils/constants'
import type { OnboardingData } from '../Onboarding'

interface Props {
  data: OnboardingData
  updateData: (updates: Partial<OnboardingData>) => void
  onToggleTime?: (time: string) => void
  errors?: Record<string, string>
}

const POST_COUNTS = [1, 2, 3] as const

const LANGUAGES = [
  { value: 'english', label: '🇬🇧 English', desc: 'English only' },
  { value: 'hindi', label: '🇮🇳 Hindi', desc: 'Hindi only' },
  { value: 'bilingual', label: '🌐 Bilingual', desc: 'English caption with Hindi hook, or vice versa' },
] as const

const TIME_SLOTS = VALID_TIME_SLOTS

export default function Step3Preferences({ data, updateData, onToggleTime, errors = {} }: Props) {
  return (
    <div className="space-y-8 md:space-y-10">
      {/* Header */}
      <div>
        <div className="text-4xl mb-3">⚙️</div>
        <h2 className="font-display font-bold text-2xl md:text-3xl text-zinc-900 mb-2">
          Configure your autopilot
        </h2>
        <p className="text-base text-zinc-600">
          Fine-tune how VisualFlow AI publishes and manages your content
        </p>
      </div>

      {/* Posts Per Day */}
      <div>
        <label className="text-sm font-semibold text-zinc-700 block mb-4">How many posts per day?</label>
        <div className="grid grid-cols-3 gap-3">
          {POST_COUNTS.map(n => (
            <motion.button
              key={n}
              type="button"
              onClick={() => updateData({ postsPerDay: n })}
              whileTap={{ scale: 0.97 }}
              className={`py-4 text-base font-semibold rounded-xl border-2 transition-all min-h-14 ${
                data.postsPerDay === n
                  ? 'bg-brand-600 text-white border-brand-600 shadow-md'
                  : 'bg-white text-zinc-700 border-zinc-200 hover:border-brand-300'
              }`}
            >
              {n}
            </motion.button>
          ))}
        </div>
      </div>

      {/* Preferred Posting Times */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <label className="text-sm font-semibold text-zinc-700">Preferred posting times</label>

          {/* Smart Timing Toggle */}
          <div className="flex items-center gap-2">
            <Sparkles className={`w-4 h-4 ${data.smartTiming ? 'text-brand-600' : 'text-zinc-400'}`} />
            <span className="text-xs font-medium text-zinc-600">Smart Timing</span>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={data.smartTiming}
                onChange={e => updateData({ smartTiming: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-10 h-5 bg-zinc-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-brand-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-brand-600" />
            </label>
          </div>
        </div>

        {data.smartTiming ? (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-start gap-3 bg-brand-50 border border-brand-200 rounded-2xl p-4"
          >
            <Sparkles className="w-5 h-5 text-brand-600 shrink-0 mt-0.5" />
            <p className="text-sm text-brand-700">
              AI will optimize posting times based on engagement. Times will shift automatically as your audience data grows.
            </p>
          </motion.div>
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
            {TIME_SLOTS.map(time => (
              <motion.button
                key={time}
                type="button"
                onClick={() => onToggleTime?.(time)}
                whileTap={{ scale: 0.95 }}
                className={cn(
                  'py-2.5 px-2 text-xs font-medium rounded-xl border-2 transition-all min-h-11 active:scale-95',
                  data.postingTimes.includes(time)
                    ? 'bg-brand-100 text-brand-700 border-brand-300'
                    : 'bg-white text-zinc-600 border-zinc-200 hover:border-brand-300'
                )}
              >
                {time}
              </motion.button>
            ))}
          </div>
        )}
        {errors?.postingTimes && !data.smartTiming && (
          <p className="text-xs text-red-600 mt-2 flex items-center gap-1">
            <AlertCircle className="w-3 h-3 shrink-0" />
            {errors.postingTimes}
          </p>
        )}
      </div>

      {/* Schedule Times */}
      <div>
        <label className="text-sm font-semibold text-zinc-700 block mb-4">Schedule times (IST)</label>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-zinc-500 block mb-2">AI content creation</label>
            <input
              type="time"
              value={data.contentGenerationTime}
              onChange={e => updateData({ contentGenerationTime: e.target.value })}
              className="w-full px-4 py-3 text-sm border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent min-h-12"
            />
          </div>
          <div>
            <label className="text-xs text-zinc-500 block mb-2">Daily notification</label>
            <input
              type="time"
              value={data.notificationTime}
              onChange={e => updateData({ notificationTime: e.target.value })}
              className="w-full px-4 py-3 text-sm border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent min-h-12"
            />
          </div>
        </div>
      </div>

      {/* Language */}
      <div>
        <label className="text-sm font-semibold text-zinc-700 block mb-4">Content language</label>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {LANGUAGES.map(l => (
            <motion.button
              key={l.value}
              type="button"
              onClick={() => updateData({ language: l.value })}
              whileTap={{ scale: 0.97 }}
              className={`p-4 rounded-xl border-2 text-left transition-all ${
                data.language === l.value
                  ? 'border-brand-500 bg-brand-50'
                  : 'border-zinc-200 bg-white hover:border-brand-300'
              }`}
            >
              <p className="font-semibold text-zinc-900 text-sm">{l.label}</p>
              <p className="text-xs text-zinc-600 mt-1">{l.desc}</p>
            </motion.button>
          ))}
        </div>
      </div>

      {/* Daily Budget */}
      <div>
        <label className="text-sm font-semibold text-zinc-700 block mb-4">
          Daily ad budget range
        </label>
        <div className="grid grid-cols-2 gap-4 mb-3">
          <div>
            <label className="text-xs font-medium text-zinc-600 block mb-2">Minimum daily ad spend (₹)</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 font-medium">₹</span>
              <input
                type="number"
                min={100}
                value={data.budgetMin}
                onChange={e => updateData({ budgetMin: parseInt(e.target.value) || 0 })}
                className="w-full pl-8 pr-4 py-3 text-sm border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent min-h-12"
              />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-zinc-600 block mb-2">Maximum daily ad spend (₹)</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 font-medium">₹</span>
              <input
                type="number"
                min={200}
                value={data.budgetMax}
                onChange={e => updateData({ budgetMax: parseInt(e.target.value) || 0 })}
                className="w-full pl-8 pr-4 py-3 text-sm border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent min-h-12"
              />
            </div>
          </div>
        </div>
        {errors?.budgetMin && (
          <p className="text-xs text-red-600 mt-2 flex items-center gap-1">
            <AlertCircle className="w-3 h-3" />
            {errors.budgetMin}
          </p>
        )}
        {errors?.budgetMax && (
          <p className="text-xs text-red-600 mt-2 flex items-center gap-1">
            <AlertCircle className="w-3 h-3" />
            {errors.budgetMax}
          </p>
        )}
        {!errors?.budgetMin && !errors?.budgetMax && (
          <p className="text-xs text-zinc-500">
            Recommended: ₹200 – ₹500 for most stores
          </p>
        )}
      </div>

      {/* Auto-Approve */}
      <div className="bg-zinc-50 border border-zinc-200 rounded-2xl p-6 md:p-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="font-semibold text-zinc-900">Auto-publish content</h3>
            <p className="text-sm text-zinc-600 mt-2">
              Skip manual approval. Content publishes automatically at scheduled times.
            </p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer shrink-0">
            <input
              type="checkbox"
              checked={data.autoApprove}
              onChange={e => updateData({ autoApprove: e.target.checked })}
              className="sr-only peer"
            />
            <div className="w-12 h-6 bg-zinc-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-brand-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-600" />
          </label>
        </div>
        {data.autoApprove && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4 flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl p-3"
          >
            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-700">
              Content will publish without your review. Make sure your brand guidelines are correct.
            </p>
          </motion.div>
        )}
      </div>

      {/* Inventory Threshold */}
      <div>
        <label className="text-sm font-semibold text-zinc-700 block mb-2">
          Hold posts if stock drops below
        </label>
        <p className="text-xs text-zinc-500 mb-4">
          AI won't post about products with fewer than this many units remaining
        </p>
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => updateData({ inventoryThreshold: Math.max(1, data.inventoryThreshold - 1) })}
            className="h-11 w-11 rounded-xl border-2 border-zinc-200 text-zinc-600 hover:border-brand-400 text-xl font-bold flex items-center justify-center transition-colors"
          >
            −
          </button>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-bold text-zinc-900 min-w-8 text-center tabular-nums">
              {data.inventoryThreshold}
            </span>
            <span className="text-sm text-zinc-500">units</span>
          </div>
          <button
            type="button"
            onClick={() => updateData({ inventoryThreshold: Math.min(100, data.inventoryThreshold + 1) })}
            className="h-11 w-11 rounded-xl border-2 border-zinc-200 text-zinc-600 hover:border-brand-400 text-xl font-bold flex items-center justify-center transition-colors"
          >
            +
          </button>
        </div>
      </div>
    </div>
  )
}
