import { Button } from '@/components/ui/Button'
import { Switch } from '@/components/ui/Switch'

interface Props {
  isPaused: boolean
  isPausing: boolean
  isResetting: boolean
  onPauseToggle: () => void
  onResetOnboarding: () => void
}

export function DangerZoneTab({ isPaused, isPausing, isResetting, onPauseToggle, onResetOnboarding }: Props) {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="font-display font-bold text-xl text-red-600 mb-1">Danger Zone</h2>
        <p className="text-sm text-zinc-500 mb-6">Irreversible actions — proceed with caution.</p>
        <div className="border-b border-surface-100 mb-6" />
      </div>

      <div className="space-y-4">
        {/* Pause everything */}
        <div className="flex items-center justify-between p-4 bg-amber-50 border border-amber-200 rounded-xl">
          <div>
            <p className="text-sm font-medium text-zinc-700">Pause all publishing</p>
            <p className="text-xs text-zinc-500 mt-0.5">Stops all scheduled posts immediately</p>
          </div>
          <Switch checked={isPaused} onCheckedChange={onPauseToggle} disabled={isPausing} />
        </div>

        {/* Reset onboarding */}
        <div className="flex items-center justify-between p-4 bg-red-50 border border-red-200 rounded-xl">
          <div>
            <p className="text-sm font-medium text-zinc-700">Reset Onboarding</p>
            <p className="text-xs text-zinc-500 mt-0.5">Clears setup and restarts the onboarding flow</p>
          </div>
          <Button variant="danger" size="sm" loading={isResetting} onClick={onResetOnboarding} className="min-h-11">
            Reset
          </Button>
        </div>
      </div>
    </div>
  )
}
