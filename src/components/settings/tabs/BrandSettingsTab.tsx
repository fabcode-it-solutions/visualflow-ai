import { useCallback, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import { HexColorPicker, HexColorInput } from 'react-colorful'
import { Upload, X } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { brandService } from '@/services/brandService'
import { useToast } from '@/hooks/useToast'
import { TRUST_SIGNALS } from '@/utils/constants'

const BRAND_VOICES = [
  { emoji: '✨', name: 'Modern & Clean',         value: 'modern'      },
  { emoji: '🏛️', name: 'Traditional & Heritage', value: 'traditional' },
  { emoji: '💎', name: 'Luxury & Premium',        value: 'luxury'      },
  { emoji: '🎨', name: 'Playful & Fun',            value: 'playful'     },
  { emoji: '🌿', name: 'Earthy & Artisanal',       value: 'earthy'      },
  { emoji: '🎬', name: 'Bollywood Glam',            value: 'bollywood'   },
  { emoji: '⚡', name: 'Street/Urban',              value: 'urban'       },
]

const CONTENT_STYLES = [
  { emoji: '📸', name: 'Flat Lay',     value: 'flat-lay'     },
  { emoji: '🏃', name: 'Lifestyle',    value: 'lifestyle'    },
  { emoji: '🏢', name: 'Studio',       value: 'studio'       },
  { emoji: '🌳', name: 'Environmental',value: 'environmental'},
  { emoji: '🎲', name: 'Mixed',        value: 'mixed'        },
]

const BRAND_COLOR_KEYS = [
  { label: 'Primary',    key: 'primaryColor'    },
  { label: 'Secondary',  key: 'secondaryColor'  },
  { label: 'Accent',     key: 'accentColor'     },
  { label: 'Background', key: 'backgroundColor' },
] as const

const HEADING_FONTS = ['Plus Jakarta Sans','Poppins','Montserrat','Playfair Display','DM Serif Display']
const BODY_FONTS    = ['Inter','DM Sans','Nunito','Lato','Roboto']

export interface BrandState {
  logoUrl: string | undefined
  primaryColor: string
  secondaryColor: string
  accentColor: string
  backgroundColor: string
  headingFont: string
  bodyFont: string
  brandPersonality: string
  photoStyle: string
  referenceImages: string[]
  trustSignals: string[]
}

interface Props {
  brand: BrandState
  onChange: (b: BrandState) => void
  isDirty: boolean
  isSaving: boolean
  onSave: () => void
  onCancel: () => void
}

function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="space-y-1">
      <p className="text-xs font-medium text-zinc-600">{label}</p>
      <div className="relative">
        <button
          type="button"
          onClick={() => setOpen(o => !o)}
          className="flex items-center gap-2 px-3 py-2 border border-surface-300 rounded-lg w-full min-h-11 hover:border-brand-400 transition-colors cursor-pointer"
        >
          <span className="h-5 w-5 rounded border border-surface-200" style={{ background: value }} />
          <span className="text-sm font-mono text-zinc-700">{value}</span>
        </button>
        {open && (
          <div className="absolute z-20 mt-1 bg-white rounded-xl shadow-lg p-4 border border-surface-200">
            <HexColorPicker color={value} onChange={onChange} />
            <div className="flex items-center gap-2 mt-3">
              <span className="text-sm font-mono text-zinc-400 select-none">#</span>
              <HexColorInput
                color={value}
                onChange={onChange}
                prefixed={false}
                className="flex-1 text-sm font-mono uppercase tracking-widest text-zinc-800 border border-zinc-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent min-h-11 text-center"
                placeholder="155DFC"
              />
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="mt-3 w-full text-xs text-zinc-500 hover:text-zinc-700 py-1.5 cursor-pointer rounded-lg hover:bg-zinc-50 transition-colors"
            >
              Done
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export function BrandSettingsTab({ brand, onChange, isDirty, isSaving, onSave, onCancel }: Props) {
  const { showToast } = useToast()
  const [removingRefUrls, setRemovingRefUrls] = useState<Set<string>>(new Set())

  const { mutate: uploadLogo, isPending: isUploading } = {
    mutate: (file: File) => {
      brandService.uploadLogo(file)
        .then(logoUrl => { onChange({ ...brand, logoUrl }); showToast('Logo uploaded', 'success') })
        .catch(() => showToast('Failed to upload logo', 'error'))
    },
    isPending: false,
  }

  const onDrop = useCallback((files: File[]) => { if (files[0]) uploadLogo(files[0]) }, [brand, onChange])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': [] },
    maxFiles: 1,
  })

  return (
    <div className="space-y-8">
      <div>
        <h2 className="font-display font-bold text-xl text-zinc-900 mb-1">Brand Settings</h2>
        <p className="text-sm text-zinc-500 mb-6">Your visual identity used in all AI-generated content.</p>
        <div className="border-b border-surface-100 mb-6" />
      </div>

      {/* Logo */}
      <div className="space-y-4">
        <p className="text-xs font-medium text-zinc-600">Brand Logo</p>
        {brand.logoUrl ? (
          <div className="flex items-center gap-4 p-4 border-2 border-zinc-200 rounded-xl bg-zinc-50">
            <div className="w-20 h-20 rounded-xl border border-zinc-200 bg-white flex items-center justify-center shrink-0 overflow-hidden shadow-sm">
              <img src={brand.logoUrl} alt="Logo" className="w-full h-full object-contain p-2" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-zinc-800">Brand logo</p>
              <p className="text-xs text-zinc-500 mt-0.5">PNG or SVG recommended</p>
              <div className="flex gap-2 mt-3">
                <div {...getRootProps()}>
                  <input {...getInputProps()} />
                  <button type="button" className="text-xs font-medium text-brand-600 hover:text-brand-700 px-3 py-1.5 rounded-lg border border-brand-200 hover:bg-brand-50 transition-colors cursor-pointer">
                    {isUploading ? 'Uploading…' : 'Replace'}
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => onChange({ ...brand, logoUrl: undefined })}
                  className="text-xs font-medium text-red-500 hover:text-red-600 px-3 py-1.5 rounded-lg border border-red-100 hover:bg-red-50 transition-colors cursor-pointer"
                >
                  Remove
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-2 min-h-28 ${isDragActive ? 'border-brand-500 bg-brand-50' : 'border-zinc-200 hover:border-brand-400 hover:bg-zinc-50'}`}
          >
            <input {...getInputProps()} />
            <Upload className={`h-7 w-7 ${isUploading ? 'text-brand-500 animate-pulse' : 'text-zinc-400'}`} />
            <p className="text-sm font-medium text-zinc-700">{isUploading ? 'Uploading…' : 'Drop your logo here'}</p>
            <p className="text-xs text-zinc-400">or click to browse · PNG, SVG · Max 5MB</p>
          </div>
        )}
      </div>

      {/* Colors */}
      <div className="space-y-2">
        <p className="text-xs font-medium text-zinc-600">Brand Colors</p>
        <div className="grid grid-cols-2 gap-3">
          {BRAND_COLOR_KEYS.map(({ label, key }) => (
            <ColorField
              key={key}
              label={label}
              value={brand[key]}
              onChange={v => onChange({ ...brand, [key]: v })}
            />
          ))}
        </div>
      </div>

      {/* Fonts */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-medium text-zinc-600 block mb-1">Heading Font</label>
          <select
            value={brand.headingFont}
            onChange={e => onChange({ ...brand, headingFont: e.target.value })}
            className="w-full px-3 py-2.5 text-sm border border-surface-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 min-h-11 bg-white"
          >
            {HEADING_FONTS.map(f => <option key={f}>{f}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs font-medium text-zinc-600 block mb-1">Body Font</label>
          <select
            value={brand.bodyFont}
            onChange={e => onChange({ ...brand, bodyFont: e.target.value })}
            className="w-full px-3 py-2.5 text-sm border border-surface-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 min-h-11 bg-white"
          >
            {BODY_FONTS.map(f => <option key={f}>{f}</option>)}
          </select>
        </div>
      </div>

      {/* Brand Voice */}
      <div className="space-y-2">
        <p className="text-xs font-medium text-zinc-600">Brand Voice</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {BRAND_VOICES.map(v => (
            <button
              key={v.value}
              type="button"
              onClick={() => onChange({ ...brand, brandPersonality: v.value })}
              className={`p-3 rounded-xl border-2 text-left transition-all min-h-11 cursor-pointer ${brand.brandPersonality === v.value ? 'border-brand-500 bg-brand-50' : 'border-zinc-200 hover:border-brand-300'}`}
            >
              <span className="text-lg">{v.emoji}</span>
              <p className="text-xs font-medium text-zinc-700 mt-1">{v.name}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Content Style */}
      <div className="space-y-2">
        <p className="text-xs font-medium text-zinc-600">Content Style</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {CONTENT_STYLES.map(s => (
            <button
              key={s.value}
              type="button"
              onClick={() => onChange({ ...brand, photoStyle: s.value })}
              className={`p-3 rounded-xl border-2 text-left transition-all min-h-11 cursor-pointer ${brand.photoStyle === s.value ? 'border-brand-500 bg-brand-50' : 'border-zinc-200 hover:border-brand-300'}`}
            >
              <span className="text-lg">{s.emoji}</span>
              <p className="text-xs font-medium text-zinc-700 mt-1">{s.name}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Trust Signals */}
      <div className="space-y-2">
        <p className="text-xs font-medium text-zinc-600">Trust Signals</p>
        <p className="text-xs text-zinc-500">Naturally included in AI-generated captions.</p>
        <div className="grid grid-cols-1 gap-2.5 mt-2">
          {TRUST_SIGNALS.map(signal => {
            const isOn = brand.trustSignals.includes(signal.key)
            return (
              <div
                key={signal.key}
                role="button"
                tabIndex={0}
                onClick={() => onChange({
                  ...brand,
                  trustSignals: isOn
                    ? brand.trustSignals.filter(s => s !== signal.key)
                    : [...brand.trustSignals, signal.key],
                })}
                onKeyDown={e => {
                  if (e.key === ' ' || e.key === 'Enter') {
                    e.preventDefault()
                    onChange({
                      ...brand,
                      trustSignals: isOn
                        ? brand.trustSignals.filter(s => s !== signal.key)
                        : [...brand.trustSignals, signal.key],
                    })
                  }
                }}
                className={`group flex items-center gap-3.5 p-4 rounded-2xl border-2 cursor-pointer select-none transition-all duration-200 ${isOn ? 'border-brand-400 bg-linear-to-r from-brand-50 to-violet-50 shadow-sm' : 'border-zinc-100 bg-white hover:border-zinc-200 hover:bg-zinc-50/60'}`}
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0 transition-colors duration-200 ${isOn ? 'bg-brand-100' : 'bg-zinc-100 group-hover:bg-zinc-200'}`}>
                  {signal.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-semibold leading-tight transition-colors ${isOn ? 'text-brand-800' : 'text-zinc-800'}`}>{signal.label}</p>
                  <p className="text-xs text-zinc-400 mt-0.5 font-medium">{signal.labelHindi}</p>
                </div>
                <div className={`w-11 h-6 rounded-full shrink-0 flex items-center px-0.5 transition-colors duration-200 ${isOn ? 'bg-brand-600' : 'bg-zinc-200'}`}>
                  <div className={`w-5 h-5 rounded-full bg-white shadow-sm transition-transform duration-200 ${isOn ? 'translate-x-5' : 'translate-x-0'}`} />
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Reference Images */}
      <div className="space-y-2">
        <p className="text-xs font-medium text-zinc-600">Reference Images</p>
        {brand.referenceImages.length > 0 && (
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 mb-3">
            {brand.referenceImages.map(url => {
              const isRemoving = removingRefUrls.has(url)
              return (
                <div key={url} className="relative group aspect-square">
                  <img src={url} alt="Reference" className={`w-full h-full object-cover rounded-xl border border-surface-200 transition-opacity ${isRemoving ? 'opacity-40' : ''}`} />
                  {isRemoving ? (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-4 h-4 border-2 border-zinc-600 border-t-transparent rounded-full animate-spin" />
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={async () => {
                        setRemovingRefUrls(prev => new Set(prev).add(url))
                        try {
                          await brandService.removeReferenceImage(url)
                          onChange({ ...brand, referenceImages: brand.referenceImages.filter(u => u !== url) })
                        } catch {
                          showToast('Failed to remove image', 'error')
                        } finally {
                          setRemovingRefUrls(prev => { const n = new Set(prev); n.delete(url); return n })
                        }
                      }}
                      className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full hidden group-hover:flex items-center justify-center shadow cursor-pointer"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        )}
        <label className="flex flex-col items-center justify-center gap-1.5 border-2 border-dashed border-zinc-300 rounded-xl p-4 cursor-pointer hover:border-brand-400 transition-colors">
          <Upload className="w-5 h-5 text-zinc-400" />
          <span className="text-xs text-zinc-500 font-medium">Upload reference image</span>
          <span className="text-xs text-zinc-400">Your Instagram aesthetic / mood board</span>
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={async e => {
              const file = e.target.files?.[0]
              if (!file) return
              try {
                const url = await brandService.uploadReferenceImage(file)
                onChange({ ...brand, referenceImages: [...brand.referenceImages, url] })
              } catch {
                showToast('Failed to upload image', 'error')
              }
              e.target.value = ''
            }}
          />
        </label>
      </div>

      {/* Preview */}
      <div className="rounded-xl border border-surface-100 overflow-hidden">
        <p className="text-xs font-bold text-zinc-500 uppercase tracking-wide px-4 pt-3 pb-2">Your next posts will use these settings</p>
        <div className="mx-4 mb-4 rounded-xl overflow-hidden shadow-sm" style={{ background: brand.primaryColor }}>
          <div className="flex items-center justify-between px-4 pt-3 pb-2">
            {brand.logoUrl ? (
              <img src={brand.logoUrl} alt="Logo" className="h-7 w-auto object-contain opacity-90" />
            ) : (
              <span className="text-white/80 text-xs font-bold uppercase tracking-widest">Your Brand</span>
            )}
            <span className="text-xs font-bold px-3 py-1 rounded-full" style={{ background: brand.accentColor, color: '#fff' }}>Shop Now</span>
          </div>
          <div className="h-20 flex items-center justify-center">
            <div className="w-14 h-14 rounded-lg bg-white/20 flex items-center justify-center">
              <span className="text-2xl">🛍️</span>
            </div>
          </div>
          <div className="px-4 py-2 text-center text-xs font-semibold text-white/90" style={{ background: `${brand.primaryColor}cc` }}>
            {brand.brandPersonality ? brand.brandPersonality.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) : 'Modern & Clean'} · {brand.photoStyle || 'Lifestyle'} Photography
          </div>
        </div>
      </div>

      {/* Save */}
      <div className="flex items-center gap-3 pt-2">
        <Button variant="primary" size="sm" loading={isSaving} disabled={!isDirty} onClick={onSave} className="min-h-11">
          Save Brand Settings
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
