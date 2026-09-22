import { format, parseISO } from 'date-fns'
import { Button } from '@/components/ui/Button'
import type { Festival } from '@/types/brand.types'

const FESTIVAL_EMOJIS: Record<string, string> = {
  Diwali: '🪔', Holi: '🎨', Eid: '🌙', Christmas: '🎄',
  'New Year': '🎆', "Valentine's Day": '💝', 'Independence Day': '🇮🇳',
  'Republic Day': '🇮🇳', Navratri: '💃', 'Ganesh Chaturthi': '🐘',
  Dussehra: '🏹', Dhanteras: '💰', 'Raksha Bandhan': '🪢',
  Janmashtami: '🦚', Lohri: '🔥', Pongal: '🌾', Onam: '🌺',
  Baisakhi: '🌻', "Mother's Day": '💐', "Women's Day": '👩',
  'Black Friday': '🛍️', "Children's Day": '👦',
}

interface Props {
  festivals: Festival[]
  selectedFestivalIds: string[]
  isSaving: boolean
  onToggle: (id: string) => void
  onSave: () => void
}

export function FestivalSettingsTab({ festivals, selectedFestivalIds, isSaving, onToggle, onSave }: Props) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display font-bold text-xl text-zinc-900 mb-1">Festival Calendar</h2>
        <p className="text-sm text-zinc-500 mb-6">Auto-generate campaigns for selected Indian festivals.</p>
        <div className="border-b border-surface-100 mb-6" />
      </div>

      {festivals.length === 0 ? (
        <p className="text-sm text-zinc-400">No festivals found.</p>
      ) : (
        <>
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-zinc-400">{selectedFestivalIds.length} of {festivals.length} selected</p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {festivals.map(festival => {
              const isSelected = selectedFestivalIds.includes(festival.id)
              const emoji = FESTIVAL_EMOJIS[festival.name] ?? '🎉'
              return (
                <button
                  key={festival.id}
                  type="button"
                  onClick={() => onToggle(festival.id)}
                  className={`p-3 rounded-xl border-2 text-left transition-all min-h-11 cursor-pointer ${isSelected ? 'border-brand-500 bg-brand-50' : 'border-zinc-200 hover:border-brand-300 bg-white'}`}
                >
                  <span className="text-base">{emoji}</span>
                  <p className="text-xs font-medium text-zinc-700 mt-1 line-clamp-1">{festival.name}</p>
                  <p className="text-xs text-zinc-400">
                    {festival.date ? format(parseISO(festival.date), 'dd MMM') : ''}
                  </p>
                </button>
              )
            })}
          </div>

          <div className="pt-2">
            <Button variant="primary" size="sm" loading={isSaving} onClick={onSave} className="min-h-11">
              Save Festival Settings
            </Button>
          </div>
        </>
      )}
    </div>
  )
}
