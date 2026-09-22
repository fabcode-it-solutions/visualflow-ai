import { useState, useEffect, useRef, useMemo } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { motion } from 'framer-motion'
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query'
import { X, Check, AlertCircle, ChevronRight, ChevronLeft, Sparkles, Layers, LayoutGrid, Search } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { useToast } from '@/hooks/useToast'
import { useNavigate } from 'react-router-dom'
import { postService } from '@/services/postService'
import { productService } from '@/services/productService'
import { useShopStore } from '@/store/shopStore'
import { cn } from '@utils/cn'
import { formatINR } from '@utils/indianFormat'
import type { Product } from '@/types/product.types'

interface CollectionPostModalProps {
  products: Product[]
  onClose: () => void
}

type Step = 'select_products' | 'collection_details' | 'generating' | 'review' | 'creating' | 'success' | 'error'
type CoverMode = 'hero' | 'showcase'
type Platform = 'instagram' | 'facebook' | 'both'

function titleCase(s: string): string {
  return s.trim().replace(/\b\w/g, (c) => c.toUpperCase())
}

// Build collection-title suggestions from the products being featured — so they're
// relevant to the shop's catalogue (e.g. "Wall Art Bestsellers" for an art store)
// rather than generic. Falls back to evergreen titles when no category is set.
function buildCollectionSuggestions(pool: Product[]): string[] {
  // Prefer category; fall back to the most common product tag (tags are always synced).
  const tally = (vals: (string | null | undefined)[]): string => {
    const counts = new Map<string, number>()
    for (const v of vals) {
      const c = (v ?? '').trim().toLowerCase()
      if (c) counts.set(c, (counts.get(c) ?? 0) + 1)
    }
    let top = '', max = 0
    for (const [c, n] of counts) if (n > max) { max = n; top = c }
    return top
  }

  const topCat = tally(pool.map((p) => p.category))
  const topTag = topCat ? '' : tally(pool.flatMap((p) => p.tags ?? []))
  const cat = titleCase(topCat || topTag)

  if (cat) {
    return [`${cat} Bestsellers`, `${cat} Gift Guide`, `New ${cat} Arrivals`, `Curated ${cat} Edit`]
  }
  return ['Bestsellers', 'Gift Guide', 'New Arrivals', 'Editor’s Picks']
}

// Mirror backend SHOWCASE_COVER_KEYWORDS for the default toggle state
const SHOWCASE_KEYWORDS = [
  'wall art', 'art print', 'canvas', 'poster', 'painting', 'artwork', 'print', 'decor',
  'fashion', 'clothing', 'apparel', 'outfit', 'accessor', 'jewellery', 'jewelry',
  'furniture', 'home decor', 'footwear', 'shoes', 'saree', 'kurta',
]

// Progress steps shown while the collection is being generated
const GEN_STEPS = [
  'Writing campaign copy',
  'Designing collection cover',
  'Placing products into scenes',
  'Composing the closing slide',
  'Finalizing your collection',
]

interface PreviewResult {
  slides: string[]
  coverMode: CoverMode
  captions: { instagram: string; facebook: string; hashtags: string[] }
  collectionTitle: string
  collectionHook: string
  collectionCTA: string
}

export function CollectionPostModal({ products, onClose }: CollectionPostModalProps) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { showToast } = useToast()
  const preferredLanguage = useShopStore((s) => s.preferredLanguage)

  const [step, setStep] = useState<Step>('select_products')
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([])
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [collectionTitle, setCollectionTitle] = useState('')
  const [platform, setPlatform] = useState<Platform>('both')
  const [selectedLanguage, setSelectedLanguage] = useState<'english' | 'hindi' | 'bilingual'>(preferredLanguage)
  const [coverMode, setCoverMode] = useState<CoverMode>('hero')
  const [errorMessage, setErrorMessage] = useState('')

  // Preview + review state
  const [preview, setPreview] = useState<PreviewResult | null>(null)
  const [editedInstagram, setEditedInstagram] = useState('')
  const [editedFacebook, setEditedFacebook] = useState('')

  // Progress bar
  const [genStepIdx, setGenStepIdx] = useState(0)
  const genTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Cancellation (mirrors single-product flow)
  const [isCancelling, setIsCancelling] = useState(false)
  const abortControllerRef = useRef<AbortController | null>(null)

  useEffect(() => { setSelectedLanguage(preferredLanguage) }, [preferredLanguage])

  // Debounce the search box
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 300)
    return () => clearTimeout(t)
  }, [search])

  // Fetch the FULL catalogue (searchable) — not just the page the parent passed
  const { data: productsResp, isLoading: productsLoading } = useQuery({
    queryKey: ['products', 'collection-picker', debouncedSearch],
    queryFn: () => productService.getAll({ search: debouncedSearch || undefined, limit: 100 }),
  })
  const sourceProducts: Product[] = productsResp?.data?.data ?? products

  // Remember every product we've seen across searches, so selected items stay
  // resolvable even when filtered out of the current search results.
  const seenRef = useRef<Map<string, Product>>(new Map())
  useEffect(() => {
    for (const p of sourceProducts) seenRef.current.set(p.id, p)
  }, [sourceProducts])

  const selectedProducts = selectedProductIds
    .map((id) => seenRef.current.get(id))
    .filter((p): p is Product => Boolean(p))

  // Auto-detect cover mode from selected products' categories
  useEffect(() => {
    const anyShowcase = selectedProducts.some(p => {
      const c = `${p.category ?? ''} ${p.title ?? ''}`.toLowerCase()
      return SHOWCASE_KEYWORDS.some(kw => c.includes(kw))
    })
    setCoverMode(anyShowcase ? 'showcase' : 'hero')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedProductIds])

  const startGenTimer = () => {
    setGenStepIdx(0)
    if (genTimerRef.current) clearInterval(genTimerRef.current)
    genTimerRef.current = setInterval(() => {
      setGenStepIdx((i) => Math.min(i + 1, GEN_STEPS.length - 1))
    }, 6000)
  }
  const stopGenTimer = () => {
    if (genTimerRef.current) { clearInterval(genTimerRef.current); genTimerRef.current = null }
  }
  useEffect(() => () => stopGenTimer(), [])

  const isAbortError = (error: unknown): boolean => {
    const name = (error as { name?: string })?.name
    const code = (error as { code?: string })?.code
    return name === 'AbortError' || name === 'CanceledError' || code === 'ERR_CANCELED' || isCancelling
  }

  // ── Preview mutation — generates captions + all slides ────────────────────
  const { mutate: runPreview, isPending: isPreviewing } = useMutation({
    mutationFn: () => {
      const controller = new AbortController()
      abortControllerRef.current = controller
      return postService.previewCollection({
        productIds: selectedProductIds,
        collectionTitle: collectionTitle || undefined,
        platform,
        language: selectedLanguage,
        coverMode,
      }, controller.signal)
    },
    onMutate: () => { setErrorMessage(''); setIsCancelling(false); setStep('generating'); startGenTimer() },
    onSuccess: (res) => {
      stopGenTimer()
      const data = res.data
      setPreview(data)
      setEditedInstagram(data.captions.instagram)
      setEditedFacebook(data.captions.facebook)
      setStep('review')
    },
    onError: (error: unknown) => {
      stopGenTimer()
      if (isAbortError(error)) {
        showToast('Collection generation cancelled.', 'info')
        setIsCancelling(false)
        setStep('collection_details')
        return
      }
      const msg = (error as { response?: { data?: { error?: string } }; message?: string })?.response?.data?.error
        || (error as { message?: string })?.message || 'Failed to generate collection'
      setErrorMessage(msg)
      setStep('error')
    },
    onSettled: () => { abortControllerRef.current = null },
  })

  // ── Create mutation — reuses the approved preview ─────────────────────────
  const { mutate: runCreate, isPending: isCreating } = useMutation({
    mutationFn: () => {
      const controller = new AbortController()
      abortControllerRef.current = controller
      return postService.generateCollectionPost({
        productIds: selectedProductIds,
        collectionTitle: preview?.collectionTitle || collectionTitle || undefined,
        platform,
        language: selectedLanguage,
        coverMode: preview?.coverMode ?? coverMode,
        previewSlideUrls: preview?.slides,
        captionInstagram: editedInstagram,
        captionFacebook: editedFacebook,
        hashtags: preview?.captions.hashtags,
        collectionHook: preview?.collectionHook,
        collectionCTA: preview?.collectionCTA,
      }, controller.signal)
    },
    onMutate: () => { setErrorMessage(''); setIsCancelling(false); setStep('creating') },
    onSuccess: () => {
      setStep('success')
      setTimeout(() => {
        showToast('Collection post created!', 'success')
        queryClient.invalidateQueries({ queryKey: ['posts'] })
        onClose()
        navigate('/approval')
      }, 1400)
    },
    onError: (error: unknown) => {
      if (isAbortError(error)) {
        showToast('Cancelled — your slides are still here.', 'info')
        setIsCancelling(false)
        setStep('review')
        return
      }
      const msg = (error as { response?: { data?: { error?: string } } })?.response?.data?.error
        || (error as { message?: string })?.message || 'Failed to create collection post'
      setErrorMessage(msg)
      setStep('error')
    },
    onSettled: () => { abortControllerRef.current = null },
  })

  const busy = isPreviewing || isCreating

  // Cancel the in-flight generation/creation — aborts request + stops the timer
  const handleCancel = () => {
    setIsCancelling(true)
    abortControllerRef.current?.abort()
    stopGenTimer()
  }

  const handleOpenChange = (open: boolean) => {
    if (!open && !busy && step !== 'success') onClose()
  }

  const toggleProductSelection = (productId: string) => {
    setSelectedProductIds((prev) => {
      if (prev.includes(productId)) return prev.filter((id) => id !== productId)
      if (prev.length < 6) return [...prev, productId]
      return prev
    })
  }

  const selectedCount = selectedProductIds.length
  const canProceed = selectedCount >= 3 && selectedCount <= 6
  const availableProducts = sourceProducts.filter((p) => p.price && p.inventoryQuantity > 0)
  const titleSuggestions = useMemo(
    () => buildCollectionSuggestions(selectedProducts.length > 0 ? selectedProducts : sourceProducts),
    [selectedProducts, sourceProducts],
  )
  const showInstagram = platform === 'instagram' || platform === 'both'
  const showFacebook = platform === 'facebook' || platform === 'both'

  // ════════════════════════════════════════════════════════════════════════
  // STATUS OVERLAYS — generating / creating / success / error
  // ════════════════════════════════════════════════════════════════════════
  if (step === 'generating' || step === 'creating' || step === 'success' || step === 'error') {
    return (
      <Dialog.Root open onOpenChange={handleOpenChange}>
        <Dialog.Portal forceMount>
          <Dialog.Overlay asChild>
            <motion.div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
          </Dialog.Overlay>
          <Dialog.Content asChild>
            <motion.div className="fixed z-50 inset-0 flex items-end sm:items-center justify-center"
              initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 16 }}>
              <div className="bg-white w-full sm:max-w-sm rounded-t-2xl sm:rounded-2xl shadow-xl p-6 sm:p-8">

                {/* Generating / Creating — progress steps */}
                {(step === 'generating' || step === 'creating') && (
                  <div className="space-y-6">
                    <div className="flex items-center gap-3">
                      <motion.div animate={{ scale: isCancelling ? 1 : [1, 1.1, 1] }} transition={{ repeat: isCancelling ? 0 : Infinity, duration: 1.6 }}
                        className={cn('w-10 h-10 rounded-xl flex items-center justify-center shrink-0', isCancelling ? 'bg-red-50' : 'bg-brand-50')}>
                        {isCancelling ? <AlertCircle className="h-5 w-5 text-red-600" /> : <Sparkles className="h-5 w-5 text-brand-600" />}
                      </motion.div>
                      <div>
                        <h3 className="font-display font-semibold text-zinc-900 text-sm">
                          {isCancelling ? 'Cancelling…' : step === 'creating' ? 'Saving your collection' : 'Building your collection campaign'}
                        </h3>
                        <p className="text-xs text-zinc-400">{selectedCount} products · {selectedCount + 2} slides</p>
                      </div>
                    </div>

                    <div className="space-y-2.5">
                      {GEN_STEPS.map((label, i) => {
                        const state = step === 'creating' || i < genStepIdx ? 'done' : i === genStepIdx ? 'active' : 'pending'
                        return (
                          <div key={label} className="flex items-center gap-3">
                            <div className={cn('shrink-0 w-5 h-5 rounded-full flex items-center justify-center',
                              isCancelling ? 'bg-red-100'
                                : state === 'done' ? 'bg-emerald-100' : state === 'active' ? 'bg-brand-100' : 'bg-zinc-100')}>
                              {isCancelling ? <X className="h-3 w-3 text-red-500" />
                                : state === 'done' ? <Check className="h-3 w-3 text-emerald-600" />
                                : state === 'active'
                                  ? <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1 }}
                                      className="w-2.5 h-2.5 rounded-full border-2 border-brand-300 border-t-brand-600" />
                                  : <div className="w-1.5 h-1.5 rounded-full bg-zinc-300" />}
                            </div>
                            <p className={cn('text-sm', isCancelling ? 'text-red-500' : state === 'pending' ? 'text-zinc-400' : 'text-zinc-800 font-medium')}>{label}</p>
                          </div>
                        )
                      })}
                    </div>

                    {/* progress bar — turns red while cancelling. Caps below 100% until
                        the work actually finishes (the last "Finalizing" step still runs). */}
                    <div className="h-1.5 rounded-full bg-zinc-100 overflow-hidden">
                      <motion.div className={cn('h-full', isCancelling ? 'bg-red-500' : 'bg-brand-600')}
                        animate={{ width: step === 'creating' ? '95%' : `${Math.round(((genStepIdx + 0.5) / GEN_STEPS.length) * 100)}%` }}
                        transition={{ duration: 0.5 }} />
                    </div>

                    {/* Cancel */}
                    <button
                      onClick={handleCancel}
                      disabled={isCancelling}
                      className="w-full py-2 px-4 rounded-lg border border-red-300 bg-red-50 text-red-700 hover:bg-red-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-xs font-medium"
                    >
                      {isCancelling ? '⏸ Cancelling…' : '✕ Cancel'}
                    </button>
                    <p className="text-xs text-zinc-400 text-center">This can take up to a minute for {selectedCount} products.</p>
                  </div>
                )}

                {/* Success */}
                {step === 'success' && (
                  <motion.div className="text-center space-y-4" initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
                    <div className="flex justify-center">
                      <div className="w-16 h-16 rounded-full bg-emerald-50 flex items-center justify-center">
                        <Check className="h-8 w-8 text-emerald-600" />
                      </div>
                    </div>
                    <div>
                      <h3 className="font-display font-semibold text-lg text-zinc-900">Collection post created!</h3>
                      <p className="text-sm text-zinc-500 mt-1">Ready for review in your approval queue</p>
                    </div>
                    <Button variant="primary" className="w-full" onClick={() => { onClose(); navigate('/approval') }}>
                      View in Approval Queue →
                    </Button>
                  </motion.div>
                )}

                {/* Error — real message shown */}
                {step === 'error' && (
                  <motion.div className="text-center space-y-4" initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
                    <div className="flex justify-center">
                      <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center">
                        <AlertCircle className="h-8 w-8 text-red-600" />
                      </div>
                    </div>
                    <div>
                      <h3 className="font-display font-semibold text-lg text-zinc-900">Something went wrong</h3>
                      <p className="text-sm text-zinc-500 mt-1 break-words">{errorMessage}</p>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="secondary" className="flex-1"
                        onClick={() => { setStep(preview ? 'review' : 'collection_details'); setErrorMessage('') }}>
                        Back
                      </Button>
                      <Button variant="primary" className="flex-1"
                        onClick={() => { preview ? runCreate() : runPreview() }}>
                        Try Again
                      </Button>
                    </div>
                  </motion.div>
                )}
              </div>
            </motion.div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    )
  }

  // ════════════════════════════════════════════════════════════════════════
  // REVIEW — slides + editable captions before saving
  // ════════════════════════════════════════════════════════════════════════
  if (step === 'review' && preview) {
    return (
      <Dialog.Root open onOpenChange={handleOpenChange}>
        <Dialog.Portal forceMount>
          <Dialog.Overlay asChild>
            <motion.div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
          </Dialog.Overlay>
          <Dialog.Content asChild>
            <motion.div className="fixed z-50 inset-0 flex items-end sm:items-center justify-center"
              initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 16 }}>
              <div className="bg-white w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl shadow-xl flex flex-col max-h-[92dvh]">
                {/* Header */}
                <div className="flex items-center gap-3 px-5 pt-5 pb-3 shrink-0 border-b border-surface-100">
                  <button onClick={() => setStep('collection_details')}
                    className="w-9 h-9 rounded-xl bg-surface-100 flex items-center justify-center hover:bg-surface-200 transition-colors">
                    <ChevronLeft className="h-4 w-4 text-zinc-600" />
                  </button>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-display font-semibold text-zinc-900 text-sm truncate">{preview.collectionTitle}</h3>
                    <p className="text-xs text-zinc-400">{preview.slides.length} slides · {preview.coverMode === 'hero' ? 'Hero' : 'Showcase'} cover</p>
                  </div>
                </div>

                <div className="overflow-y-auto flex-1 px-5 py-4 space-y-5">
                  {/* Slide strip */}
                  <div>
                    <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wide mb-2">Slides</p>
                    <div className="flex gap-2 overflow-x-auto snap-x snap-mandatory pb-1">
                      {preview.slides.map((url, i) => {
                        const role = i === 0 ? 'Cover' : i === preview.slides.length - 1 ? 'CTA' : `Product ${i}`
                        return (
                          <div key={i} className="shrink-0 w-[70%] snap-center rounded-xl overflow-hidden border border-surface-200 relative">
                            <img src={url} alt={role} className="w-full object-cover" />
                            <span className="absolute top-1.5 left-1.5 text-[9px] font-bold text-white bg-black/55 rounded-full px-1.5 py-0.5">{role}</span>
                            <span className="absolute top-1.5 right-1.5 text-[9px] font-bold text-white bg-black/55 rounded-full px-1.5 py-0.5">{i + 1}/{preview.slides.length}</span>
                          </div>
                        )
                      })}
                    </div>
                  </div>

                  {/* Hook + CTA chips */}
                  <div className="flex flex-wrap gap-2">
                    {preview.collectionHook && (
                      <span className="text-xs bg-brand-50 text-brand-700 rounded-full px-3 py-1 font-medium">“{preview.collectionHook}”</span>
                    )}
                    <span className="text-xs bg-zinc-100 text-zinc-700 rounded-full px-3 py-1 font-medium">CTA: {preview.collectionCTA}</span>
                  </div>

                  {/* Captions */}
                  {showInstagram && (
                    <div>
                      <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wide mb-1.5">Instagram Caption</p>
                      <textarea value={editedInstagram} onChange={(e) => setEditedInstagram(e.target.value)} rows={6}
                        className="w-full px-3 py-2.5 text-sm border border-surface-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none" />
                    </div>
                  )}
                  {showFacebook && (
                    <div>
                      <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wide mb-1.5">Facebook Caption</p>
                      <textarea value={editedFacebook} onChange={(e) => setEditedFacebook(e.target.value)} rows={4}
                        className="w-full px-3 py-2.5 text-sm border border-surface-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none" />
                    </div>
                  )}

                  {/* Hashtags */}
                  {preview.captions.hashtags.length > 0 && (
                    <div>
                      <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wide mb-1.5">Hashtags</p>
                      <div className="flex flex-wrap gap-1.5">
                        {preview.captions.hashtags.slice(0, 20).map((h, i) => (
                          <span key={i} className="text-xs text-brand-600 bg-brand-50 rounded px-2 py-0.5">{h.startsWith('#') ? h : `#${h}`}</span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Footer */}
                <div className="px-5 py-4 shrink-0 border-t border-surface-100 flex gap-3">
                  <Button variant="secondary" className="flex-1" disabled={busy} onClick={() => runPreview()}>
                    Regenerate
                  </Button>
                  <Button variant="primary" className="flex-1" loading={isCreating} disabled={busy} onClick={() => runCreate()}>
                    Create Post
                  </Button>
                </div>
              </div>
            </motion.div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    )
  }

  // ════════════════════════════════════════════════════════════════════════
  // FORM — select products + collection details
  // ════════════════════════════════════════════════════════════════════════
  return (
    <Dialog.Root open onOpenChange={handleOpenChange}>
      <Dialog.Portal forceMount>
        <Dialog.Overlay asChild>
          <motion.div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }} />
        </Dialog.Overlay>
        <Dialog.Content asChild>
          <motion.div className="fixed z-50 inset-0 flex items-end sm:items-center justify-center"
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 16 }} transition={{ duration: 0.18 }}>
            <div className="bg-white w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl shadow-xl flex flex-col max-h-[92dvh]">
              {/* HEADER */}
              <div className="shrink-0 bg-white border-b border-surface-200 px-5 py-4 flex items-center justify-between rounded-t-2xl">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-brand-50 flex items-center justify-center">
                    <Layers className="h-4 w-4 text-brand-600" />
                  </div>
                  <h2 className="text-sm font-semibold text-zinc-900">
                    {step === 'select_products' ? 'Create Collection Post' : 'Collection Details'}
                  </h2>
                </div>
                <Dialog.Close asChild>
                  <button className="text-zinc-400 hover:text-zinc-600 rounded-lg p-1 transition-colors" disabled={busy}>
                    <X className="h-5 w-5" />
                  </button>
                </Dialog.Close>
              </div>

              {/* Step indicator */}
              <div className="shrink-0 flex items-center gap-2 px-5 pt-3">
                {['Products', 'Details', 'Review'].map((label, i) => {
                  const current = step === 'select_products' ? 0 : 1
                  return (
                    <div key={label} className="flex items-center gap-2 flex-1">
                      <div className={cn('flex items-center gap-1.5 text-xs font-medium',
                        i <= current ? 'text-brand-600' : 'text-zinc-300')}>
                        <span className={cn('w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold',
                          i < current ? 'bg-brand-600 text-white' : i === current ? 'bg-brand-100 text-brand-700' : 'bg-zinc-100 text-zinc-400')}>
                          {i < current ? '✓' : i + 1}
                        </span>
                        {label}
                      </div>
                      {i < 2 && <div className={cn('h-px flex-1', i < current ? 'bg-brand-300' : 'bg-zinc-200')} />}
                    </div>
                  )
                })}
              </div>

              {/* CONTENT */}
              <div className="overflow-y-auto flex-1 px-5 py-5">
                {step === 'select_products' && (
                  <div className="space-y-4">
                    <label className="block text-sm font-semibold text-zinc-900">Select 3–6 products to feature</label>

                    {/* Search */}
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
                      <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search products…"
                        className="w-full pl-9 pr-9 py-2.5 text-sm border border-surface-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                      />
                      {search && (
                        <button onClick={() => setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600">
                          <X className="h-4 w-4" />
                        </button>
                      )}
                    </div>

                    {productsLoading ? (
                      <div className="flex items-center justify-center gap-2 py-10 text-sm text-zinc-400">
                        <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                          className="w-4 h-4 rounded-full border-2 border-brand-200 border-t-brand-600" />
                        Loading products…
                      </div>
                    ) : availableProducts.length === 0 ? (
                      <div className="rounded-xl border border-dashed border-zinc-200 bg-zinc-50 p-6 text-center">
                        <p className="text-sm text-zinc-400">
                          {debouncedSearch ? `No in-stock products match “${debouncedSearch}”.` : 'No in-stock products available to feature.'}
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {availableProducts.map((product) => {
                          const isSelected = selectedProductIds.includes(product.id)
                          const isLocked = selectedCount === 6 && !isSelected
                          return (
                            <button key={product.id} onClick={() => toggleProductSelection(product.id)} disabled={isLocked}
                              className={cn('w-full flex items-center gap-3 p-3 rounded-lg border-2 transition-all text-left',
                                isSelected ? 'border-brand-600 bg-brand-50' : 'border-surface-200 bg-white hover:border-surface-300',
                                isLocked ? 'opacity-50 cursor-not-allowed' : '')}>
                              <div className={cn('w-5 h-5 rounded border-2 flex items-center justify-center shrink-0',
                                isSelected ? 'border-brand-600 bg-brand-600' : 'border-zinc-300')}>
                                {isSelected && <Check className="h-3 w-3 text-white" />}
                              </div>
                              {product.images?.[0] && (
                                <img src={product.images[0]} alt={product.title} className="w-9 h-9 rounded object-cover shrink-0" />
                              )}
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-zinc-900 truncate">{product.title}</p>
                                <p className="text-xs text-zinc-500">{product.price ? formatINR(parseFloat(product.price)) : 'Price TBD'}</p>
                              </div>
                              <div className="shrink-0 px-2 py-1 rounded bg-zinc-100 text-xs text-zinc-600 font-medium">
                                {product.inventoryQuantity} left
                              </div>
                            </button>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )}

                {step === 'collection_details' && (
                  <div className="space-y-6">
                    {/* Title */}
                    <div>
                      <label className="block text-sm font-semibold text-zinc-900 mb-2">Collection title <span className="text-zinc-400 font-normal">(optional — AI fills if blank)</span></label>
                      <input type="text" placeholder={`e.g. ${titleSuggestions[0] ?? 'Top Picks This Week'}`} value={collectionTitle}
                        onChange={(e) => setCollectionTitle(e.target.value)} maxLength={120}
                        className="w-full px-3 py-2.5 text-sm border border-surface-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500" />
                      <div className="mt-3 flex flex-wrap gap-2">
                        {titleSuggestions.map((s) => (
                          <button key={s} onClick={() => setCollectionTitle(s)}
                            className="px-3 py-1 rounded-full text-xs font-medium border border-surface-200 text-zinc-700 hover:border-brand-400 hover:text-brand-600 transition-colors">
                            {s}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Cover style */}
                    <div>
                      <label className="block text-sm font-semibold text-zinc-900 mb-2">Cover style</label>
                      <div className="grid grid-cols-2 gap-2">
                        {([['hero', 'Hero', 'One featured product', Sparkles], ['showcase', 'Showcase', 'Grid of products', LayoutGrid]] as const).map(
                          ([mode, label, desc, Icon]) => (
                            <button key={mode} onClick={() => setCoverMode(mode)}
                              className={cn('p-3 rounded-xl border-2 text-left transition-all',
                                coverMode === mode ? 'border-brand-600 bg-brand-50' : 'border-zinc-200 bg-white hover:border-zinc-300')}>
                              <Icon className={cn('h-4 w-4 mb-1', coverMode === mode ? 'text-brand-600' : 'text-zinc-400')} />
                              <p className="text-sm font-semibold text-zinc-900">{label}</p>
                              <p className="text-[11px] text-zinc-500 leading-snug">{desc}</p>
                            </button>
                          ))}
                      </div>
                    </div>

                    {/* Platform */}
                    <div>
                      <label className="block text-sm font-semibold text-zinc-900 mb-2">Publish to</label>
                      <div className="flex gap-2">
                        {(['instagram', 'facebook', 'both'] as const).map((p) => (
                          <button key={p} onClick={() => setPlatform(p)}
                            className={cn('flex-1 py-2.5 px-3 rounded-lg text-sm font-medium transition-colors',
                              platform === p ? 'bg-brand-600 text-white' : 'bg-surface-100 text-zinc-700 hover:bg-surface-200')}>
                            {p === 'both' ? 'Both' : p.charAt(0).toUpperCase() + p.slice(1)}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Language */}
                    <div>
                      <label className="block text-sm font-semibold text-zinc-900 mb-2">Caption language</label>
                      <div className="flex gap-2">
                        {(['english', 'hindi', 'bilingual'] as const).map((lang) => (
                          <button key={lang} onClick={() => setSelectedLanguage(lang)}
                            className={cn('flex-1 py-2.5 px-3 rounded-full text-sm font-medium transition-colors',
                              selectedLanguage === lang ? 'bg-brand-600 text-white' : 'bg-surface-100 text-zinc-700 hover:bg-surface-200')}>
                            {lang === 'english' ? 'English' : lang === 'hindi' ? 'Hindi' : 'Bilingual'}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="bg-brand-50 border border-brand-200 rounded-xl p-4">
                      <p className="text-sm text-brand-900 font-semibold">{selectedCount} products → {selectedCount + 2} slides</p>
                      <p className="text-xs text-brand-700 mt-1">Cover + {selectedCount} product scenes + CTA. You'll preview everything before posting.</p>
                    </div>
                  </div>
                )}
              </div>

              {/* FOOTER */}
              <div className="shrink-0 bg-white border-t border-surface-200 px-5 py-4">
                {step === 'select_products' && (
                  <div className="space-y-3">
                    {/* Always-visible selection progress */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        {Array.from({ length: 6 }).map((_, i) => (
                          <span key={i} className={cn('h-1.5 rounded-full transition-all duration-200',
                            i < selectedCount ? 'w-6 bg-brand-600' : 'w-2.5 bg-zinc-200')} />
                        ))}
                      </div>
                      <span className={cn('text-xs font-semibold',
                        canProceed ? 'text-emerald-600' : selectedCount > 0 ? 'text-amber-600' : 'text-zinc-400')}>
                        {selectedCount}/6
                        {canProceed ? ' · ready' : selectedCount > 0 ? ` · ${3 - selectedCount} more` : ' · pick 3–6'}
                      </span>
                    </div>
                    <div className="flex gap-3">
                      <Dialog.Close asChild>
                        <Button variant="ghost" disabled={busy} className="flex-1 sm:flex-none">Cancel</Button>
                      </Dialog.Close>
                      <Button variant="primary" disabled={!canProceed} className="flex-1"
                        onClick={() => setStep('collection_details')} rightIcon={<ChevronRight className="h-4 w-4" />}>
                        Next
                      </Button>
                    </div>
                  </div>
                )}
                {step === 'collection_details' && (
                  <div className="flex gap-3">
                    <Button variant="ghost" disabled={busy} className="flex-1 sm:flex-none" onClick={() => setStep('select_products')}>
                      Back
                    </Button>
                    <Button variant="primary" loading={isPreviewing} disabled={busy} className="flex-1" onClick={() => runPreview()}>
                      Generate Collection
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
