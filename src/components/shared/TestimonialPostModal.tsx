import { useState, useEffect, useRef } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { motion } from 'framer-motion'
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query'
import { X, Check, AlertCircle, ChevronRight, ChevronLeft, Star, Sparkles, Search } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { useToast } from '@/hooks/useToast'
import { useNavigate } from 'react-router-dom'
import { postService } from '@/services/postService'
import { productService } from '@/services/productService'
import { useShopStore } from '@/store/shopStore'
import { cn } from '@utils/cn'
import { formatINR } from '@utils/indianFormat'
import type { Product } from '@/types/product.types'

interface TestimonialPostModalProps {
  products: Product[]
  onClose: () => void
}

type Step = 'review_input' | 'details' | 'generating' | 'review' | 'creating' | 'success' | 'error'
type Platform = 'instagram' | 'facebook' | 'both'

interface PreviewResult {
  imageUrl: string | null
  captions: { instagram: string; facebook: string; hashtags: string[] }
}

const GEN_STEPS = [
  'Writing the caption',
  'Placing product into a scene',
  'Composing the testimonial',
  'Finalizing',
]

export function TestimonialPostModal({ products, onClose }: TestimonialPostModalProps) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { showToast } = useToast()
  const preferredLanguage = useShopStore((s) => s.preferredLanguage)

  const [step, setStep] = useState<Step>('review_input')
  const [reviewText, setReviewText] = useState('')
  const [reviewerName, setReviewerName] = useState('')
  const [selectedProductId, setSelectedProductId] = useState<string>('')
  const [rating, setRating] = useState(5)
  const [platform, setPlatform] = useState<Platform>('both')
  const [selectedLanguage, setSelectedLanguage] = useState<'english' | 'hindi' | 'bilingual'>(preferredLanguage)
  const [errorMessage, setErrorMessage] = useState('')
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')

  const [preview, setPreview] = useState<PreviewResult | null>(null)
  const [editedInstagram, setEditedInstagram] = useState('')
  const [editedFacebook, setEditedFacebook] = useState('')

  // Progress + cancellation (mirrors Collection)
  const [genStepIdx, setGenStepIdx] = useState(0)
  const genTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const [isCancelling, setIsCancelling] = useState(false)
  const abortControllerRef = useRef<AbortController | null>(null)

  const startGenTimer = () => {
    setGenStepIdx(0)
    if (genTimerRef.current) clearInterval(genTimerRef.current)
    genTimerRef.current = setInterval(() => setGenStepIdx((i) => Math.min(i + 1, GEN_STEPS.length - 1)), 5000)
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

  useEffect(() => { setSelectedLanguage(preferredLanguage) }, [preferredLanguage])

  // Debounce search, then fetch the FULL catalogue (not just the passed page)
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 300)
    return () => clearTimeout(t)
  }, [search])

  const { data: productsResp, isLoading: productsLoading } = useQuery({
    queryKey: ['products', 'testimonial-picker', debouncedSearch],
    queryFn: () => productService.getAll({ search: debouncedSearch || undefined, limit: 100 }),
  })
  const sourceProducts: Product[] = productsResp?.data?.data ?? products
  const availableProducts = sourceProducts.filter((p) => p.price)
  const isReviewValid = reviewText.trim().length >= 20
  const hasProduct = !!selectedProductId
  const charCount = reviewText.length
  const showInstagram = platform === 'instagram' || platform === 'both'
  const showFacebook = platform === 'facebook' || platform === 'both'

  // ── Preview mutation — builds the creative + captions ─────────────────────
  const { mutate: runPreview, isPending: isPreviewing } = useMutation({
    mutationFn: () => {
      const controller = new AbortController()
      abortControllerRef.current = controller
      return postService.previewTestimonial({
        reviewText,
        reviewerName: reviewerName || undefined,
        productId: selectedProductId,
        rating,
        platform,
        language: selectedLanguage,
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
      if (isAbortError(error)) { showToast('Testimonial generation cancelled.', 'info'); setIsCancelling(false); setStep('details'); return }
      const msg = (error as { response?: { data?: { error?: string } } })?.response?.data?.error
        || (error as { message?: string })?.message || 'Failed to generate testimonial'
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
      return postService.generateTestimonialPost({
        reviewText,
        reviewerName: reviewerName || undefined,
        productId: selectedProductId,
        rating,
        platform,
        language: selectedLanguage,
        previewImageUrl: preview?.imageUrl ?? undefined,
        captionInstagram: editedInstagram,
        captionFacebook: editedFacebook,
        hashtags: preview?.captions.hashtags,
      }, controller.signal)
    },
    onMutate: () => { setErrorMessage(''); setIsCancelling(false); setStep('creating') },
    onSuccess: () => {
      setStep('success')
      setTimeout(() => {
        showToast('Testimonial post created!', 'success')
        queryClient.invalidateQueries({ queryKey: ['posts'] })
        onClose()
        navigate('/approval')
      }, 1400)
    },
    onError: (error: unknown) => {
      if (isAbortError(error)) { showToast('Cancelled — your creative is still here.', 'info'); setIsCancelling(false); setStep('review'); return }
      const msg = (error as { response?: { data?: { error?: string } } })?.response?.data?.error
        || (error as { message?: string })?.message || 'Failed to create testimonial post'
      setErrorMessage(msg)
      setStep('error')
    },
    onSettled: () => { abortControllerRef.current = null },
  })

  const busy = isPreviewing || isCreating

  const handleCancel = () => {
    setIsCancelling(true)
    abortControllerRef.current?.abort()
    stopGenTimer()
  }

  const handleOpenChange = (open: boolean) => {
    if (!open && !busy && step !== 'success') onClose()
  }

  // ════════════════════════════════════════════════════════════════════════
  // STATUS OVERLAYS
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

                {(step === 'generating' || step === 'creating') && (
                  <div className="space-y-6">
                    <div className="flex items-center gap-3">
                      <motion.div animate={{ scale: isCancelling ? 1 : [1, 1.1, 1] }} transition={{ repeat: isCancelling ? 0 : Infinity, duration: 1.6 }}
                        className={cn('w-10 h-10 rounded-xl flex items-center justify-center shrink-0', isCancelling ? 'bg-red-50' : 'bg-brand-50')}>
                        {isCancelling ? <AlertCircle className="h-5 w-5 text-red-600" /> : <Sparkles className="h-5 w-5 text-brand-600" />}
                      </motion.div>
                      <div>
                        <h3 className="font-display font-semibold text-zinc-900 text-sm">
                          {isCancelling ? 'Cancelling…' : step === 'creating' ? 'Saving your testimonial' : 'Designing your testimonial'}
                        </h3>
                        <p className="text-xs text-zinc-400">Product scene + branded quote</p>
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

                    <div className="h-1.5 rounded-full bg-zinc-100 overflow-hidden">
                      <motion.div className={cn('h-full', isCancelling ? 'bg-red-500' : 'bg-brand-600')}
                        animate={{ width: step === 'creating' ? '95%' : `${Math.round(((genStepIdx + 0.5) / GEN_STEPS.length) * 100)}%` }}
                        transition={{ duration: 0.5 }} />
                    </div>

                    <button onClick={handleCancel} disabled={isCancelling}
                      className="w-full py-2 px-4 rounded-lg border border-red-300 bg-red-50 text-red-700 hover:bg-red-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-xs font-medium">
                      {isCancelling ? '⏸ Cancelling…' : '✕ Cancel'}
                    </button>
                  </div>
                )}

                {step === 'success' && (
                  <motion.div className="text-center space-y-4" initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
                    <div className="w-16 h-16 rounded-full bg-emerald-50 flex items-center justify-center mx-auto">
                      <Check className="h-8 w-8 text-emerald-600" />
                    </div>
                    <div>
                      <h3 className="font-display font-semibold text-lg text-zinc-900">Testimonial post created!</h3>
                      <p className="text-sm text-zinc-500 mt-1">Ready for review in your approval queue</p>
                    </div>
                    <Button variant="primary" className="w-full" onClick={() => { onClose(); navigate('/approval') }}>
                      View in Approval Queue →
                    </Button>
                  </motion.div>
                )}

                {step === 'error' && (
                  <motion.div className="text-center space-y-4" initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
                    <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center mx-auto">
                      <AlertCircle className="h-8 w-8 text-red-600" />
                    </div>
                    <div>
                      <h3 className="font-display font-semibold text-lg text-zinc-900">Something went wrong</h3>
                      <p className="text-sm text-zinc-500 mt-1 break-words">{errorMessage}</p>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="secondary" className="flex-1"
                        onClick={() => { setStep(preview ? 'review' : 'details'); setErrorMessage('') }}>
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
  // REVIEW — creative + editable captions
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
                <div className="flex items-center gap-3 px-5 pt-5 pb-3 shrink-0 border-b border-surface-100">
                  <button onClick={() => setStep('details')}
                    className="w-9 h-9 rounded-xl bg-surface-100 flex items-center justify-center hover:bg-surface-200 transition-colors">
                    <ChevronLeft className="h-4 w-4 text-zinc-600" />
                  </button>
                  <h3 className="font-display font-semibold text-zinc-900 text-sm">Review testimonial</h3>
                </div>

                <div className="overflow-y-auto flex-1 px-5 py-4 space-y-5">
                  {preview.imageUrl && (
                    <div className="rounded-xl overflow-hidden border border-surface-200">
                      <img src={preview.imageUrl} alt="Testimonial creative" className="w-full object-cover" />
                    </div>
                  )}
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
  // FORM — review input + details
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
                  <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center">
                    <Star className="h-4 w-4 text-amber-500" />
                  </div>
                  <h2 className="text-sm font-semibold text-zinc-900">
                    {step === 'review_input' ? 'Create Testimonial Post' : 'Review Settings'}
                  </h2>
                </div>
                <Dialog.Close asChild>
                  <button className="text-zinc-400 hover:text-zinc-600 rounded-lg p-1 transition-colors" disabled={busy}>
                    <X className="h-5 w-5" />
                  </button>
                </Dialog.Close>
              </div>

              {/* CONTENT */}
              <div className="overflow-y-auto flex-1 px-5 py-5">
                {step === 'review_input' && (
                  <div className="space-y-5">
                    {/* Review */}
                    <div>
                      <label className="block text-sm font-semibold text-zinc-900 mb-2">Paste the customer review</label>
                      <textarea value={reviewText} onChange={(e) => setReviewText(e.target.value.slice(0, 160))}
                        placeholder="This product is amazing! The quality is exceptional…"
                        maxLength={160}
                        className="w-full px-3 py-2.5 text-sm border border-surface-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 min-h-24 resize-none" />
                      <div className="flex items-center justify-between mt-2">
                        <p className={cn('text-xs', charCount < 20 ? 'text-red-500' : charCount >= 150 ? 'text-amber-500' : 'text-zinc-400')}>
                          {charCount}/160
                        </p>
                        {charCount >= 20 && <p className="text-xs text-emerald-600">✓ Ready</p>}
                      </div>
                    </div>

                    {/* Rating */}
                    <div>
                      <label className="block text-sm font-semibold text-zinc-900 mb-2">Rating</label>
                      <div className="flex items-center gap-1.5">
                        {[1, 2, 3, 4, 5].map((n) => (
                          <button key={n} onClick={() => setRating(n)} aria-label={`${n} stars`}
                            className="p-0.5 transition-transform active:scale-90">
                            <Star className={cn('h-7 w-7', n <= rating ? 'text-amber-400 fill-amber-400' : 'text-zinc-300')} />
                          </button>
                        ))}
                        <span className="ml-2 text-sm text-zinc-500">{rating}/5</span>
                      </div>
                    </div>

                    {/* Reviewer */}
                    <div>
                      <label className="block text-sm font-semibold text-zinc-900 mb-2">Customer name (optional)</label>
                      <input type="text" value={reviewerName} onChange={(e) => setReviewerName(e.target.value)} placeholder="Priya S."
                        className="w-full px-3 py-2.5 text-sm border border-surface-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500" />
                      <p className="text-xs text-zinc-500 mt-1">Use first name only for privacy</p>
                    </div>

                    {/* Product — REQUIRED (searchable, image-based single select) */}
                    <div>
                      <label className="block text-sm font-semibold text-zinc-900 mb-2">
                        Product <span className="text-red-500">*</span>
                      </label>

                      {/* Search */}
                      <div className="relative mb-2">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
                        <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search products…"
                          className="w-full pl-9 pr-9 py-2.5 text-sm border border-surface-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500" />
                        {search && (
                          <button onClick={() => setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600">
                            <X className="h-4 w-4" />
                          </button>
                        )}
                      </div>

                      {productsLoading ? (
                        <div className="flex items-center justify-center gap-2 py-8 text-sm text-zinc-400">
                          <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                            className="w-4 h-4 rounded-full border-2 border-brand-200 border-t-brand-600" />
                          Loading products…
                        </div>
                      ) : availableProducts.length === 0 ? (
                        <div className="rounded-xl border border-dashed border-zinc-200 bg-zinc-50 p-6 text-center">
                          <p className="text-sm text-zinc-400">
                            {debouncedSearch ? `No products match “${debouncedSearch}”.` : 'No products available.'}
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-2 max-h-56 overflow-y-auto pr-0.5">
                          {availableProducts.map((product) => {
                            const isSelected = selectedProductId === product.id
                            return (
                              <button key={product.id} onClick={() => setSelectedProductId(product.id)}
                                className={cn('w-full flex items-center gap-3 p-2.5 rounded-lg border-2 transition-all text-left',
                                  isSelected ? 'border-brand-600 bg-brand-50' : 'border-surface-200 bg-white hover:border-surface-300')}>
                                <div className={cn('w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0',
                                  isSelected ? 'border-brand-600 bg-brand-600' : 'border-zinc-300')}>
                                  {isSelected && <Check className="h-3 w-3 text-white" />}
                                </div>
                                {product.images?.[0]
                                  ? <img src={product.images[0]} alt={product.title} className="w-10 h-10 rounded object-cover shrink-0" />
                                  : <div className="w-10 h-10 rounded bg-surface-100 shrink-0" />}
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium text-zinc-900 truncate">{product.title}</p>
                                  <p className="text-xs text-zinc-500">{product.price ? formatINR(parseFloat(product.price)) : 'Price TBD'}</p>
                                </div>
                              </button>
                            )
                          })}
                        </div>
                      )}
                      {!hasProduct && <p className="text-xs text-amber-600 mt-1.5">A product is required to build the testimonial creative.</p>}
                    </div>
                  </div>
                )}

                {step === 'details' && (
                  <div className="space-y-6">
                    <div className="bg-surface-50 border border-surface-200 rounded-xl p-4">
                      <div className="flex items-center gap-0.5 mb-2">
                        {[1, 2, 3, 4, 5].map((n) => (
                          <Star key={n} className={cn('h-3.5 w-3.5', n <= rating ? 'text-amber-400 fill-amber-400' : 'text-zinc-300')} />
                        ))}
                      </div>
                      <p className="text-sm text-zinc-900 italic">"{reviewText}"</p>
                      {reviewerName && <p className="text-xs text-zinc-600 mt-2">— {reviewerName}</p>}
                    </div>

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
                      <p className="text-xs text-brand-700">You'll preview the testimonial creative before posting.</p>
                    </div>
                  </div>
                )}
              </div>

              {/* FOOTER */}
              <div className="shrink-0 bg-white border-t border-surface-200 px-5 py-4 flex gap-3">
                {step === 'review_input' && (
                  <>
                    <Dialog.Close asChild>
                      <Button variant="ghost" disabled={busy} className="flex-1 sm:flex-none">Cancel</Button>
                    </Dialog.Close>
                    <Button variant="primary" disabled={!isReviewValid || !hasProduct} className="flex-1"
                      onClick={() => setStep('details')} rightIcon={<ChevronRight className="h-4 w-4" />}>
                      Next
                    </Button>
                  </>
                )}
                {step === 'details' && (
                  <>
                    <Button variant="ghost" disabled={busy} className="flex-1 sm:flex-none" onClick={() => setStep('review_input')}>
                      Back
                    </Button>
                    <Button variant="primary" loading={isPreviewing} disabled={busy} className="flex-1" onClick={() => runPreview()}>
                      Generate Testimonial
                    </Button>
                  </>
                )}
              </div>
            </div>
          </motion.div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
