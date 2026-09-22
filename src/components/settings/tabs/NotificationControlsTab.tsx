import { Button } from '@/components/ui/Button'
import { Switch } from '@/components/ui/Switch'
import type { PrefsState } from './PostingPreferencesTab'

interface Props {
  prefs: PrefsState
  onChange: (p: PrefsState) => void
  isDirty: boolean
  isSaving: boolean
  onSave: () => void
  onCancel: () => void
}

const TIME_OPTIONS = Array.from({ length: 24 }, (_, h) => [
  `${String(h).padStart(2, '0')}:00`,
  `${String(h).padStart(2, '0')}:30`,
]).flat()

const NOTIFICATION_TOGGLES: { field: keyof PrefsState; label: string }[] = [
  { field: 'notifyOnPublish',          label: 'Post published'                    },
  { field: 'notifyOnHold',             label: 'Post held (low inventory)'         },
  { field: 'notifyOnAdPause',          label: 'Ad paused (high CPC)'              },
  { field: 'notifyOnWeeklyReport',     label: 'Weekly report ready'               },
  { field: 'notifyOnContentGenerated', label: 'Daily content generated (noisy)'   },
]

export function NotificationControlsTab({ prefs, onChange, isDirty, isSaving, onSave, onCancel }: Props) {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="font-display font-bold text-xl text-zinc-900 mb-1">Notifications</h2>
        <p className="text-sm text-zinc-500 mb-6">Choose when and how you get notified.</p>
        <div className="border-b border-surface-100 mb-6" />
      </div>

      {/* Push toggles */}
      <div className="space-y-2">
        <p className="text-xs font-medium text-zinc-600">Send push notification when:</p>
        <div className="space-y-2">
          {NOTIFICATION_TOGGLES.map(({ field, label }) => (
            <div key={field} className="flex items-center justify-between p-3 rounded-xl border border-surface-200 bg-surface-50">
              <p className="text-sm text-zinc-700">{label}</p>
              <Switch
                checked={prefs[field] as boolean}
                onCheckedChange={checked => onChange({ ...prefs, [field]: checked })}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Quiet Hours */}
      <div className="space-y-2">
        <p className="text-xs font-medium text-zinc-600">Quiet Hours</p>
        <p className="text-xs text-zinc-400">No notifications will be sent during this window.</p>
        <div className="flex items-center gap-3 mt-2">
          <select
            value={prefs.quietHoursStart}
            onChange={e => onChange({ ...prefs, quietHoursStart: e.target.value })}
            className="flex-1 px-3 py-2.5 text-sm border border-surface-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 min-h-11 cursor-pointer"
          >
            {TIME_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <span className="text-sm text-zinc-500">to</span>
          <select
            value={prefs.quietHoursEnd}
            onChange={e => onChange({ ...prefs, quietHoursEnd: e.target.value })}
            className="flex-1 px-3 py-2.5 text-sm border border-surface-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 min-h-11 cursor-pointer"
          >
            {TIME_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
      </div>

      {/* Email digest */}
      <div className="flex items-center justify-between p-3 rounded-xl border border-surface-200 bg-surface-50">
        <div>
          <p className="text-sm font-medium text-zinc-700">Weekly email report</p>
          <p className="text-xs text-zinc-400 mt-0.5">Receive a weekly summary to your shop email</p>
        </div>
        <Switch
          checked={prefs.emailDigest}
          onCheckedChange={checked => onChange({ ...prefs, emailDigest: checked })}
        />
      </div>

      {/* Save */}
      <div className="flex items-center gap-3 pt-2">
        <Button variant="primary" size="sm" loading={isSaving} disabled={!isDirty} onClick={onSave} className="min-h-11">
          Save Notification Settings
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
