import { Sparkles } from 'lucide-react'
import { format, parseISO, differenceInDays } from 'date-fns'
import { Button } from '@/components/ui/Button'
import { Switch } from '@/components/ui/Switch'
import { VALID_TIME_SLOTS } from '@/utils/constants'

const POST_COUNTS = [1, 2, 3] as const
const TIME_SLOTS = VALID_TIME_SLOTS
const LANGUAGES = [
  { value: 'english',   label: '🇬🇧 English'   },
  { value: 'hindi',     label: '🇮🇳 Hindi'      },
  { value: 'bilingual', label: '🌐 Bilingual'   },
] as const

const RECALIBRATION_INTERVAL_DAYS = 14
const MIN_POSTS_REQUIRED = 5

function SmartTimingStatus({ lastCalibrated, optimizedTimes }: { lastCalibrated: string | null; optimizedTimes: string[] | null }) {
  const now = new Date()
  if (lastCalibrated && optimizedTimes?.length) {
    const calibratedDate = parseISO(lastCalibrated)
    const daysSince = differenceInDays(now, calibratedDate)
    const daysUntilNext = Math.max(0, RECALIBRATION_INTERVAL_DAYS - daysSince)
    return (
      <div className="bg-gradient-to-r from-brand-50 to-purple-50 border border-brand-200 rounded-xl p-3 space-y-2">
        <div className="flex items-start gap-2.5">
          <Sparkles className="w-4 h-4 text-brand-600 mt-0.5 shrink-0" />
          <div className="flex-1">
            <p className="text-xs font-semibold text-brand-900">Smart timing is active</p>
            <p className="text-xs text-brand-700 mt-0.5">Current optimized times: <span className="font-semibold">{optimizedTimes.join(', ')}</span></p>
          </div>
        </div>
        <div className="flex items-center gap-4 pt-1 border-t border-brand-100 text-xs text-brand-600">
          <span>Last calibrated: {format(calibratedDate, 'd MMM')}</span>
          <span>·</span>
          <span>Next recalibration in: {daysUntilNext} day{daysUntilNext !== 1 ? 's' : ''}</span>
        </div>
      </div>
    )
  }
  return (
    <div className="bg-gradient-to-r from-brand-50 to-purple-50 border border-brand-200 rounded-xl p-3">
      <div className="flex items-start gap-2.5">
        <Sparkles className="w-4 h-4 text-brand-600 mt-0.5 shrink-0" />
        <div className="flex-1">
          <p className="text-xs font-semibold text-brand-900">Collecting engagement data…</p>
          <p className="text-xs text-brand-700 mt-0.5">Smart timing activates after {MIN_POSTS_REQUIRED} posts.</p>
        </div>
      </div>
    </div>
  )
}

export interface PrefsState {
  postsPerDay: 1 | 2 | 3
  postingTimes: string[]
  language: string
  budgetMin: number
  budgetMax: number
  autoApprove: boolean
  inventoryThreshold: number
  smartTiming: boolean
  smartTimingLastCalibrated: string | null
  smartTimingPostingTimes: string[] | null
  contentGenerationTime: string
  notificationTime: string
  hashtagBlacklist: string[]
  bannedWords: string[]
  maxEmojiCount: number
  requiredDisclaimers: Record<string, string>
  quietHoursStart: string
  quietHoursEnd: string
  monthlyAdBudgetCap: number | null
  perProductAdLimit: number | null
  notifyOnPublish: boolean
  notifyOnHold: boolean
  notifyOnAdPause: boolean
  notifyOnWeeklyReport: boolean
  notifyOnContentGenerated: boolean
  emailDigest: boolean
}

interface Props {
  prefs: PrefsState
  onChange: (p: PrefsState) => void
  isDirty: boolean
  isSaving: boolean
  onSave: () => void
  onCancel: () => void
}

export function PostingPreferencesTab({ prefs, onChange, isDirty, isSaving, onSave, onCancel }: Props) {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="font-display font-bold text-xl text-zinc-900 mb-1">Posting Preferences</h2>
        <p className="text-sm text-zinc-500 mb-6">Control how and when your content gets posted.</p>
        <div className="border-b border-surface-100 mb-6" />
      </div>

      {/* Posts per day */}
      <div className="space-y-2">
        <p className="text-xs font-medium text-zinc-600">Posts per day</p>
        <div className="grid grid-cols-3 gap-2">
          {POST_COUNTS.map(n => (
            <button
              key={n}
              type="button"
              onClick={() => onChange({ ...prefs, postsPerDay: n })}
              className={`py-3 text-sm font-semibold rounded-xl border-2 transition-all min-h-11 cursor-pointer ${prefs.postsPerDay === n ? 'bg-brand-600 text-white border-brand-600' : 'bg-white text-zinc-700 border-zinc-200 hover:border-brand-300'}`}
            >
              {n}
            </button>
          ))}
        </div>
      </div>

      {/* Posting times */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium text-zinc-600">Preferred posting times</p>
          <button
            type="button"
            onClick={() => onChange({ ...prefs, smartTiming: !prefs.smartTiming })}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all border cursor-pointer ${prefs.smartTiming ? 'bg-brand-600 text-white border-brand-600' : 'bg-white text-zinc-600 border-zinc-200 hover:border-brand-300'}`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            Smart Timing
          </button>
        </div>
        {prefs.smartTiming ? (
          <SmartTimingStatus lastCalibrated={prefs.smartTimingLastCalibrated} optimizedTimes={prefs.smartTimingPostingTimes} />
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {TIME_SLOTS.map(time => (
              <button
                key={time}
                type="button"
                onClick={() => onChange({
                  ...prefs,
                  postingTimes: prefs.postingTimes.includes(time)
                    ? prefs.postingTimes.filter(t => t !== time)
                    : [...prefs.postingTimes, time],
                })}
                className={`py-2.5 text-xs font-medium rounded-xl border-2 transition-all min-h-11 cursor-pointer ${prefs.postingTimes.includes(time) ? 'bg-brand-100 text-brand-700 border-brand-300' : 'bg-white text-zinc-600 border-zinc-200 hover:border-brand-300'}`}
              >
                {time}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Language */}
      <div className="space-y-2">
        <p className="text-xs font-medium text-zinc-600">Content language</p>
        <div className="grid grid-cols-3 gap-2">
          {LANGUAGES.map(l => (
            <button
              key={l.value}
              type="button"
              onClick={() => onChange({ ...prefs, language: l.value })}
              className={`py-3 text-xs font-medium rounded-xl border-2 transition-all min-h-11 cursor-pointer ${prefs.language === l.value ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-zinc-200 hover:border-brand-300 text-zinc-600'}`}
            >
              {l.label}
            </button>
          ))}
        </div>
      </div>

      {/* Budget */}
      <div className="space-y-2">
        <p className="text-xs font-medium text-zinc-600">Daily ad budget (₹)</p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-zinc-500 block mb-1">Min</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 text-sm">₹</span>
              <input
                type="number"
                value={prefs.budgetMin}
                min={0}
                onChange={e => onChange({ ...prefs, budgetMin: parseInt(e.target.value) || 0 })}
                className="w-full pl-7 pr-3 py-2.5 text-sm border border-surface-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 min-h-11"
              />
            </div>
          </div>
          <div>
            <label className="text-xs text-zinc-500 block mb-1">Max</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 text-sm">₹</span>
              <input
                type="number"
                value={prefs.budgetMax}
                min={0}
                onChange={e => onChange({ ...prefs, budgetMax: parseInt(e.target.value) || 0 })}
                className="w-full pl-7 pr-3 py-2.5 text-sm border border-surface-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 min-h-11"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Auto-approve */}
      <Switch
        checked={prefs.autoApprove}
        onCheckedChange={v => onChange({ ...prefs, autoApprove: v })}
        label="Auto-publish without manual approval"
      />

      {/* Schedule times */}
      <div className="space-y-2">
        <p className="text-xs font-medium text-zinc-600">Schedule times (IST)</p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-zinc-500 block mb-1">AI content creation</label>
            <input
              type="time"
              value={prefs.contentGenerationTime}
              onChange={e => onChange({ ...prefs, contentGenerationTime: e.target.value })}
              className="w-full px-3 py-2.5 text-sm border border-surface-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 min-h-11"
            />
          </div>
          <div>
            <label className="text-xs text-zinc-500 block mb-1">Daily notification</label>
            <input
              type="time"
              value={prefs.notificationTime}
              onChange={e => onChange({ ...prefs, notificationTime: e.target.value })}
              className="w-full px-3 py-2.5 text-sm border border-surface-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 min-h-11"
            />
          </div>
        </div>
      </div>

      {/* Inventory threshold */}
      <div className="space-y-2">
        <p className="text-xs font-medium text-zinc-600">Pause posting when stock below</p>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => onChange({ ...prefs, inventoryThreshold: Math.max(0, prefs.inventoryThreshold - 1) })}
            className="h-11 w-11 rounded-lg border border-surface-300 text-zinc-600 hover:border-brand-400 text-lg font-bold flex items-center justify-center cursor-pointer"
          >
            −
          </button>
          <span className="text-sm font-semibold text-zinc-900 min-w-8 text-center">{prefs.inventoryThreshold}</span>
          <button
            type="button"
            onClick={() => onChange({ ...prefs, inventoryThreshold: prefs.inventoryThreshold + 1 })}
            className="h-11 w-11 rounded-lg border border-surface-300 text-zinc-600 hover:border-brand-400 text-lg font-bold flex items-center justify-center cursor-pointer"
          >
            +
          </button>
          <span className="text-xs text-zinc-500">units</span>
        </div>
      </div>

      {/* Save */}
      <div className="flex items-center gap-3 pt-2">
        <Button variant="primary" size="sm" loading={isSaving} disabled={!isDirty} onClick={onSave} className="min-h-11">
          Save Preferences
        </Button>
        {isDirty && (
          <button type="button" onClick={onCancel} className="text-sm text-zinc-500 hover:text-zinc-700 transition-colors cursor-pointer">
            Cancel
          </button>
        )}
      </div>
    </div>
  )
}
