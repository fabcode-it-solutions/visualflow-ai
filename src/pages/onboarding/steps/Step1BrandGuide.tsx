import { useCallback, useEffect, useRef, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import { HexColorPicker, HexColorInput } from 'react-colorful'
import {
  Upload, X, AlertCircle, Image as ImageIcon,
  Globe, RefreshCw, Sparkles, CheckCircle2,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { brandService } from '@/services/brandService'
import api from '@/services/api'
import { useToast } from '@/hooks/useToast'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import type { OnboardingData } from '../Onboarding'

// ─── Types ────────────────────────────────────────────────────────

type Step1Phase = 'url_input' | 'crawling' | 'review' | 'manual'

interface ExtractedBrand {
  brandName?: string
  logoUrl?: string
  primaryColor?: string
  secondaryColor?: string
  accentColor?: string
  backgroundColor?: string
  headingFont?: string
  bodyFont?: string
  brandPersonality?: string
  photoStyle?: string
  voiceLanguage?: string
  referenceImageUrls?: string[]
}

interface CrawlStatusData {
  status: 'pending' | 'crawling' | 'extracting' | 'uploading' | 'completed' | 'failed'
  progress: number
  progressMessage: string
  result?: { extracted: ExtractedBrand }
  error?: string
}

interface Props {
  data: OnboardingData
  updateData: (updates: Partial<OnboardingData>) => void
  onLogoFileChange?: (file: File | undefined) => void
  onUploadingChange?: (uploading: boolean) => void
  onCanProceedChange?: (canProceed: boolean) => void
  errors?: {
    brandPersonality?: string
    photoStyle?: string
  }
}

// ─── Constants ────────────────────────────────────────────────────

const TRUST_SIGNAL_OPTIONS = [
  { key: 'cod',             icon: '💳', label: 'COD Available',             desc: 'Cash on Delivery accepted' },
  { key: 'free_delivery',   icon: '🚚', label: 'Free Delivery Across India', desc: 'No delivery charges' },
  { key: 'easy_returns',    icon: '↩️', label: 'Easy 7-Day Returns',         desc: 'Hassle-free return policy' },
  { key: 'made_in_india',   icon: '🇮🇳', label: 'Made in India',             desc: 'Proudly manufactured locally' },
  { key: 'authentic',       icon: '✅', label: '100% Authentic',             desc: 'Guaranteed genuine product' },
  { key: 'premium_quality', icon: '⭐', label: 'Premium Quality Guaranteed', desc: 'Highest craftsmanship standards' },
]

const BRAND_VOICES = [
  { emoji: '✨', name: 'Modern & Clean',        desc: 'Minimal, fresh, contemporary',   value: 'modern',
    colors: { primaryColor: '#ffffff', secondaryColor: '#f4f4f5', accentColor: '#18181b', backgroundColor: '#6d28d9' } },
  { emoji: '🏛️', name: 'Traditional & Heritage', desc: 'Classic, rooted, trusted',       value: 'traditional',
    colors: { primaryColor: '#7c2d12', secondaryColor: '#92400e', accentColor: '#fbbf24', backgroundColor: '#fef3c7' } },
  { emoji: '💎', name: 'Luxury & Premium',       desc: 'Sophisticated, aspirational',    value: 'luxury',
    colors: { primaryColor: '#1c1917', secondaryColor: '#292524', accentColor: '#d4af37', backgroundColor: '#f5f5f4' } },
  { emoji: '🎨', name: 'Playful & Fun',          desc: 'Cheerful, youthful, energetic',  value: 'playful',
    colors: { primaryColor: '#ec4899', secondaryColor: '#8b5cf6', accentColor: '#f59e0b', backgroundColor: '#ffffff' } },
  { emoji: '🌿', name: 'Earthy & Artisanal',     desc: 'Natural, handcrafted, warm',     value: 'earthy',
    colors: { primaryColor: '#78350f', secondaryColor: '#a16207', accentColor: '#4d7c0f', backgroundColor: '#fef9c3' } },
  { emoji: '🎬', name: 'Bollywood Glam',         desc: 'Bold, dramatic, vibrant',        value: 'bollywood',
    colors: { primaryColor: '#7c3aed', secondaryColor: '#db2777', accentColor: '#f59e0b', backgroundColor: '#1e1b4b' } },
  { emoji: '⚡', name: 'Street/Urban',           desc: 'Raw, energetic, street-smart',   value: 'urban',
    colors: { primaryColor: '#111827', secondaryColor: '#374151', accentColor: '#ef4444', backgroundColor: '#f9fafb' } },
]

const CONTENT_STYLES = [
  { emoji: '📸', name: 'Flat Lay',     desc: 'Product focused, top-down',    value: 'flat-lay' },
  { emoji: '🏃', name: 'Lifestyle',    desc: 'People in action',             value: 'lifestyle' },
  { emoji: '🏢', name: 'Studio',       desc: 'Controlled, clean backdrop',   value: 'studio' },
  { emoji: '🌳', name: 'Environmental',desc: 'Natural, outdoor settings',    value: 'environmental' },
  { emoji: '🎲', name: 'Mixed',        desc: 'Variety of styles',            value: 'mixed' },
]

const BRAND_COLORS = [
  { label: 'Primary',    key: 'primaryColor' },
  { label: 'Secondary',  key: 'secondaryColor' },
  { label: 'Accent',     key: 'accentColor' },
  { label: 'Background', key: 'backgroundColor' },
]

const GOOGLE_FONTS = [
  'Inter', 'Plus Jakarta Sans', 'Poppins', 'Nunito',
  'Montserrat', 'Playfair Display', 'DM Sans',
  'Lato', 'Raleway', 'Oswald',
]

// Steps must match backend progress milestones in crawlQueue.ts:
// 10 → fetching, 40 → analyzing, 60 → uploading, 90 → finalizing, 100 → done
const CRAWL_STEPS = [
  { label: 'Fetching website pages',    threshold: 10 },
  { label: 'Analyzing brand identity',  threshold: 40 },
  { label: 'Uploading images',          threshold: 60 },
  { label: 'Finalizing brand profile',  threshold: 90 },
]

function getCrawlActiveStep(progress: number): number {
  if (progress >= 90) return 3
  if (progress >= 60) return 2
  if (progress >= 40) return 1
  return 0
}

function getCrawlStepLabel(progress: number): string {
  if (progress >= 100) return 'Done!'
  const step = getCrawlActiveStep(progress)
  return CRAWL_STEPS[step]?.label ?? 'Processing...'
}

const CRAWL_ERROR_MESSAGES: Record<string, string> = {
  'Website blocked our crawler':        'This website blocked our crawler. Try entering the URL manually.',
  'Crawl failed':                       'We couldn\'t read that website. Please check the URL and try again.',
  'timeout':                            'The website took too long to respond. Please try again.',
  'rate limit':                         'Too many requests. Please wait a moment and try again.',
  'invalid url':                        'That doesn\'t look like a valid URL. Please check and try again.',
  'network':                            'Network error while crawling. Please check your connection.',
}

function humanReadableCrawlError(raw?: string): string {
  if (!raw) return 'Something went wrong. Please try again.'
  const lower = raw.toLowerCase()
  for (const [key, msg] of Object.entries(CRAWL_ERROR_MESSAGES)) {
    if (lower.includes(key.toLowerCase())) return msg
  }
  return 'We couldn\'t extract your brand. Please try again or set up manually.'
}

// ─── Component ────────────────────────────────────────────────────

export default function Step1BrandGuide({
  data,
  updateData,
  onLogoFileChange,
  onUploadingChange,
  onCanProceedChange,
  errors = {},
}: Props) {
  // Phase state — start at url_input; jump to review if parent already has brand data
  const [phase, setPhase] = useState<Step1Phase>('url_input')
  const dataHydrated = useRef(false)

  const [websiteUrl, setWebsiteUrl] = useState(data.websiteUrl ?? '')
  const [crawlJobId, setCrawlJobId] = useState<string | null>(null)
  const [crawlProgress, setCrawlProgress] = useState(0)
  const [regenerateContext, setRegenerateContext] = useState('')
  const [showRegenerateInput, setShowRegenerateInput] = useState(false)
  const [urlError, setUrlError] = useState<string | null>(null)
  // Persistent, dismissible crawl-failure banner shown on the url_input screen —
  // replaces transient toasts so merchants can read the reason without rushing.
  const [crawlError, setCrawlError] = useState<string | null>(null)

  // Existing field state
  const [activeColorPicker, setActiveColorPicker] = useState<number | null>(null)
  const [uploadingRefs, setUploadingRefs] = useState(0)
  const [removingUrls, setRemovingUrls] = useState<Set<string>>(new Set())
  const [refUploadError, setRefUploadError] = useState<string | null>(null)
  const isCustomVoice = data.brandPersonality !== '' && !BRAND_VOICES.some(v => v.value === data.brandPersonality)
  const [showCustomInput, setShowCustomInput] = useState(isCustomVoice)

  const pollInterval = useRef<ReturnType<typeof setInterval> | null>(null)
  const { showToast } = useToast()

  // Cleanup polling on unmount
  useEffect(() => () => stopPolling(), [])

  // When parent hydrates from server (returning user), jump to review if brand data exists.
  // Must only run once — after first evaluation lock it so later updateData() calls don't re-trigger.
  useEffect(() => {
    if (dataHydrated.current) return
    dataHydrated.current = true // lock immediately — never run again after first evaluation
    const hasBrandData = !!(data.brandPersonality || data.photoStyle || data.logoUrl || data.websiteUrl)
    if (hasBrandData) {
      if (data.websiteUrl) setWebsiteUrl(data.websiteUrl)
      setPhase('review')
    }
  }, [data.brandPersonality, data.photoStyle, data.logoUrl, data.websiteUrl])

  // Notify parent whenever phase changes
  useEffect(() => {
    onCanProceedChange?.(phase === 'review' || phase === 'manual')
  }, [phase, onCanProceedChange])

  // ─── Polling ────────────────────────────────────────────────────

  const stopPolling = () => {
    if (pollInterval.current) {
      clearInterval(pollInterval.current)
      pollInterval.current = null
    }
  }

  const pollCrawlProgress = useCallback((jobId: string) => {
    stopPolling()

    const timeoutId = setTimeout(() => {
      stopPolling()
      setCrawlError('This is taking longer than expected. Please try again — if it keeps happening, set up manually.')
      setPhase('url_input')
    }, 3 * 60 * 1000)

    pollInterval.current = setInterval(async () => {
      try {
        const res = await api.get<{ data: CrawlStatusData }>(`/crawl/${jobId}/status`)
        const { status, progress, result, error } = res.data.data ?? res.data as unknown as CrawlStatusData

        setCrawlProgress(progress ?? 0)

        if (status === 'completed' && result) {
          stopPolling()
          clearTimeout(timeoutId)
          await populateFromCrawl(result.extracted)
          setPhase('review')
        } else if (status === 'failed') {
          stopPolling()
          clearTimeout(timeoutId)
          // Backend already returns a classified, human-readable message
          // (see utils/crawlError.ts). Show it directly; only fall back to the
          // local mapper if the backend sent nothing.
          setCrawlError(error || humanReadableCrawlError(error))
          setPhase('url_input')
        }
      } catch {
        stopPolling()
        clearTimeout(timeoutId)
        setCrawlError('Lost connection while crawling. Please check your internet and try again.')
        setPhase('url_input')
      }
    }, 2000)
  }, [showToast]) // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Crawl actions ──────────────────────────────────────────────

  const handleStartCrawl = useCallback(async () => {
    // Fall back to saved websiteUrl from parent data (returning users after reset)
    const trimmed = (websiteUrl || data.websiteUrl || '').trim()
    if (!trimmed) {
      // No URL available — go back to url_input so user can enter it
      setPhase('url_input')
      setUrlError('Please enter your website URL')
      return
    }
    if (websiteUrl !== trimmed) setWebsiteUrl(trimmed)
    setUrlError(null)
    setCrawlError(null)

    setPhase('crawling')
    setCrawlProgress(0)

    // Save URL to parent state and persist immediately to DB
    // so it survives a refresh before the user clicks Next
    updateData({ websiteUrl: trimmed })
    api.patch('/brand', { websiteUrl: trimmed }).catch(() => {})

    try {
      const res = await api.post<{ data: { crawlJobId: string } }>('/crawl/start', { url: trimmed })
      const jobId = (res.data.data ?? res.data as unknown as { crawlJobId: string }).crawlJobId
      setCrawlJobId(jobId)
      pollCrawlProgress(jobId)
    } catch {
      setCrawlError('Failed to start. Please try again.')
      setPhase('url_input')
    }
  }, [websiteUrl, updateData, pollCrawlProgress])

  const handleRegenerate = useCallback(async () => {
    setShowRegenerateInput(false)
    setPhase('crawling')
    setCrawlProgress(0)

    // No crawlJobId in this session (returning user after reset) — start a fresh crawl.
    // The regenerate context can't be applied without an existing job, so we re-crawl.
    if (!crawlJobId) {
      const url = (websiteUrl || data.websiteUrl || '').trim()
      if (!url) {
        // No URL saved — send user back to enter it
        setPhase('url_input')
        setUrlError('Please enter your website URL')
        return
      }
      try {
        const res = await api.post<{ data: { crawlJobId: string } }>('/crawl/start', { url })
        const jobId = (res.data.data ?? res.data as unknown as { crawlJobId: string }).crawlJobId
        setCrawlJobId(jobId)
        pollCrawlProgress(jobId)
      } catch {
        setPhase('review')
        showToast('Failed to start crawl. Please try again.', 'error')
      }
      return
    }

    try {
      const res = await api.post<{ data: { crawlJobId: string } }>(`/crawl/${crawlJobId}/regenerate`, {
        context: regenerateContext,
        currentData: data,
      })
      const newId = (res.data.data ?? res.data as unknown as { crawlJobId: string }).crawlJobId
      setCrawlJobId(newId)
      pollCrawlProgress(newId)
    } catch {
      setPhase('review')
      showToast('Regeneration failed. Please try again.', 'error')
    }
  }, [crawlJobId, regenerateContext, data, websiteUrl, pollCrawlProgress, showToast])

  const populateFromCrawl = useCallback(async (extracted: ExtractedBrand) => {
    const updates = {
      brandName: extracted.brandName ?? data.brandName,
      logoUrl: extracted.logoUrl ?? data.logoUrl,
      primaryColor: extracted.primaryColor ?? data.primaryColor,
      secondaryColor: extracted.secondaryColor ?? data.secondaryColor,
      accentColor: extracted.accentColor ?? data.accentColor,
      backgroundColor: extracted.backgroundColor ?? data.backgroundColor,
      headingFont: extracted.headingFont ?? data.headingFont,
      bodyFont: extracted.bodyFont ?? data.bodyFont,
      brandPersonality: extracted.brandPersonality ?? data.brandPersonality,
      photoStyle: extracted.photoStyle ?? data.photoStyle,
      voiceLanguage: extracted.voiceLanguage ?? data.voiceLanguage,
      referenceImages: extracted.referenceImageUrls?.length
        ? extracted.referenceImageUrls
        : data.referenceImages,
    }

    // Update local state immediately so UI reflects changes
    updateData(updates)

    // Persist to backend so data survives a page refresh
    try {
      await api.patch('/brand', {
        brandName: updates.brandName,
        logoUrl: updates.logoUrl,
        primaryColor: updates.primaryColor,
        secondaryColor: updates.secondaryColor,
        accentColor: updates.accentColor,
        backgroundColor: updates.backgroundColor,
        headingFont: updates.headingFont,
        bodyFont: updates.bodyFont,
        brandPersonality: updates.brandPersonality,
        photoStyle: updates.photoStyle,
        voiceLanguage: updates.voiceLanguage,
        referenceImages: updates.referenceImages,
      })
    } catch {
      // Non-fatal — data is still in local state, user can proceed and it'll save on Next
    }
  }, [data, updateData])

  // ─── Logo dropzone ───────────────────────────────────────────────

  const onLogoDrop = useCallback((files: File[]) => {
    const file = files[0]
    if (file) {
      updateData({ logoUrl: URL.createObjectURL(file) })
      onLogoFileChange?.(file)
    }
  }, [updateData, onLogoFileChange])

  const { getRootProps: getLogoRootProps, getInputProps: getLogoInputProps, isDragActive: isLogoDragActive } = useDropzone({
    onDrop: onLogoDrop,
    accept: { 'image/*': [] },
    maxFiles: 1,
  })

  // ─── Reference images dropzone ───────────────────────────────────

  const onRefDrop = useCallback(async (files: File[]) => {
    const available = 10 - data.referenceImages.length
    const toUpload = files.slice(0, available)
    if (toUpload.length === 0) { setRefUploadError('Maximum 10 reference images allowed'); return }
    setRefUploadError(null)
    setUploadingRefs(prev => { const n = prev + toUpload.length; onUploadingChange?.(n > 0); return n })
    const uploaded: string[] = []
    for (const file of toUpload) {
      try {
        uploaded.push(await brandService.uploadReferenceImage(file))
      } catch (err: unknown) {
        setRefUploadError(err instanceof Error ? err.message : 'Failed to upload one or more images — please try again')
      }
    }
    setUploadingRefs(prev => { const n = prev - toUpload.length; onUploadingChange?.(n > 0); return n })
    if (uploaded.length > 0) updateData({ referenceImages: [...data.referenceImages, ...uploaded] })
  }, [data.referenceImages, updateData, onUploadingChange])

  const { getRootProps: getRefRootProps, getInputProps: getRefInputProps, isDragActive: isRefDragActive } = useDropzone({
    onDrop: onRefDrop,
    accept: { 'image/*': [] },
    maxFiles: 10,
    disabled: data.referenceImages.length >= 10,
  })

  const removeRefImage = useCallback(async (url: string) => {
    setRemovingUrls(prev => new Set(prev).add(url))
    try {
      await brandService.removeReferenceImage(url)
      updateData({ referenceImages: data.referenceImages.filter(u => u !== url) })
    } catch {
      // Image stays in list — user can retry
    } finally {
      setRemovingUrls(prev => { const next = new Set(prev); next.delete(url); return next })
    }
  }, [data.referenceImages, updateData])

  // ─── Voice / style handlers ──────────────────────────────────────

  const handleVoiceSelect = useCallback((value: string) => {
    setShowCustomInput(false)
    const preset = BRAND_VOICES.find(v => v.value === value)
    if (preset) {
      updateData({ brandPersonality: value, ...preset.colors })
    } else {
      updateData({ brandPersonality: value })
    }
  }, [updateData])

  const handleCustomClick = useCallback(() => {
    setShowCustomInput(true)
    if (BRAND_VOICES.some(v => v.value === data.brandPersonality)) {
      updateData({ brandPersonality: '' })
    }
  }, [data.brandPersonality, updateData])

  // ─── Phase: URL Input ────────────────────────────────────────────

  if (phase === 'url_input') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 py-8">
        <div className="w-full max-w-lg bg-white rounded-2xl shadow-lg border border-zinc-100 p-8">
          {/* Globe icon */}
          <div className="w-16 h-16 rounded-full bg-brand-50 flex items-center justify-center mx-auto mb-6">
            <Globe className="w-8 h-8 text-brand-600" />
          </div>

          <h2 className="font-display font-bold text-2xl text-zinc-900 text-center mb-2">
            Let's set up your brand
          </h2>
          <p className="text-sm text-zinc-500 text-center mb-8">
            Enter your website and we'll extract your brand identity automatically
          </p>

          <AnimatePresence>
            {crawlError && (
              <motion.div
                initial={{ opacity: 0, y: -8, height: 0 }}
                animate={{ opacity: 1, y: 0, height: 'auto' }}
                exit={{ opacity: 0, y: -8, height: 0 }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
                className="mb-6 overflow-hidden"
              >
                <div className="flex items-start gap-3 rounded-xl border border-red-100 bg-red-50/70 px-4 py-3">
                  <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-red-900 leading-tight mb-0.5">
                      Couldn't extract your brand
                    </p>
                    <p className="text-sm text-red-700/90 leading-relaxed">
                      {crawlError}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setCrawlError(null)}
                    aria-label="Dismiss"
                    className="shrink-0 -mr-1 -mt-0.5 p-1.5 rounded-lg text-red-400 hover:text-red-600 hover:bg-red-100/60 active:scale-90 transition-all min-h-11 min-w-11 flex items-center justify-center"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="space-y-4">
            <Input
              label="Your website URL"
              placeholder="yourwebsite.com"
              value={websiteUrl}
              onChange={e => { setWebsiteUrl(e.target.value.trim()); setUrlError(null); setCrawlError(null) }}
              onKeyDown={e => e.key === 'Enter' && handleStartCrawl()}
              leftIcon={<Globe className="w-4 h-4 text-zinc-400" />}
              error={urlError ?? undefined}
              autoFocus
            />

            <Button
              variant="primary"
              size="lg"
              className="w-full"
              onClick={handleStartCrawl}
            >
              Extract Brand Identity
            </Button>
          </div>

          <div className="flex items-center gap-3 my-6">
            <div className="flex-1 h-px bg-zinc-100" />
            <span className="text-xs text-zinc-400 font-medium">or set up manually</span>
            <div className="flex-1 h-px bg-zinc-100" />
          </div>

          <Button
            variant="ghost"
            size="md"
            className="w-full"
            onClick={() => setPhase('manual')}
          >
            Set up manually →
          </Button>
        </div>
      </div>
    )
  }

  // ─── Phase: Crawling ─────────────────────────────────────────────

  if (phase === 'crawling') {
    const activeStep = getCrawlActiveStep(crawlProgress)

    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 py-8">
        <div className="w-full max-w-lg bg-white rounded-2xl shadow-lg border border-zinc-100 p-8">
          {/* Pulsing brand icon */}
          <motion.div
            animate={{ scale: [1, 1.05, 1] }}
            transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
            className="w-16 h-16 rounded-2xl bg-brand-600 flex items-center justify-center mx-auto mb-6"
          >
            <Globe className="w-8 h-8 text-white" />
          </motion.div>

          {/* URL chip */}
          <div className="flex justify-center mb-6">
            <span className="inline-flex items-center gap-1.5 bg-surface-100 rounded-full px-3 py-1 text-sm text-zinc-600">
              🌐 {websiteUrl}
            </span>
          </div>

          {/* Progress bar — label derived from progress, not backend message, so they're always in sync */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-zinc-700 min-h-5">
                {getCrawlStepLabel(crawlProgress)}
              </p>
              <span className="text-xs font-semibold text-brand-600 tabular-nums">
                {crawlProgress}%
              </span>
            </div>
            <div className="w-full h-2 bg-surface-100 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-brand-600 rounded-full"
                animate={{ width: `${Math.max(crawlProgress, 4)}%` }}
                transition={{ duration: 0.6, ease: 'easeOut' }}
              />
            </div>
          </div>

          {/* Step indicators — thresholds match backend milestones */}
          <div className="space-y-2.5">
            {CRAWL_STEPS.map(({ label, threshold }, i) => {
              const isDone = crawlProgress >= threshold && i < activeStep
              const isActive = i === activeStep
              return (
                <div key={label} className="flex items-center gap-3">
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${
                    isDone ? 'bg-emerald-100' : isActive ? 'bg-brand-100' : 'bg-zinc-100'
                  }`}>
                    {isDone ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    ) : isActive ? (
                      <div className="w-2.5 h-2.5 rounded-full bg-brand-600 animate-pulse" />
                    ) : (
                      <div className="w-2 h-2 rounded-full bg-zinc-300" />
                    )}
                  </div>
                  <span className={`text-sm ${
                    isDone ? 'text-emerald-700' : isActive ? 'text-brand-700 font-medium' : 'text-zinc-400'
                  }`}>
                    {label}
                  </span>
                </div>
              )
            })}
          </div>

          <p className="text-xs text-zinc-400 text-center mt-6">
            This takes about 30–60 seconds
          </p>
        </div>
      </div>
    )
  }

  // ─── Phase: Review or Manual (all fields) ────────────────────────

  return (
    <div className="space-y-8 md:space-y-10">

      {/* Review banner */}
      {phase === 'review' && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-emerald-800 text-sm">
                Brand extracted from {websiteUrl || data.websiteUrl}
              </p>
              <p className="text-sm text-emerald-600">Review and edit anything below</p>
            </div>
          </div>

          {/* Recrawl / Regenerate actions */}
          <div className="flex gap-2 mt-3 flex-wrap">
            <button
              type="button"
              onClick={handleStartCrawl}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-emerald-700 bg-white border border-emerald-200 rounded-lg hover:bg-emerald-50 transition-colors min-h-9"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Re-crawl
            </button>
            <button
              type="button"
              onClick={() => setShowRegenerateInput(v => !v)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-emerald-700 bg-white border border-emerald-200 rounded-lg hover:bg-emerald-50 transition-colors min-h-9"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Regenerate with instructions
            </button>
          </div>

          <AnimatePresence>
            {showRegenerateInput && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="mt-3 space-y-2">
                  <textarea
                    value={regenerateContext}
                    onChange={e => setRegenerateContext(e.target.value)}
                    placeholder="What to change? e.g. 'Use more vibrant colors, we are a fun youth brand, ignore the text about B2B'"
                    rows={3}
                    className="w-full px-3 py-2.5 text-sm border border-emerald-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-400 resize-none bg-white"
                    autoFocus
                  />
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={handleRegenerate}
                    disabled={!regenerateContext.trim()}
                  >
                    Regenerate
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Manual mode header */}
      {phase === 'manual' && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <div className="text-4xl">🎨</div>
            <button
              type="button"
              onClick={() => setPhase('url_input')}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-brand-600 hover:text-brand-700 hover:bg-brand-50 px-3 py-1.5 rounded-lg transition-colors min-h-9"
            >
              <Globe className="w-3.5 h-3.5" />
              Auto-extract from website
            </button>
          </div>
          <h2 className="font-display font-bold text-2xl md:text-3xl text-zinc-900 mb-2">
            Set up your brand
          </h2>
          <p className="text-base text-zinc-600">
            This is how VisualFlow AI will represent your brand across all social media content
          </p>
        </div>
      )}

      {/* ── Brand Name ── */}
      <div>
        <label className="text-sm font-semibold text-zinc-700 block mb-2">Brand Name</label>
        <Input
          type="text"
          placeholder="e.g., PixelFex, FashionHub, TechStore"
          value={data.brandName || ''}
          onChange={e => updateData({ brandName: e.target.value })}
          className="w-full"
        />
        <p className="text-xs text-zinc-500 mt-1">How your brand is called in all content (captions, posts, etc.)</p>
      </div>

      {/* ── Logo Upload ── */}
      <div>
        <label className="text-sm font-semibold text-zinc-700 block mb-3">Brand Logo</label>
        <div
          {...getLogoRootProps()}
          className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all min-h-40 flex flex-col items-center justify-center gap-3 ${
            isLogoDragActive
              ? 'border-brand-500 bg-brand-50'
              : 'border-zinc-200 hover:border-brand-400 hover:bg-brand-50/50'
          }`}
        >
          <input {...getLogoInputProps()} />
          {data.logoUrl ? (
            <div className="relative">
              <img src={data.logoUrl} alt="Logo" className="h-20 object-contain" />
              <button
                type="button"
                onClick={e => {
                  e.stopPropagation()
                  updateData({ logoUrl: undefined })
                  onLogoFileChange?.(undefined)
                }}
                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
              <p className="text-xs text-zinc-400 mt-3">Click to change logo</p>
            </div>
          ) : (
            <>
              <Upload className="h-8 w-8 text-zinc-400" />
              <div>
                <p className="text-sm font-semibold text-zinc-700">Drop your logo here</p>
                <p className="text-xs text-zinc-500 mt-1">or click to browse</p>
              </div>
              <p className="text-xs text-zinc-400 mt-1">PNG, SVG recommended • Max 5MB</p>
            </>
          )}
        </div>
      </div>

      {/* ── Brand Colors ── */}
      <div>
        <label className="text-sm font-semibold text-zinc-700 block mb-4">Brand Colors</label>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {BRAND_COLORS.map((color, idx) => (
            <div key={idx} className="text-center relative">
              <button
                type="button"
                onClick={() => setActiveColorPicker(activeColorPicker === idx ? null : idx)}
                className="w-12 h-12 rounded-xl mx-auto mb-2 border-2 border-zinc-200 hover:border-brand-400 transition-colors shadow-sm hover:shadow-md"
                style={{ backgroundColor: data[color.key as keyof OnboardingData] as string }}
              />
              <p className="text-xs font-medium text-zinc-600">{color.label}</p>
              <p className="text-xs text-zinc-400 font-mono mt-0.5">
                {(data[color.key as keyof OnboardingData] as string)?.toUpperCase()}
              </p>
              {activeColorPicker === idx && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="absolute mt-2 bg-white rounded-xl shadow-xl border border-zinc-100 p-4 z-50 left-1/2 -translate-x-1/2"
                >
                  <HexColorPicker
                    color={data[color.key as keyof OnboardingData] as string}
                    onChange={c => updateData({ [color.key]: c })}
                  />
                  <div className="flex items-center gap-2 mt-3 px-0.5">
                    <span className="text-sm font-mono text-zinc-400 select-none">#</span>
                    <HexColorInput
                      color={data[color.key as keyof OnboardingData] as string}
                      onChange={c => updateData({ [color.key]: c })}
                      prefixed={false}
                      className="flex-1 text-sm font-mono uppercase tracking-widest text-zinc-800 border border-zinc-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent min-h-11 w-full text-center"
                      placeholder="155DFC"
                    />
                  </div>
                </motion.div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ── Fonts ── */}
      <div>
        <label className="text-sm font-semibold text-zinc-700 block mb-4">Fonts</label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-zinc-500 mb-2">Heading Font</p>
            <select
              value={data.headingFont}
              onChange={e => updateData({ headingFont: e.target.value })}
              className="w-full px-3 py-2.5 text-sm border border-surface-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white min-h-11"
            >
              {GOOGLE_FONTS.map(f => <option key={f} value={f}>{f}</option>)}
            </select>
          </div>
          <div>
            <p className="text-xs text-zinc-500 mb-2">Body Font</p>
            <select
              value={data.bodyFont}
              onChange={e => updateData({ bodyFont: e.target.value })}
              className="w-full px-3 py-2.5 text-sm border border-surface-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white min-h-11"
            >
              {GOOGLE_FONTS.map(f => <option key={f} value={f}>{f}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* ── Brand Voice ── */}
      <div id="brand-personality-section" className={`${errors?.brandPersonality ? 'p-3 border border-red-200 bg-red-50 rounded-xl' : ''}`}>
        <label className="text-sm font-semibold text-zinc-700 block mb-4">Brand Voice</label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {BRAND_VOICES.map(voice => {
            const isSelected = !showCustomInput && data.brandPersonality === voice.value
            return (
              <motion.button
                key={voice.value}
                type="button"
                onClick={() => handleVoiceSelect(voice.value)}
                whileTap={{ scale: 0.97 }}
                className={`p-4 rounded-xl border-2 text-left transition-all ${
                  isSelected ? 'border-brand-500 bg-brand-50' : 'border-zinc-200 bg-white hover:border-brand-300'
                }`}
              >
                <div className="flex items-start gap-3">
                  <span className="text-2xl">{voice.emoji}</span>
                  <div>
                    <p className="font-semibold text-zinc-900">{voice.name}</p>
                    <p className="text-xs text-zinc-500 mt-1">{voice.desc}</p>
                  </div>
                  {isSelected && <CheckIcon className="w-5 h-5 text-brand-600 ml-auto shrink-0 mt-0.5" />}
                </div>
              </motion.button>
            )
          })}

          <motion.button
            type="button"
            onClick={handleCustomClick}
            whileTap={{ scale: 0.97 }}
            className={`p-4 rounded-xl border-2 text-left transition-all ${
              showCustomInput ? 'border-brand-500 bg-brand-50' : 'border-zinc-200 bg-white hover:border-brand-300'
            }`}
          >
            <div className="flex items-start gap-3">
              <span className="text-2xl">✏️</span>
              <div>
                <p className="font-semibold text-zinc-900">Custom</p>
                <p className="text-xs text-zinc-500 mt-1">Describe your brand voice</p>
              </div>
              {showCustomInput && <CheckIcon className="w-5 h-5 text-brand-600 ml-auto shrink-0 mt-0.5" />}
            </div>
          </motion.button>
        </div>

        {showCustomInput && (
          <textarea
            value={data.brandPersonality}
            onChange={e => updateData({ brandPersonality: e.target.value })}
            placeholder="e.g. Confident and conversational, targeting young urban professionals…"
            rows={3}
            className="mt-3 w-full px-3 py-2.5 text-sm border border-brand-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
            autoFocus
          />
        )}

        {errors?.brandPersonality && (
          <p className="text-xs text-red-600 mt-3 flex items-center gap-1">
            <AlertCircle className="w-3 h-3" />
            {errors.brandPersonality}
          </p>
        )}
      </div>

      {/* ── Content Style ── */}
      <div id="photo-style-section" className={`${errors?.photoStyle ? 'p-3 border border-red-200 bg-red-50 rounded-xl' : ''}`}>
        <label className="text-sm font-semibold text-zinc-700 block mb-4">Content Style</label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {CONTENT_STYLES.map(style => {
            const isSelected = data.photoStyle === style.value
            return (
              <motion.button
                key={style.value}
                type="button"
                onClick={() => updateData({ photoStyle: style.value })}
                whileTap={{ scale: 0.97 }}
                className={`p-4 rounded-xl border-2 text-left transition-all ${
                  isSelected ? 'border-brand-500 bg-brand-50' : 'border-zinc-200 bg-white hover:border-brand-300'
                }`}
              >
                <div className="flex items-start gap-3">
                  <span className="text-2xl">{style.emoji}</span>
                  <div>
                    <p className="font-semibold text-zinc-900">{style.name}</p>
                    <p className="text-xs text-zinc-500 mt-1">{style.desc}</p>
                  </div>
                  {isSelected && <CheckIcon className="w-5 h-5 text-brand-600 ml-auto shrink-0 mt-0.5" />}
                </div>
              </motion.button>
            )
          })}
        </div>
        {errors?.photoStyle && (
          <p className="text-xs text-red-600 mt-3 flex items-center gap-1">
            <AlertCircle className="w-3 h-3" />
            {errors.photoStyle}
          </p>
        )}
      </div>

      {/* ── Reference Images ── */}
      <div>
        <label className="text-sm font-semibold text-zinc-700 block mb-1">Reference Images</label>
        <p className="text-xs text-zinc-500 mb-4">Upload 5–10 Instagram posts that represent your visual style</p>

        {data.referenceImages.length > 0 && (
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 mb-4">
            {data.referenceImages.map(url => {
              const isRemoving = removingUrls.has(url)
              return (
                <div key={url} className="relative group aspect-square">
                  <img
                    src={url}
                    alt="Reference"
                    className={`w-full h-full object-cover rounded-lg transition-opacity ${isRemoving ? 'opacity-40' : ''}`}
                  />
                  {isRemoving ? (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => removeRefImage(url)}
                      className="absolute top-1 right-1 bg-black/60 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
              )
            })}
            {uploadingRefs > 0 && Array.from({ length: uploadingRefs }).map((_, i) => (
              <div key={`uploading-${i}`} className="aspect-square rounded-lg bg-zinc-100 animate-pulse flex items-center justify-center">
                <ImageIcon className="w-5 h-5 text-zinc-400" />
              </div>
            ))}
          </div>
        )}

        {data.referenceImages.length < 10 && (
          <div
            {...getRefRootProps()}
            className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all ${
              isRefDragActive
                ? 'border-brand-500 bg-brand-50'
                : 'border-zinc-200 hover:border-brand-400 hover:bg-brand-50/50'
            }`}
          >
            <input {...getRefInputProps()} />
            <ImageIcon className="h-7 w-7 text-zinc-400 mx-auto mb-2" />
            <p className="text-sm font-medium text-zinc-700">
              {uploadingRefs > 0
                ? `Uploading ${uploadingRefs} image${uploadingRefs > 1 ? 's' : ''}…`
                : 'Drop images here or click to browse'}
            </p>
            <p className="text-xs text-zinc-400 mt-1">
              {data.referenceImages.length} / 10 images • PNG, JPG accepted
            </p>
          </div>
        )}

        {refUploadError && (
          <p className="text-xs text-red-600 mt-2 flex items-center gap-1">
            <AlertCircle className="w-3 h-3" />
            {refUploadError}
          </p>
        )}
      </div>

      {/* ── Trust Signals ── */}
      <div>
        <label className="text-sm font-semibold text-zinc-700 block mb-1">Trust Signals</label>
        <p className="text-xs text-zinc-500 mb-4">Select badges that apply to your store — woven naturally into your AI captions</p>
        <div className="grid grid-cols-1 gap-2.5">
          {TRUST_SIGNAL_OPTIONS.map(({ key, label, desc, icon }) => {
            const isOn = data.trustSignals.includes(key)
            return (
              <button
                key={key}
                type="button"
                onClick={() => updateData({
                  trustSignals: isOn
                    ? data.trustSignals.filter(k => k !== key)
                    : [...data.trustSignals, key],
                })}
                className={`group flex items-center gap-3.5 p-4 rounded-2xl border-2 text-left transition-all duration-200 ${
                  isOn
                    ? 'border-brand-400 bg-linear-to-r from-brand-50 to-violet-50 shadow-sm'
                    : 'border-zinc-100 bg-white hover:border-zinc-200 hover:bg-zinc-50/60'
                }`}
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0 transition-colors duration-200 ${
                  isOn ? 'bg-brand-100' : 'bg-zinc-100 group-hover:bg-zinc-200'
                }`}>
                  {icon}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-semibold leading-tight transition-colors ${isOn ? 'text-brand-800' : 'text-zinc-800'}`}>
                    {label}
                  </p>
                  <p className="text-xs text-zinc-400 mt-0.5">{desc}</p>
                </div>
                <div className={`w-11 h-6 rounded-full shrink-0 flex items-center px-0.5 transition-colors duration-200 ${
                  isOn ? 'bg-brand-600' : 'bg-zinc-200'
                }`}>
                  <div className={`w-5 h-5 rounded-full bg-white shadow-sm transition-transform duration-200 ${
                    isOn ? 'translate-x-5' : 'translate-x-0'
                  }`} />
                </div>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function CheckIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} {...props}>
      <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
