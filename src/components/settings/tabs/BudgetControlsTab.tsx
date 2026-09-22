import { Button } from '@/components/ui/Button'
import type { PrefsState } from './PostingPreferencesTab'

interface Props {
  prefs: PrefsState
  onChange: (p: PrefsState) => void
  isDirty: boolean
  isSaving: boolean
  onSave: () => void
  onCancel: () => void
}

export function BudgetControlsTab({ prefs, onChange, isDirty, isSaving, onSave, onCancel }: Props) {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="font-display font-bold text-xl text-zinc-900 mb-1">Budget & Billing</h2>
        <p className="text-sm text-zinc-500 mb-6">Set spending caps to keep ad costs under control.</p>
        <div className="border-b border-surface-100 mb-6" />
      </div>

      {/* Monthly cap */}
      <div className="space-y-2">
        <p className="text-xs font-medium text-zinc-600">Monthly ad budget cap</p>
        <p className="text-xs text-zinc-400">Ads pause automatically when this limit is reached.</p>
        <div className="relative mt-2">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 text-sm">₹</span>
          <input
            type="number"
            min="0"
            step="1000"
            placeholder="e.g. 30000"
            value={prefs.monthlyAdBudgetCap ?? ''}
            onChange={e => onChange({ ...prefs, monthlyAdBudgetCap: e.target.value ? Number(e.target.value) : null })}
            className="w-full pl-8 pr-3 py-2.5 text-sm border border-surface-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 min-h-11"
          />
        </div>
        {prefs.monthlyAdBudgetCap && (
          <p className="text-xs text-zinc-400">₹{prefs.monthlyAdBudgetCap.toLocaleString('en-IN')}/month maximum</p>
        )}
      </div>

      {/* Per-product limit */}
      <div className="space-y-2">
        <p className="text-xs font-medium text-zinc-600">Max spend per product</p>
        <p className="text-xs text-zinc-400">Maximum ad spend per product per month.</p>
        <div className="relative mt-2">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 text-sm">₹</span>
          <input
            type="number"
            min="0"
            step="500"
            placeholder="e.g. 5000"
            value={prefs.perProductAdLimit ?? ''}
            onChange={e => onChange({ ...prefs, perProductAdLimit: e.target.value ? Number(e.target.value) : null })}
            className="w-full pl-8 pr-3 py-2.5 text-sm border border-surface-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 min-h-11"
          />
        </div>
      </div>

      {/* Save */}
      <div className="flex items-center gap-3 pt-2">
        <Button variant="primary" size="sm" loading={isSaving} disabled={!isDirty} onClick={onSave} className="min-h-11">
          Save Budget Settings
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
