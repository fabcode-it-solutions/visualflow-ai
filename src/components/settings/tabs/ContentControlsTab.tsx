import { useState } from 'react'
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

const DISCLAIMERS = [
  { key: 'skincare',     label: 'Skincare',    text: 'Results may vary'                    },
  { key: 'supplements',  label: 'Supplements', text: 'Not intended to diagnose or treat'   },
  { key: 'food',         label: 'Food',         text: 'Subject to availability'             },
  { key: 'electronics',  label: 'Electronics', text: 'Warranty terms apply'                },
] as const

export function ContentControlsTab({ prefs, onChange, isDirty, isSaving, onSave, onCancel }: Props) {
  const [hashtagInput, setHashtagInput] = useState('')
  const [bannedWordInput, setBannedWordInput] = useState('')

  const addHashtag = () => {
    const tag = hashtagInput.trim().startsWith('#') ? hashtagInput.trim() : `#${hashtagInput.trim()}`
    if (tag !== '#' && !prefs.hashtagBlacklist.includes(tag)) {
      onChange({ ...prefs, hashtagBlacklist: [...prefs.hashtagBlacklist, tag] })
    }
    setHashtagInput('')
  }

  const addBannedWord = () => {
    const word = bannedWordInput.trim().toLowerCase()
    if (word && !prefs.bannedWords.includes(word)) {
      onChange({ ...prefs, bannedWords: [...prefs.bannedWords, word] })
    }
    setBannedWordInput('')
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="font-display font-bold text-xl text-zinc-900 mb-1">Content Controls</h2>
        <p className="text-sm text-zinc-500 mb-6">Guard rails for AI-generated captions.</p>
        <div className="border-b border-surface-100 mb-6" />
      </div>

      {/* Banned Words */}
      <div className="space-y-2">
        <p className="text-xs font-medium text-zinc-600">Banned Words</p>
        <p className="text-xs text-zinc-400">AI will never use these words in captions.</p>
        <div className="flex gap-2 mt-2">
          <input
            type="text"
            placeholder="e.g. cheap, toxic"
            value={bannedWordInput}
            onChange={e => setBannedWordInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && bannedWordInput.trim()) { e.preventDefault(); addBannedWord() } }}
            className="flex-1 px-3 py-2.5 text-sm border border-surface-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 min-h-11"
          />
          <Button variant="secondary" size="sm" disabled={!bannedWordInput.trim()} onClick={addBannedWord} className="min-h-11">
            Add
          </Button>
        </div>
        {prefs.bannedWords.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {prefs.bannedWords.map(word => (
              <span key={word} className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-orange-50 text-orange-700 border border-orange-100">
                {word}
                <button type="button" onClick={() => onChange({ ...prefs, bannedWords: prefs.bannedWords.filter(w => w !== word) })} className="hover:text-orange-900 font-bold leading-none cursor-pointer">×</button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Hashtag Blacklist */}
      <div className="space-y-2">
        <p className="text-xs font-medium text-zinc-600">Hashtag Blacklist</p>
        <p className="text-xs text-zinc-400">These hashtags will never appear in your posts.</p>
        <div className="flex gap-2 mt-2">
          <input
            type="text"
            placeholder="#hashtag"
            value={hashtagInput}
            onChange={e => setHashtagInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && hashtagInput.trim()) { e.preventDefault(); addHashtag() } }}
            className="flex-1 px-3 py-2.5 text-sm border border-surface-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 min-h-11"
          />
          <Button variant="secondary" size="sm" disabled={!hashtagInput.trim()} onClick={addHashtag} className="min-h-11">
            Add
          </Button>
        </div>
        {prefs.hashtagBlacklist.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {prefs.hashtagBlacklist.map(tag => (
              <span key={tag} className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-red-50 text-red-700 border border-red-100">
                {tag}
                <button type="button" onClick={() => onChange({ ...prefs, hashtagBlacklist: prefs.hashtagBlacklist.filter(t => t !== tag) })} className="hover:text-red-900 font-bold leading-none cursor-pointer">×</button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Max emoji count */}
      <div className="space-y-2">
        <p className="text-xs font-medium text-zinc-600">Max emojis per caption</p>
        <div className="flex items-center gap-3">
          <button type="button" onClick={() => onChange({ ...prefs, maxEmojiCount: Math.max(0, prefs.maxEmojiCount - 1) })} className="h-11 w-11 rounded-lg border border-surface-300 text-zinc-600 hover:border-brand-400 text-lg font-bold flex items-center justify-center cursor-pointer">−</button>
          <span className="text-sm font-semibold text-zinc-900 min-w-8 text-center">{prefs.maxEmojiCount}</span>
          <button type="button" onClick={() => onChange({ ...prefs, maxEmojiCount: Math.min(20, prefs.maxEmojiCount + 1) })} className="h-11 w-11 rounded-lg border border-surface-300 text-zinc-600 hover:border-brand-400 text-lg font-bold flex items-center justify-center cursor-pointer">+</button>
        </div>
      </div>

      {/* Disclaimers */}
      <div className="space-y-2">
        <p className="text-xs font-medium text-zinc-600">Auto-append Disclaimers</p>
        <p className="text-xs text-zinc-400">Automatically added when product category matches.</p>
        <div className="space-y-2 mt-2">
          {DISCLAIMERS.map(({ key, label, text }) => {
            const enabled = key in prefs.requiredDisclaimers
            return (
              <div key={key} className="flex items-center justify-between p-3 rounded-xl border border-surface-200 bg-surface-50">
                <div>
                  <p className="text-sm font-medium text-zinc-700">{label}</p>
                  <p className="text-xs text-zinc-400 italic">"{text}"</p>
                </div>
                <Switch
                  checked={enabled}
                  onCheckedChange={checked => {
                    const next = { ...prefs.requiredDisclaimers }
                    if (checked) { next[key] = text } else { delete next[key] }
                    onChange({ ...prefs, requiredDisclaimers: next })
                  }}
                />
              </div>
            )
          })}
        </div>
      </div>

      {/* Save */}
      <div className="flex items-center gap-3 pt-2">
        <Button variant="primary" size="sm" loading={isSaving} disabled={!isDirty} onClick={onSave} className="min-h-11">
          Save Content Controls
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
