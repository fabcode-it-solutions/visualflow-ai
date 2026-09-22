import { useState, useEffect, useRef } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { motion, AnimatePresence } from 'framer-motion'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import {
  X, Check, Sparkles,
  RotateCcw, Package, Search,
  ImageIcon, ChevronDown, ChevronUp, ChevronLeft, Paperclip,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { useToast } from '@/hooks/useToast'
import { postService } from '@/services/postService'
import type { ScriptBase } from '@/services/postService'
import { brandService } from '@/services/brandService'
import { uploadService } from '@/services/uploadService'
import { productService } from '@/services/productService'
import { shopService } from '@/services/shopService'
import { useShopStore } from '@/store/shopStore'
import { formatINR } from '@utils/indianFormat'
import { cn } from '@utils/cn'
import type { Product } from '@/types/product.types'

// ─── Types ────────────────────────────────────────────────────────────────────

type ModalPhase =
  | 'config'
  | 'generating_script'
  | 'review_script'
  | 'preview_image'
  | 'creating_post'
  | 'success'

type PostType = 'feed_image' | 'carousel' | 'story' | 'reel'
type Platform = 'instagram' | 'facebook' | 'both'
type Language = 'english' | 'hindi' | 'bilingual'

interface GeneratedScript {
  brandEmotionalGoal: string
  hook: string
  hookExplanation: string
  angle: string
  brandValueThread: string
  trendContext: string
  script: string
  captionInstagram: string
  captionFacebook: string
  instagramHashtags: string[]
  facebookHashtags: string[]
  suggestedAngles: string[]
  imagePromptSuggestion: string

  // Backwards compatibility for older fields
  selectedHook?: string
  hooks?: string[]
  whyThisWorks?: string[]
  hashtags?: {
    trending: string[]
    niche: string[]
    brand: string[]
  }
  captionDraft?: string
  performanceIntent?: {
    primaryGoal: string
    reason: string
  }

  reelScript?: {
    hook_visual: string
    hook_text: string
    scene2_visual: string
    scene2_text: string
    scene3_visual: string
    scene3_text: string
    cta_visual: string
    cta_text: string
    audioMood: string
    totalDuration: string
  }

  carouselSlides?: Array<{
    headline: string
    subtext: string
    visual: string
    cta?: string
  }>

  storyScript?: {
    format: 'new_drop' | 'scarcity' | 'fact_card' | 'social_proof' | 'cta'
    overlayLine1: string
    overlayLine2: string
    ctaSticker: string
    visualDirection: string
  }
}

export interface CreatePostModalProps {
  isOpen: boolean
  onClose: () => void
  defaultProductId?: string
}

// ─── Config ───────────────────────────────────────────────────────────────────

const POST_TYPES: Array<{ type: PostType; emoji: string; label: string; description: string }> = [
  { type: 'feed_image', emoji: '📸', label: 'Feed Post',  description: 'Square or portrait image for feed' },
  { type: 'carousel',   emoji: '🎠', label: 'Carousel',   description: 'Swipe-through multi-slide post'    },
  { type: 'story',      emoji: '📱', label: 'Story',      description: 'Vertical 24-hour story'             },
  { type: 'reel',       emoji: '🎬', label: 'Reel',       description: 'Short video content'               },
]

// Carousel slide roles per count — mirrors backend carouselSlideRoles() (hook first, CTA last)
const CAROUSEL_ROLES_BY_COUNT: Record<number, string[]> = {
  2: ['Hero Hook', 'Brand Statement'],
  3: ['Hero Hook', 'Lifestyle Context', 'Brand Statement'],
  4: ['Hero Hook', 'Craftsmanship Detail', 'Lifestyle Context', 'Brand Statement'],
}
const carouselRolesFor = (count: number): string[] => CAROUSEL_ROLES_BY_COUNT[count] ?? CAROUSEL_ROLES_BY_COUNT[3]!

// Fallback angles if API fails
const DEFAULT_ANGLE_SUGGESTIONS = [
  'Show why this is perfect for gifting',
  'Focus on quality vs cheaper alternatives',
  "Target working women in their 30s",
  "Behind the scenes — how it's made",
]

// Script generation steps with realistic durations (total ~40s backend time)
const SCRIPT_STEPS: { label: string; progressPct: number; durationMs: number }[] = [
  { label: 'Researching market trends…',  progressPct: 15,  durationMs: 8000  },
  { label: 'Analyzing competitors…',      progressPct: 35,  durationMs: 10000 },
  { label: 'Finding your viral angle…',   progressPct: 55,  durationMs: 10000 },
  { label: 'Crafting your script…',       progressPct: 78,  durationMs: 12000 },
  { label: 'Finalizing and polishing…',   progressPct: 92,  durationMs: 20000 },
  { label: 'Script ready!',              progressPct: 100, durationMs: 99999 },
]
// Index of the "done" step — used to snap progress to 100% on API success
const SCRIPT_DONE_IDX = SCRIPT_STEPS.length - 1

// Post generation steps with realistic durations (total ~15s backend time)
const POST_STEPS: { label: string; doneAfterMs: number }[] = [
  { label: 'Script ready',         doneAfterMs: 0     },
  { label: 'Generating image…',    doneAfterMs: 11000 },
  { label: 'Uploading to cloud…',  doneAfterMs: 14000 },
  { label: 'Saving to queue…',     doneAfterMs: 99999 },
]

// Module-scope timer helpers — outside the component so the linter cannot
// misclassify Date.now() calls as occurring during render.
function startScriptTimer(
  intervalRef: React.MutableRefObject<ReturnType<typeof setInterval> | null>,
  startTimeRef: React.MutableRefObject<number>,
  setStep: (n: number) => void,
  setElapsed: (n: number) => void,
) {
  if (intervalRef.current) clearInterval(intervalRef.current)
  startTimeRef.current = Date.now()
  intervalRef.current = setInterval(() => {
    const elapsed = Date.now() - startTimeRef.current
    setElapsed(elapsed)
    let cumulative = 0
    let nextIdx = 0
    // Timed progress must never reach the 100% "done" step. The backend
    // decides completion; otherwise users see 100% while the request is still running.
    for (let i = 0; i < SCRIPT_DONE_IDX; i++) {
      cumulative += SCRIPT_STEPS[i]!.durationMs
      if (elapsed < cumulative) { nextIdx = i; break }
      nextIdx = SCRIPT_DONE_IDX - 1
    }
    setStep(nextIdx)
  }, 500)
}

function getScriptProgress(stepIdx: number, elapsedMs: number): number {
  if (stepIdx >= SCRIPT_DONE_IDX) return 100

  let stepStartMs = 0
  for (let i = 0; i < stepIdx; i++) {
    stepStartMs += SCRIPT_STEPS[i]!.durationMs
  }

  const step = SCRIPT_STEPS[stepIdx]!
  const previousPct = stepIdx === 0 ? 4 : SCRIPT_STEPS[stepIdx - 1]!.progressPct
  const cappedTargetPct = Math.min(step.progressPct, 96)
  const progressWithinStep = Math.min(
    Math.max((elapsedMs - stepStartMs) / step.durationMs, 0),
    1,
  )

  return Math.min(
    Math.round(previousPct + (cappedTargetPct - previousPct) * progressWithinStep),
    96,
  )
}

function startPostTimer(
  intervalRef: React.MutableRefObject<ReturnType<typeof setInterval> | null>,
  startTimeRef: React.MutableRefObject<number>,
  setElapsed: (n: number) => void,
  setStep: (n: number) => void,
) {
  if (intervalRef.current) clearInterval(intervalRef.current)
  startTimeRef.current = Date.now()
  intervalRef.current = setInterval(() => {
    const elapsed = Date.now() - startTimeRef.current
    setElapsed(elapsed)
    let nextIdx = 0
    for (let i = 0; i < POST_STEPS.length; i++) {
      if (elapsed >= POST_STEPS[i]!.doneAfterMs) nextIdx = i + 1
    }
    setStep(Math.min(nextIdx, POST_STEPS.length - 1))
  }, 500)
}



// ─── Component ────────────────────────────────────────────────────────────────

export function CreatePostModal({ isOpen, onClose, defaultProductId }: CreatePostModalProps) {
  const navigate      = useNavigate()
  const { showToast } = useToast()
  const queryClient   = useQueryClient()
  const preferredLanguage = useShopStore(s => s.preferredLanguage)

  // ── Phase & core config state ─────────────────────────────────────────────
  const [phase, setPhase]                         = useState<ModalPhase>('config')
  const [selectedProductId, setSelectedProductId] = useState(defaultProductId ?? '')
  const [selectedPostType, setSelectedPostType]   = useState<PostType>('feed_image')
  const [selectedPlatform, setPlatform]           = useState<Platform>('both')
  const [selectedLanguage, setLanguage]           = useState<Language>(preferredLanguage)
  const [userAngle, setUserAngle]                 = useState('')

  // ── Script review state ───────────────────────────────────────────────────
  const [scriptVariants, setScriptVariants]   = useState<GeneratedScript[]>([])
  const [scriptBase, setScriptBase]           = useState<ScriptBase | null>(null)
  // loadingVariantIdx: which lazy variant (1 or 2) is currently fetching
  const [loadingVariantIdx, setLoadingVariantIdx] = useState<1 | 2 | null>(null)
  const [selectedVariantIdx, setSelectedVariantIdx] = useState(0)
  const [variantPreviews, setVariantPreviews] = useState<(string | null)[]>([])
  const [generatedScript, setGeneratedScript] = useState<GeneratedScript | null>(null)
  const [editedScript, setEditedScript]       = useState('')
  const [editedHook, setEditedHook]           = useState('')
  const [editedImagePrompt, setEditedImagePrompt] = useState('')
  const [editedCarouselSlides, setEditedCarouselSlides] = useState<Array<{ headline: string; subtext: string; visual: string; cta?: string }>>([])
  const [editedCaption, setEditedCaption]     = useState('')
  const [hashtags, setHashtags]               = useState<string[]>([])
  // ── Image Script state ────────────────────────────────────────────────────
  const [editedImageScript, setEditedImageScript] = useState('')
  const [editedCarouselImageScripts, setEditedCarouselImageScripts] = useState<string[]>([])
  const [activeCarouselScriptSlide, setActiveCarouselScriptSlide] = useState(0)
  // ── Carousel slide count (2-4, default 3) + previewed slide URLs (reused on create) ──
  const [carouselSlideCount, setCarouselSlideCount] = useState(3)
  const [carouselPreviewUrls, setCarouselPreviewUrls] = useState<string[]>([])
  const [isSavingImageScript, setIsSavingImageScript] = useState(false)
  const [isImprovingImageScript, setIsImprovingImageScript] = useState(false)

  // ── Per-variant draft persistence ────────────────────────────────────────
  // Keeps edits alive across variant switches, tab switches, and preview generation.
  interface VariantDraft {
    editedScript: string
    editedHook: string
    editedImagePrompt: string
    editedImageScript: string
    editedCarouselSlides: Array<{ headline: string; subtext: string; visual: string; cta?: string }>
    editedCaption: string
    hashtags: string[]
    instagramCaptionPreview: string
    facebookCaptionPreview: string
    instagramHashtagsPreview: string[]
    dirty: boolean
  }
  const variantDraftsRef = useRef<Map<number, VariantDraft>>(new Map())

  const snapshotCurrentDraft = (idx: number): void => {
    variantDraftsRef.current.set(idx, {
      editedScript,
      editedHook,
      editedImagePrompt,
      editedImageScript,
      editedCarouselSlides,
      editedCaption,
      hashtags,
      instagramCaptionPreview,
      facebookCaptionPreview,
      instagramHashtagsPreview,
      dirty: true,
    })
  }

  // ── Tabbed review interface ──────────────────────────────────────────────────
  const [activeReviewTab, setActiveReviewTab]     = useState<'caption' | 'image_script' | 'caption_preview'>('caption')
  const [instagramCaptionPreview, setInstagramCaptionPreview] = useState('')
  const [facebookCaptionPreview, setFacebookCaptionPreview]   = useState('')
  const [instagramHashtagsPreview, setInstagramHashtagsPreview] = useState<string[]>([])
  const [newHashtagPreview, setNewHashtagPreview] = useState('')

  // ── Caption edit detection ────────────────────────────────────────────────────
  const [originalInstagramCaption, setOriginalInstagramCaption] = useState('')
  const [originalFacebookCaption, setOriginalFacebookCaption]   = useState('')
  const [showCaptionWarning, setShowCaptionWarning]             = useState(false)
  const [isImprovingCaption, setIsImprovingCaption]             = useState(false)
  const [captionBeforeImprovement, setCaptionBeforeImprovement] = useState('')
  const [showCaptionDiff, setShowCaptionDiff]                   = useState(false)

  // ── Image preview state ───────────────────────────────────────────────────
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null)
  const [previewError, setPreviewError]       = useState<string | null>(null)


  // ── Per-post reference images (config phase upload) ───────────────────────
  const [refImagesExpanded, setRefImagesExpanded] = useState(false)
  const [referenceImages, setReferenceImages]     = useState<string[]>([])
  const [refUploadErrors, setRefUploadErrors]     = useState<string[]>([])
  const [uploadingRefCount, setUploadingRefCount] = useState(0)

  // ── Cancellation handling ─────────────────────────────────────────────────
  const [isCancelling, setIsCancelling]                         = useState(false)
  const abortControllerRef                                      = useRef<AbortController | null>(null)
  const [phaseBeforeGeneration, setPhaseBeforeGeneration]       = useState<ModalPhase | null>(null)
  const [lastGenerationConfig, setLastGenerationConfig]         = useState<{
    productId: string
    postType: PostType
    platform: Platform
    language: Language
    userAngle: string
  } | null>(null)

  // ── Brand-aligned angle suggestions ───────────────────────────────────────
  const [brandAlignedAngles, setBrandAlignedAngles]             = useState<string[]>([])
  const [loadingAngles, setLoadingAngles]                       = useState(false)

  // Helper: calculate similarity between two strings (0-100, where 100 = identical)
  const calculateSimilarity = (original: string, edited: string): number => {
    if (!original) return 100
    const origWords = original.toLowerCase().split(/\s+/)
    const editedWords = edited.toLowerCase().split(/\s+/)
    const maxLen = Math.max(origWords.length, editedWords.length)
    if (maxLen === 0) return 100
    const matches = origWords.filter((w, i) => w === editedWords[i]).length
    return Math.round((matches / maxLen) * 100)
  }

  // Heavy edit threshold: <70% word retention = significant change
  const isHeavyEdit = (original: string, edited: string): boolean => {
    return calculateSimilarity(original, edited) < 70
  }

  // Compute word-level diff between two captions
  type DiffSegment = { type: 'added' | 'removed' | 'unchanged'; text: string }
  const computeCaptionDiff = (before: string, after: string): DiffSegment[] => {
    const beforeWords = before.split(/(\s+)/)
    const afterWords = after.split(/(\s+)/)
    const result: DiffSegment[] = []

    let i = 0, j = 0
    while (i < beforeWords.length || j < afterWords.length) {
      if (i >= beforeWords.length) {
        // Remaining words in after are additions
        result.push({ type: 'added', text: afterWords[j]! })
        j++
      } else if (j >= afterWords.length) {
        // Remaining words in before are removals
        result.push({ type: 'removed', text: beforeWords[i]! })
        i++
      } else if (beforeWords[i] === afterWords[j]) {
        // Match found
        result.push({ type: 'unchanged', text: beforeWords[i]! })
        i++
        j++
      } else {
        // Find next matching word to decide if it's an addition or removal
        const nextMatchInAfter = afterWords.findIndex((w, idx) => idx > j && beforeWords.some((bw, bi) => bi > i && bw === w))
        const nextMatchInBefore = beforeWords.findIndex((w, idx) => idx > i && afterWords.some((aw, aj) => aj > j && aw === w))

        if (nextMatchInAfter !== -1 && (nextMatchInBefore === -1 || nextMatchInAfter - j < nextMatchInBefore - i)) {
          // Likely a removal
          result.push({ type: 'removed', text: beforeWords[i]! })
          i++
        } else {
          // Likely an addition
          result.push({ type: 'added', text: afterWords[j]! })
          j++
        }
      }
    }

    return result
  }

  // ── Regenerate popover ────────────────────────────────────────────────────
  const [showRegenPopover, setShowRegenPopover] = useState(false)
  const [regenNote, setRegenNote]               = useState('')

  // ── Time-based step progression (synced to realistic backend durations) ────
  const [scriptStepIdx, setScriptStepIdx] = useState(0)
  const [scriptElapsedMs, setScriptElapsedMs] = useState(0)
  const [postStepIdx,   setPostStepIdx]   = useState(0)
  const [postElapsedMs, setPostElapsedMs] = useState(0)
  const intervalRef                       = useRef<ReturnType<typeof setInterval> | null>(null)
  const startTimeRef                      = useRef<number>(0)
  const phaseTransitionRef                = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ── Product search ────────────────────────────────────────────────────────
  const [productSearch, setProductSearch]           = useState('')
  const [showProductDropdown, setShowProductDropdown] = useState(false)

  // ── Reset on close ────────────────────────────────────────────────────────
  const resetModal = () => {
    setPhase('config')
    setSelectedProductId(defaultProductId ?? '')
    setSelectedPostType('feed_image')
    setPlatform('both')
    setLanguage(preferredLanguage)
    setUserAngle('')
    setGeneratedScript(null)
    setScriptStepIdx(0)
    setScriptElapsedMs(0)
    setPostStepIdx(0)
    setPostElapsedMs(0)
    setScriptVariants([])
    setScriptBase(null)
    setLoadingVariantIdx(null)
    setSelectedVariantIdx(0)
    setVariantPreviews([])
    variantDraftsRef.current.clear()
    setEditedScript('')
    setEditedCaption('')
    setEditedHook('')
    setEditedImagePrompt('')
    setEditedImageScript('')
    setEditedCarouselSlides([])
    setEditedCarouselImageScripts([])
    setActiveCarouselScriptSlide(0)
    setCarouselSlideCount(3)
    setCarouselPreviewUrls([])
    setHashtags([])
    setProductSearch('')
    setShowProductDropdown(false)
    setShowRegenPopover(false)
    setRegenNote('')
    setActiveReviewTab('caption')
    setInstagramCaptionPreview('')
    setFacebookCaptionPreview('')
    setInstagramHashtagsPreview([])
    setNewHashtagPreview('')
    setOriginalInstagramCaption('')
    setOriginalFacebookCaption('')
    setShowCaptionWarning(false)
    setIsImprovingCaption(false)
    setLastGenerationConfig(null)
    setPreviewImageUrl(null)
    setPreviewError(null)
    setRefImagesExpanded(false)
    setReferenceImages([])
    setRefUploadErrors([])
    setUploadingRefCount(0)
    if (intervalRef.current) clearInterval(intervalRef.current)
  }

  // ── Fetch products ────────────────────────────────────────────────────────
  const { data: productsData, isLoading: isLoadingProducts } = useQuery({
    queryKey: ['products', 'for-modal'],
    queryFn: () => productService.getAll({ limit: 100 }),
    enabled: isOpen,
    staleTime: 5 * 60 * 1000,
  })

  const allProducts      = productsData?.data.data ?? []
  const eligibleProducts = allProducts.filter(p => p.isActive && p.inventoryQuantity > 0)
  const filteredProducts = productSearch.trim()
    ? eligibleProducts.filter(p => p.title.toLowerCase().includes(productSearch.toLowerCase()))
    : eligibleProducts
  const selectedProduct  = eligibleProducts.find(p => p.id === selectedProductId) ?? null

  // ── Fetch onboarding data (for brand personality) ────────────────────────
  const { data: onboardingData } = useQuery({
    queryKey: ['onboarding-data'],
    queryFn: () => shopService.getOnboardingData(),
    enabled: isOpen,
    staleTime: 10 * 60 * 1000,
  })

  const brandPersonality    = onboardingData?.brand?.brandPersonality ?? 'Modern & Clean'
  const brandName           = onboardingData?.brand?.brandName ?? 'Your Brand'
  const brandPrimaryColor   = (onboardingData?.brand as { primaryColor?: string } | undefined)?.primaryColor ?? null
  const brandSecondaryColor = (onboardingData?.brand as { secondaryColor?: string } | undefined)?.secondaryColor ?? null
  const brandAccentColor    = (onboardingData?.brand as { accentColor?: string } | undefined)?.accentColor ?? null
  const brandPhotoStyle     = (onboardingData?.brand as { photoStyle?: string } | undefined)?.photoStyle ?? null

  // ── Fetch brand-aligned angles based on selected product ──────────────────
  useEffect(() => {
    const fetchAngles = async () => {
      if (!selectedProductId) {
        console.log('[Angles] No product selected')
        setBrandAlignedAngles([])
        return
      }

      const category = selectedProduct?.category || 'General'
      console.log('[Angles] Fetching for product:', { selectedProductId, category })
      setLoadingAngles(true)
      try {
        const response = await postService.getBrandAlignedAngles(category)
        console.log('[Angles] API Response:', response.data)
        setBrandAlignedAngles(response.data.angles || [])
      } catch (error) {
        console.error('[Angles] Failed to fetch:', error)
        setBrandAlignedAngles([])
      } finally {
        setLoadingAngles(false)
      }
    }

    fetchAngles()
  }, [selectedProductId])

  // ── Apply a variant — saves current draft first, then restores or initializes ──
  const applyVariant = (script: GeneratedScript, newIdx: number, fromIdx?: number) => {
    // Save edits for the variant we're leaving (skip on first load — fromIdx undefined)
    if (fromIdx !== undefined) snapshotCurrentDraft(fromIdx)

    setGeneratedScript(script)

    const existing = variantDraftsRef.current.get(newIdx)
    if (existing) {
      // Restore previously saved edits for this variant
      setEditedScript(existing.editedScript)
      setEditedHook(existing.editedHook)
      setEditedImagePrompt(existing.editedImagePrompt)
      setEditedImageScript(existing.editedImageScript || existing.editedImagePrompt)
      setEditedCarouselSlides(existing.editedCarouselSlides)
      setEditedCaption(existing.editedCaption)
      setHashtags(existing.hashtags)
      setInstagramCaptionPreview(existing.instagramCaptionPreview)
      setFacebookCaptionPreview(existing.facebookCaptionPreview)
      setInstagramHashtagsPreview(existing.instagramHashtagsPreview)
    } else {
      // First time on this variant — initialize from AI content
      const igCaption = script.captionInstagram
      const fbCaption = script.captionFacebook
      setEditedScript(script.script)
      setEditedHook(script.hook || script.selectedHook || '')
      setEditedImagePrompt(script.imagePromptSuggestion || '')
      setEditedImageScript(script.imagePromptSuggestion || '')
      const carouselSlides = Array.isArray(script.carouselSlides) && script.carouselSlides.length >= 2
        ? script.carouselSlides.map(s => ({ headline: s.headline, subtext: s.subtext ?? '', visual: s.visual, cta: s.cta }))
        : []
      setEditedCarouselSlides(carouselSlides)
      setEditedCarouselImageScripts(carouselSlides.map(s => s.visual))
      // Keep the slide-count selector in sync with what the AI returned
      if (carouselSlides.length >= 2) setCarouselSlideCount(carouselSlides.length)
      setEditedCaption(script.captionDraft || igCaption || '')
      setHashtags(script.hashtags
        ? [...(script.hashtags.trending ?? []), ...(script.hashtags.niche ?? []), ...(script.hashtags.brand ?? [])]
        : script.instagramHashtags || [])
      setInstagramCaptionPreview(igCaption)
      setFacebookCaptionPreview(fbCaption)
      setInstagramHashtagsPreview(script.instagramHashtags || [])
      setOriginalInstagramCaption(igCaption)
      setOriginalFacebookCaption(fbCaption)
    }

    // Restore preview for this variant (already tracked separately)
    setPreviewImageUrl(variantPreviews[newIdx] ?? null)
    setPreviewError(null)
  }

  // ── Generate script mutation ──────────────────────────────────────────────
  const { mutate: runGenerateScript, isPending: isGeneratingScript } = useMutation({
    mutationFn: () => {
      const controller = new AbortController()
      abortControllerRef.current = controller
      return postService.generateScript({
        productId:       selectedProductId,
        postType:        selectedPostType,
        platform:        selectedPlatform,
        language:        selectedLanguage,
        userAngle:       userAngle.trim() || undefined,
        referenceImages: referenceImages.length > 0 ? referenceImages : undefined,
        slideCount:      selectedPostType === 'carousel' ? carouselSlideCount : undefined,
      }, controller.signal)
    },
    onMutate: () => {
      // Save current phase so we can return here if cancelled
      setPhaseBeforeGeneration(phase)
      // Save current config for resume on cancellation
      setLastGenerationConfig({
        productId: selectedProductId,
        postType: selectedPostType,
        platform: selectedPlatform,
        language: selectedLanguage,
        userAngle,
      })
      setPhase('generating_script')
      setScriptStepIdx(0)
      setScriptElapsedMs(0)
      setIsCancelling(false)
      startScriptTimer(intervalRef, startTimeRef, setScriptStepIdx, setScriptElapsedMs)
    },
    onSuccess: (res) => {
      if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null }
      const { variant, base } = res.data

      // Snap to 100% then transition after a brief flash
      setScriptStepIdx(SCRIPT_DONE_IDX)
      setScriptElapsedMs(0)

      if (phaseTransitionRef.current) clearTimeout(phaseTransitionRef.current)
      phaseTransitionRef.current = setTimeout(() => {
        phaseTransitionRef.current = null
        // Only variant 0 is ready — placeholders for 1 and 2
        setScriptVariants([variant, null as unknown as GeneratedScript, null as unknown as GeneratedScript])
        setScriptBase(base)
        setSelectedVariantIdx(0)
        setVariantPreviews([null, null, null])
        variantDraftsRef.current.clear()

        applyVariant(variant, 0)

        // Stories have no caption/hashtags — open straight to the visual tab
        setActiveReviewTab(selectedPostType === 'story' ? 'image_script' : 'caption')
        setShowCaptionWarning(false)
        setLastGenerationConfig(null)
        setPhase('review_script')
      }, 600)
    },
    onError: (err: unknown) => {
      if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null }
      if (phaseTransitionRef.current) { clearTimeout(phaseTransitionRef.current); phaseTransitionRef.current = null }
      setScriptStepIdx(0)
      setScriptElapsedMs(0)
      abortControllerRef.current = null

      // Check if error is due to cancellation — keep config so user can resume
      const errName = (err as { name?: string })?.name
      if (errName === 'AbortError' || isCancelling) {
        showToast('Script generation cancelled. You can resume with your saved settings.', 'info')
        setPhase(phaseBeforeGeneration === 'review_script' ? 'review_script' : 'config')
        setIsCancelling(false)
        // Keep lastGenerationConfig for resume — don't clear it
        return
      }

      // Real error — clear the saved config so resume UI does NOT appear
      setLastGenerationConfig(null)

      // Extract clean message from raw API error (may be nested Anthropic JSON)
      const raw = (err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? ''
      let msg = 'Something went wrong generating the script. Please try again.'

      if (raw.includes('credit balance') || raw.includes('credits')) {
        msg = 'Your Anthropic API credits are exhausted. Please top up at console.anthropic.com to continue.'
      } else if (raw.includes('timeout') || raw.includes('timed out')) {
        msg = 'Script generation timed out. Please try again.'
      } else if (raw.includes('rate_limit') || raw.includes('rate limit')) {
        msg = 'Too many requests. Please wait a moment and try again.'
      } else if (raw.includes('unavailable') || raw.includes('overloaded')) {
        msg = 'AI service is temporarily unavailable. Please try again in a moment.'
      } else if (raw.includes('invalid_request') || raw.includes('validation')) {
        msg = 'Invalid request. Please check your product and brand settings.'
      } else if (raw && !raw.startsWith('{') && raw.length < 200) {
        // Short readable string — show as-is
        msg = raw
      }

      showToast(msg, 'error')
      setPhase(phaseBeforeGeneration === 'review_script' ? 'review_script' : 'config')
    },
  })

  // ── Generate post mutation ────────────────────────────────────────────────
  const { mutate: runGeneratePost, isPending: isCreatingPost } = useMutation({
    mutationFn: () => postService.generatePosts({
      productId:  selectedProductId,
      postTypes:  [selectedPostType],
      platform:   selectedPlatform,
      language:   selectedLanguage,
      scriptOverride: {
        // Stories don't use captions/hashtags — IG/FB Stories ignore them at publish
        captionInstagram: selectedPostType === 'story' ? undefined : ((instagramCaptionPreview || editedCaption) || undefined),
        captionFacebook:  selectedPostType === 'story' ? undefined : ((facebookCaptionPreview || editedCaption) || undefined),
        hashtags: selectedPostType === 'story' ? undefined : (instagramHashtagsPreview.length > 0 ? instagramHashtagsPreview : (hashtags.length > 0 ? hashtags : undefined)),
        hook: editedHook || undefined,
        angle: generatedScript?.angle,
        brandEmotionalGoal: generatedScript?.brandEmotionalGoal,
        imagePromptSuggestion: editedImagePrompt || undefined,
        imageScript: editedImageScript || editedImagePrompt || undefined,
        carouselImageScripts: selectedPostType === 'carousel' && editedCarouselImageScripts.some(s => s.trim()) ? editedCarouselImageScripts : undefined,
        referenceImages: referenceImages.length > 0 ? referenceImages : undefined,
        previewImageUrl: previewImageUrl || undefined,
        carouselPreviewUrls: selectedPostType === 'carousel' && carouselPreviewUrls.length >= 2 ? carouselPreviewUrls : undefined,
        slideCount: selectedPostType === 'carousel' ? carouselSlideCount : undefined,
        carouselSlides: selectedPostType === 'carousel' && editedCarouselSlides.length > 0 ? editedCarouselSlides : undefined,
      },
    }),
    onMutate: () => {
      setPhase('creating_post')
      setPostStepIdx(0)
      setPostElapsedMs(0)
      startPostTimer(intervalRef, startTimeRef, setPostElapsedMs, setPostStepIdx)
    },
    onSuccess: () => {
      if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null }
      setPhase('success')
      void queryClient.invalidateQueries({ queryKey: ['posts'] })
      setTimeout(() => { onClose(); navigate('/approval') }, 3000)
    },
    onError: (err: unknown) => {
      if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null }
      const raw = (err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? ''
      const msg = raw.includes('image')
        ? 'Image generation failed. Please try again.'
        : raw.includes('limit') || raw.includes('quota')
        ? 'Image quota reached. Please try again tomorrow.'
        : raw || 'Something went wrong creating your post. Please try again.'
      showToast(msg, 'error')
      setPhase('review_script')
    },
  })

  // ── Preview image mutation ────────────────────────────────────────────────
  const { mutate: runPreviewImage, isPending: isPreviewPending } = useMutation({
    mutationFn: () => postService.previewImage({
      imagePromptSuggestion: editedImageScript || editedImagePrompt || undefined,
      hook: editedHook || undefined,
      brandPersonality,
      primaryColor:   brandPrimaryColor,
      secondaryColor: brandSecondaryColor,
      accentColor:    brandAccentColor,
      photoStyle:     brandPhotoStyle,
      postType:       selectedPostType,
      productImageUrl: selectedProduct?.images[0] ?? null,
      productName:    selectedProduct?.title ?? undefined,
      productCategory: selectedProduct?.category ?? undefined,
    }),
    onMutate: () => {
      setPreviewImageUrl(null)
      setPreviewError(null)
      setPhase('preview_image')
    },
    onSuccess: (res: { data: { previewUrl: string | null } }) => {
      const url = res.data.previewUrl
      setPreviewImageUrl(url)
      if (url) {
        setVariantPreviews(prev => {
          const next = [...prev]
          next[selectedVariantIdx] = url
          return next
        })
      }
    },
    onError: () => {
      setPreviewError('Image preview failed. You can still create the post.')
    },
  })

  // ── Carousel preview mutation — generates ALL slides, reused on create ─────
  const { mutate: runPreviewCarousel, isPending: isCarouselPreviewPending } = useMutation({
    mutationFn: () => postService.previewCarousel({
      productId:            selectedProductId,
      slideCount:           carouselSlideCount,
      hook:                 editedHook || undefined,
      angle:                generatedScript?.angle,
      language:             selectedLanguage,
      carouselImageScripts: editedCarouselImageScripts.some(s => s.trim()) ? editedCarouselImageScripts : undefined,
      slideTexts:           editedCarouselSlides.length > 0 ? editedCarouselSlides.map(s => s.headline) : undefined,
      slideSubtexts:        editedCarouselSlides.length > 0 ? editedCarouselSlides.map(s => s.subtext) : undefined,
    }),
    onMutate: () => {
      setCarouselPreviewUrls([])
      setPreviewImageUrl(null)
      setPreviewError(null)
      setPhase('preview_image')
    },
    onSuccess: (res: { data: { slides: string[]; slideCount: number } }) => {
      const slides = res.data.slides ?? []
      setCarouselPreviewUrls(slides)
      setPreviewImageUrl(slides[0] ?? null)
    },
    onError: () => {
      setPreviewError('Carousel preview failed. You can still create the post.')
    },
  })

  // Unified preview trigger — carousel previews all slides, others preview one image
  const runPreview = () => {
    if (selectedPostType === 'carousel') runPreviewCarousel()
    else runPreviewImage()
  }
  const isAnyPreviewPending = isPreviewPending || isCarouselPreviewPending


  const handleOpenChange = (open: boolean) => {
    if (!open && phase !== 'creating_post' && phase !== 'success') {
      resetModal()
      onClose()
    }
  }

  const handleSelectProduct = (p: Product) => {
    setSelectedProductId(p.id)
    setProductSearch('')
    setShowProductDropdown(false)
  }

  // Cancel script generation
  const handleCancelScriptGeneration = () => {
    setIsCancelling(true)
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }

  const improveCaption = async () => {
    if (!generatedScript) return

    setIsImprovingCaption(true)
    try {
      // Call backend endpoint to improve caption
      const response = await fetch('/api/posts/improve-caption', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userCaption: instagramCaptionPreview,
          originalCaption: originalInstagramCaption,
          brandPersonality,
          brandEmotionalGoal: generatedScript.brandEmotionalGoal,
          scriptContext: editedScript,
          brandName,
        }),
      })

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`)
      }

      const data = await response.json()
      const improvedCaption = data?.data?.improvedCaption || data?.improvedCaption

      if (!improvedCaption || typeof improvedCaption !== 'string') {
        throw new Error('Invalid response format from server')
      }

      setCaptionBeforeImprovement(instagramCaptionPreview)
      setInstagramCaptionPreview(improvedCaption)
      setShowCaptionDiff(true)
      setShowCaptionWarning(false)
      showToast('Caption improved! ✨', 'success')
    } catch (err) {
      showToast(
        err instanceof Error && err.message.includes('API error')
          ? 'Caption improvement feature is being set up. Try again soon!'
          : 'Failed to improve caption. Please try again.',
        'error'
      )
    } finally {
      setIsImprovingCaption(false)
    }
  }

  const improveCaptionFacebook = async () => {
    if (!generatedScript) return

    setIsImprovingCaption(true)
    try {
      // Call backend endpoint to improve caption
      const response = await fetch('/api/posts/improve-caption', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userCaption: facebookCaptionPreview,
          originalCaption: originalFacebookCaption,
          brandPersonality,
          brandEmotionalGoal: generatedScript.brandEmotionalGoal,
          scriptContext: editedScript,
          brandName,
        }),
      })

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`)
      }

      const data = await response.json()
      const improvedCaption = data?.data?.improvedCaption || data?.improvedCaption

      if (!improvedCaption || typeof improvedCaption !== 'string') {
        throw new Error('Invalid response format from server')
      }

      setCaptionBeforeImprovement(facebookCaptionPreview)
      setFacebookCaptionPreview(improvedCaption)
      setShowCaptionDiff(true)
      setShowCaptionWarning(false)
      showToast('Facebook caption improved! ✨', 'success')
    } catch (err) {
      showToast(
        err instanceof Error && err.message.includes('API error')
          ? 'Caption improvement feature is being set up. Try again soon!'
          : 'Failed to improve caption. Please try again.',
        'error'
      )
    } finally {
      setIsImprovingCaption(false)
    }
  }

  // ── Loading / transition phases ───────────────────────────────────────────

  if (phase === 'generating_script') {
    const currentStep = SCRIPT_STEPS[scriptStepIdx]!
    const progressPct = getScriptProgress(scriptStepIdx, scriptElapsedMs)
    return (
      <Dialog.Root open={isOpen} onOpenChange={handleOpenChange}>
        <Dialog.Portal forceMount>
          <Dialog.Overlay className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm" />
          <Dialog.Content className="fixed z-50 inset-0 flex items-end sm:items-center justify-center">
            <div className="bg-white w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl shadow-xl p-8 flex flex-col gap-6">
              {/* Icon */}
              <div className="flex justify-center">
                <motion.div
                  animate={{ scale: [1, 1.12, 1], opacity: [0.8, 1, 0.8] }}
                  transition={{ repeat: Infinity, duration: 2 }}
                  className="w-14 h-14 rounded-2xl bg-brand-50 flex items-center justify-center"
                >
                  <Sparkles className="h-7 w-7 text-brand-600" />
                </motion.div>
              </div>

              {/* Step label + % */}
              <div className="text-center space-y-1">
                <AnimatePresence mode="wait">
                  <motion.p
                    key={scriptStepIdx}
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -5 }}
                    transition={{ duration: 0.3 }}
                    className="font-display font-semibold text-base text-zinc-900"
                  >
                    {currentStep.label}
                  </motion.p>
                </AnimatePresence>
                <p className="text-xs text-zinc-400">Crafting a viral script for your product</p>
              </div>

              {/* Progress bar */}
              <div>
                <div className="flex justify-between text-xs text-zinc-400 mb-1.5">
                  <span>Step {Math.min(scriptStepIdx + 1, SCRIPT_DONE_IDX)} of {SCRIPT_DONE_IDX}</span>
                  <span className="font-semibold text-brand-600 tabular-nums">{progressPct}%</span>
                </div>
                <div className="relative w-full h-2 bg-surface-100 rounded-full overflow-hidden">
                  <motion.div
                    className="relative h-full overflow-hidden rounded-full bg-linear-to-r from-brand-500 via-brand-600 to-brand-500"
                    animate={{ width: `${progressPct}%` }}
                    transition={{ duration: 0.45, ease: 'easeOut' }}
                  >
                    <motion.div
                      className="absolute inset-y-0 -left-1/2 w-1/2 bg-linear-to-r from-transparent via-white/45 to-transparent"
                      animate={{ x: ['0%', '300%'] }}
                      transition={{ repeat: Infinity, duration: 1.25, ease: 'linear' }}
                    />
                  </motion.div>
                  {scriptStepIdx < SCRIPT_DONE_IDX && (
                    <motion.div
                      className="absolute inset-0 rounded-full bg-brand-500/10"
                      animate={{ opacity: [0.15, 0.45, 0.15] }}
                      transition={{ repeat: Infinity, duration: 1.6, ease: 'easeInOut' }}
                    />
                  )}
                </div>
              </div>

              {/* Step list */}
              <div className="space-y-2">
                {SCRIPT_STEPS.slice(0, SCRIPT_DONE_IDX).map(({ label }, i) => {
                  const allDone  = scriptStepIdx === SCRIPT_DONE_IDX
                  const isDone   = allDone || i < scriptStepIdx
                  const isActive = !allDone && i === scriptStepIdx
                  return (
                    <div key={label} className="flex items-center gap-2.5">
                      <div className={cn(
                        'w-4 h-4 rounded-full flex items-center justify-center shrink-0',
                        isDone ? 'bg-emerald-100' : isActive ? 'bg-brand-100' : 'bg-zinc-100',
                      )}>
                        {isDone
                          ? <Check className="h-2.5 w-2.5 text-emerald-600" />
                          : isActive
                          ? <div className="w-2 h-2 rounded-full bg-brand-600 animate-pulse" />
                          : <div className="w-1.5 h-1.5 rounded-full bg-zinc-300" />}
                      </div>
                      <span className={cn(
                        'text-xs font-medium',
                        isDone ? 'text-emerald-700' : isActive ? 'text-zinc-900' : 'text-zinc-400',
                      )}>
                        {label}
                      </span>
                    </div>
                  )
                })}
              </div>

              {/* Timing & Cancel Button */}
              <div className="space-y-3">
                <p className="text-center text-xs text-zinc-400">Takes about 30–45 seconds</p>
                <button
                  onClick={handleCancelScriptGeneration}
                  disabled={isCancelling}
                  className="w-full py-2 px-4 rounded-lg border border-red-300 bg-red-50 text-red-700 hover:bg-red-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-xs font-medium"
                >
                  {isCancelling ? '⏸ Cancelling...' : '✕ Cancel'}
                </button>
              </div>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    )
  }

  if (phase === 'preview_image') {
    return (
      <Dialog.Root open={isOpen} onOpenChange={handleOpenChange}>
        <Dialog.Portal forceMount>
          <Dialog.Overlay className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm" />
          <Dialog.Content className="fixed z-50 inset-0 flex items-end sm:items-center justify-center">
            <div className="bg-white w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl shadow-xl flex flex-col max-h-[92dvh]">
              {/* Header — fixed */}
              <div className="flex items-center gap-3 px-5 pt-5 pb-4 shrink-0">
                <button
                  onClick={() => setPhase('review_script')}
                  className="w-9 h-9 rounded-xl bg-surface-100 flex items-center justify-center shrink-0 hover:bg-surface-200 transition-colors"
                  aria-label="Back to script"
                >
                  <ChevronLeft className="h-4 w-4 text-zinc-600" />
                </button>
                <div className="w-9 h-9 rounded-xl bg-brand-50 flex items-center justify-center shrink-0">
                  <ImageIcon className="h-4.5 w-4.5 text-brand-600" />
                </div>
                <div>
                  <h3 className="font-display font-semibold text-zinc-900 text-sm">Image Preview</h3>
                  <p className="text-xs text-zinc-400">
                    {selectedPostType === 'carousel' ? `${carouselSlideCount}-slide carousel` : 'AI-generated visual for your post'}
                  </p>
                </div>
              </div>

              {/* Scrollable image area */}
              <div className="flex-1 overflow-y-auto px-5 min-h-0">
                {isAnyPreviewPending && (
                  <div className="flex flex-col items-center justify-center gap-3 py-16">
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ repeat: Infinity, duration: 1.2, ease: 'linear' }}
                      className="w-8 h-8 rounded-full border-2 border-brand-200 border-t-brand-600"
                    />
                    <p className="text-sm text-zinc-500">
                      {selectedPostType === 'carousel' ? `Generating all ${carouselSlideCount} slides…` : 'Generating image preview…'}
                    </p>
                  </div>
                )}

                {/* Carousel: horizontal swipe of all slides */}
                {!isAnyPreviewPending && selectedPostType === 'carousel' && carouselPreviewUrls.length > 0 && (
                  <div className="flex gap-3 overflow-x-auto snap-x snap-mandatory pb-2">
                    {carouselPreviewUrls.map((url, i) => (
                      <div key={i} className="shrink-0 w-[78%] snap-center rounded-xl overflow-hidden border border-surface-200 relative">
                        <img src={url} alt={`Slide ${i + 1}`} className="w-full object-cover" />
                        <span className="absolute top-2 right-2 text-[10px] font-bold text-white bg-black/55 rounded-full px-2 py-0.5">{i + 1}/{carouselPreviewUrls.length}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Single image (feed/story/reel) */}
                {!isAnyPreviewPending && selectedPostType !== 'carousel' && previewImageUrl && (
                  <div className="rounded-xl overflow-hidden border border-surface-200">
                    <img src={previewImageUrl} alt="Post preview" className="w-full object-cover" />
                  </div>
                )}

                {!isAnyPreviewPending && previewError && (
                  <p className="text-sm text-red-500 py-4">{previewError}</p>
                )}
              </div>

              {/* Action buttons — always visible at bottom */}
              <div className="px-5 py-4 shrink-0 border-t border-surface-100">
                {!isAnyPreviewPending && (previewImageUrl || carouselPreviewUrls.length > 0) && (
                  <div className="flex gap-3">
                    <Button variant="secondary" className="flex-1" onClick={() => runPreview()}>
                      Regenerate
                    </Button>
                    <Button variant="primary" className="flex-1" onClick={() => runGeneratePost()}>
                      Looks good — Create Post
                    </Button>
                  </div>
                )}
                {!isAnyPreviewPending && previewError && !previewImageUrl && carouselPreviewUrls.length === 0 && (
                  <div className="flex gap-3">
                    <Button variant="secondary" className="flex-1" onClick={() => runPreview()}>
                      Regenerate
                    </Button>
                    <Button variant="primary" className="flex-1" onClick={() => runGeneratePost()}>
                      Skip Preview &amp; Create Post
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    )
  }

  if (phase === 'creating_post') {
    return (
      <Dialog.Root open={isOpen} onOpenChange={handleOpenChange}>
        <Dialog.Portal forceMount>
          <Dialog.Overlay className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm" />
          <Dialog.Content className="fixed z-50 inset-0 flex items-end sm:items-center justify-center">
            <div className="bg-white w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl shadow-xl p-8 space-y-5">
              <div className="flex items-center gap-3">
                <motion.div
                  animate={{ scale: [1, 1.1, 1] }}
                  transition={{ repeat: Infinity, duration: 1.6 }}
                  className="w-9 h-9 rounded-xl bg-brand-50 flex items-center justify-center shrink-0"
                >
                  <Sparkles className="h-4.5 w-4.5 text-brand-600" />
                </motion.div>
                <div>
                  <h3 className="font-display font-semibold text-zinc-900 text-sm">Creating your post…</h3>
                  <p className="text-xs text-zinc-400">Usually takes 10–20 seconds</p>
                </div>
              </div>

              <div className="space-y-2.5">
                {POST_STEPS.map(({ label, doneAfterMs }, i) => {
                  const isDone   = i < postStepIdx || (doneAfterMs !== 99999 && postElapsedMs >= doneAfterMs)
                  const isActive = i === postStepIdx && !isDone
                  return (
                    <div key={label} className="flex items-center gap-3">
                      <div className={cn(
                        'w-5 h-5 rounded-full flex items-center justify-center shrink-0',
                        isDone ? 'bg-emerald-100' : isActive ? 'bg-brand-100' : 'bg-zinc-100',
                      )}>
                        {isDone
                          ? <Check className="h-3 w-3 text-emerald-600" />
                          : isActive
                          ? <div className="w-2.5 h-2.5 rounded-full bg-brand-600 animate-pulse" />
                          : <div className="w-2 h-2 rounded-full bg-zinc-300" />}
                      </div>
                      <p className={cn(
                        'text-sm font-medium',
                        isDone ? 'text-emerald-700' : isActive ? 'text-zinc-900' : 'text-zinc-400',
                      )}>
                        {label}
                      </p>
                    </div>
                  )
                })}
              </div>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    )
  }

  if (phase === 'success') {
    return (
      <Dialog.Root open={isOpen} onOpenChange={handleOpenChange}>
        <Dialog.Portal forceMount>
          <Dialog.Overlay className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm" />
          <Dialog.Content className="fixed z-50 inset-0 flex items-end sm:items-center justify-center">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white w-full sm:max-w-160 rounded-t-2xl sm:rounded-2xl shadow-xl p-10 flex flex-col items-center gap-5"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 220, delay: 0.1 }}
                className="w-16 h-16 rounded-full bg-emerald-50 flex items-center justify-center"
              >
                <Check className="h-8 w-8 text-emerald-600" />
              </motion.div>
              <div className="text-center">
                <h3 className="font-display font-bold text-xl text-zinc-900">Post created!</h3>
                <p className="text-sm text-zinc-500 mt-1">Ready for your review in Approval Queue</p>
              </div>
              <Button
                variant="primary"
                className="w-full"
                onClick={() => { onClose(); navigate('/approval') }}
              >
                View in Approval Queue →
              </Button>
              <p className="text-xs text-zinc-400">Auto-navigating in 3 seconds…</p>
            </motion.div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    )
  }

  // ── Main modal shell (config + review share it) ───────────────────────────
  return (
    <Dialog.Root open={isOpen} onOpenChange={handleOpenChange}>
      <AnimatePresence>
        {isOpen && (
          <Dialog.Portal forceMount>
            <Dialog.Overlay asChild>
              <motion.div
                className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                transition={{ duration: 0.18 }}
              />
            </Dialog.Overlay>

            <Dialog.Content asChild>
              <motion.div
                className="fixed z-50 inset-0 flex items-end sm:items-center justify-center"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 16 }}
                transition={{ duration: 0.18 }}
              >
                <div className="bg-white w-full sm:max-w-160 rounded-t-2xl sm:rounded-2xl shadow-xl flex flex-col max-h-[92vh] sm:max-h-[88vh]">

                  {/* ── Header ─────────────────────────────────────────── */}
                  <div className="flex items-center justify-between px-5 py-4 border-b border-surface-100 shrink-0">
                    <div>
                      <h2 className="font-display font-semibold text-zinc-900">
                        {phase === 'config' ? 'Create Content' : 'Your Content Script'}
                      </h2>
                      <p className="text-xs text-zinc-400 mt-0.5">
                        {phase === 'config' ? 'Step 1 of 2' : 'Step 2 of 2 — Review and edit before generating'}
                      </p>
                    </div>
                    <Dialog.Close asChild>
                      <button
                        disabled={isCreatingPost}
                        className="p-1.5 text-zinc-400 hover:text-zinc-600 rounded-lg transition-colors cursor-pointer disabled:opacity-40"
                      >
                        <X className="h-5 w-5" />
                      </button>
                    </Dialog.Close>
                  </div>

                  {/* ══════════════════════════════════════════════════════
                      PHASE: config
                  ══════════════════════════════════════════════════════ */}
                  {phase === 'config' && (
                    <>
                      <div className="overflow-y-auto flex-1 px-5 py-5 space-y-6">

                        {/* Resume from cancelled generation */}
                        {lastGenerationConfig && (
                          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 space-y-3">
                            <div className="flex items-start gap-2">
                              <span className="text-lg shrink-0 mt-0.5">⏸</span>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-amber-900">Resume cancelled generation</p>
                                <p className="text-xs text-amber-800 mt-1">Your settings are saved. Continue with the same product, post type, and options.</p>
                              </div>
                            </div>
                            <div className="space-y-1.5 text-xs text-amber-900">
                              <p>📦 {allProducts.find(p => p.id === lastGenerationConfig.productId)?.title || 'Product'}</p>
                              <p>📸 {lastGenerationConfig.postType.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}</p>
                              {lastGenerationConfig.userAngle && <p>💡 Angle: {lastGenerationConfig.userAngle}</p>}
                            </div>
                            <div className="flex gap-2 pt-2 border-t border-amber-200">
                              <button
                                onClick={() => {
                                  setSelectedProductId(lastGenerationConfig.productId)
                                  setSelectedPostType(lastGenerationConfig.postType)
                                  setPlatform(lastGenerationConfig.platform)
                                  setLanguage(lastGenerationConfig.language)
                                  setUserAngle(lastGenerationConfig.userAngle)
                                  runGenerateScript()
                                }}
                                className="flex-1 text-xs font-medium py-1.5 px-2 rounded-lg bg-amber-600 text-white hover:bg-amber-700 transition-colors"
                              >
                                Resume ⏯
                              </button>
                              <button
                                onClick={() => setLastGenerationConfig(null)}
                                className="flex-1 text-xs font-medium py-1.5 px-2 rounded-lg border border-amber-300 text-amber-900 hover:bg-amber-100 transition-colors"
                              >
                                Clear
                              </button>
                            </div>
                          </div>
                        )}

                        {/* Product selector */}
                        <div>
                          <label className="block text-sm font-semibold text-zinc-900 mb-2">
                            Which product?
                          </label>
                          {selectedProduct ? (
                            <div className="flex items-center gap-3 p-3 bg-brand-50 border border-brand-200 rounded-xl">
                              <div className="w-10 h-10 rounded-lg bg-white overflow-hidden shrink-0 flex items-center justify-center">
                                {selectedProduct.images[0]
                                  ? <img src={selectedProduct.images[0]} alt={selectedProduct.title} className="w-full h-full object-cover" />
                                  : <Package className="h-5 w-5 text-zinc-300" />
                                }
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-zinc-900 truncate">{selectedProduct.title}</p>
                                <p className="text-xs text-brand-600 font-medium">{formatINR(Number(selectedProduct.price))}</p>
                              </div>
                              <button
                                onClick={() => { setSelectedProductId(''); setProductSearch('') }}
                                className="text-xs text-brand-600 hover:text-brand-800 font-medium cursor-pointer"
                              >
                                Change
                              </button>
                            </div>
                          ) : (
                            <div className="relative">
                              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
                              <input
                                type="text"
                                placeholder="Search products…"
                                value={productSearch}
                                onChange={e => { setProductSearch(e.target.value); setShowProductDropdown(true) }}
                                onFocus={() => setShowProductDropdown(true)}
                                className="w-full pl-9 pr-4 py-2.5 text-sm border border-surface-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500"
                              />
                              {showProductDropdown && (
                                <div className="absolute z-10 top-full left-0 right-0 mt-1 bg-white border border-surface-200 rounded-xl shadow-elevated max-h-52 overflow-y-auto">
                                  {isLoadingProducts
                                    ? (
                                      <div className="flex items-center justify-center gap-2 py-6 text-sm text-zinc-400">
                                        <div className="w-4 h-4 rounded-full border-2 border-brand-200 border-t-brand-600 animate-spin" />
                                        Loading products…
                                      </div>
                                    )
                                    : filteredProducts.length === 0
                                    ? <p className="text-sm text-zinc-400 p-4 text-center">No products found</p>
                                    : filteredProducts.map(p => (
                                      <button
                                        key={p.id}
                                        onClick={() => handleSelectProduct(p)}
                                        className="w-full flex items-center gap-2.5 px-3 py-2.5 hover:bg-surface-50 transition-colors cursor-pointer text-left"
                                      >
                                        <div className="w-6 h-6 rounded bg-surface-100 overflow-hidden shrink-0 flex items-center justify-center">
                                          {p.images[0]
                                            ? <img src={p.images[0]} alt={p.title} className="w-full h-full object-cover" />
                                            : <Package className="h-3 w-3 text-zinc-400" />
                                          }
                                        </div>
                                        <span className="text-sm text-zinc-900 truncate flex-1">{p.title}</span>
                                        <span className="text-xs text-brand-600 font-medium shrink-0">{formatINR(Number(p.price))}</span>
                                      </button>
                                    ))
                                  }
                                </div>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Post type */}
                        <div>
                          <label className="block text-sm font-semibold text-zinc-900 mb-2">What type?</label>
                          <div className="grid grid-cols-2 gap-2.5">
                            {POST_TYPES.map(({ type, emoji, label, description }) => {
                              const isDisabled = type === 'reel'
                              return (
                                <button
                                  key={type}
                                  onClick={() => !isDisabled && setSelectedPostType(type)}
                                  disabled={isDisabled}
                                  className={cn(
                                    'p-3.5 rounded-xl border-2 text-left transition-all',
                                    isDisabled
                                      ? 'border-zinc-100 bg-zinc-50 opacity-50 cursor-not-allowed'
                                      : selectedPostType === type
                                        ? 'border-brand-600 bg-brand-50'
                                        : 'border-zinc-200 bg-white hover:border-zinc-300',
                                  )}
                                >
                                  <div className="flex items-start justify-between mb-1.5">
                                    <span className="text-xl">{emoji}</span>
                                    {selectedPostType === type && !isDisabled && (
                                      <div className="w-4 h-4 rounded-full bg-brand-600 flex items-center justify-center shrink-0">
                                        <Check className="h-2.5 w-2.5 text-white" />
                                      </div>
                                    )}
                                    {isDisabled && (
                                      <span className="text-[10px] font-semibold text-zinc-400 bg-zinc-200 rounded px-1.5 py-0.5">Soon</span>
                                    )}
                                  </div>
                                  <p className="font-semibold text-sm text-zinc-900">{label}</p>
                                  <p className="text-xs text-zinc-500 mt-0.5 leading-snug">{description}</p>
                                </button>
                              )
                            })}
                          </div>

                          {/* Carousel slide count — only when carousel selected */}
                          {selectedPostType === 'carousel' && (
                            <div className="mt-3">
                              <label className="block text-xs font-semibold text-zinc-700 mb-1.5">How many slides?</label>
                              <div className="grid grid-cols-3 gap-2">
                                {[2, 3, 4].map((n) => (
                                  <button
                                    key={n}
                                    onClick={() => {
                                      setCarouselSlideCount(n)
                                      setActiveCarouselScriptSlide(prev => Math.min(prev, n - 1))
                                      setCarouselPreviewUrls([])
                                    }}
                                    className={cn(
                                      'h-11 rounded-xl border-2 text-sm font-semibold transition-all',
                                      carouselSlideCount === n
                                        ? 'border-brand-600 bg-brand-50 text-brand-700'
                                        : 'border-zinc-200 bg-white text-zinc-600 hover:border-zinc-300',
                                    )}
                                  >
                                    {n} slides
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Platform */}
                        <div>
                          <label className="block text-sm font-semibold text-zinc-900 mb-2">Publish to</label>
                          <div className="flex gap-2">
                            {(['instagram', 'facebook', 'both'] as const).map(p => (
                              <button
                                key={p}
                                onClick={() => setPlatform(p)}
                                className={cn(
                                  'flex-1 py-2.5 px-3 rounded-lg text-sm font-medium transition-colors',
                                  selectedPlatform === p
                                    ? 'bg-brand-600 text-white'
                                    : 'bg-surface-100 text-zinc-700 hover:bg-surface-200',
                                )}
                              >
                                {p === 'both' ? 'Both' : p.charAt(0).toUpperCase() + p.slice(1)}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Language */}
                        <div>
                          <label className="block text-sm font-semibold text-zinc-900 mb-2">Caption language</label>
                          <div className="flex gap-2">
                            {(['english', 'hindi', 'bilingual'] as const).map(lang => (
                              <button
                                key={lang}
                                onClick={() => setLanguage(lang)}
                                className={cn(
                                  'flex-1 py-2.5 px-3 rounded-full text-sm font-medium transition-colors',
                                  selectedLanguage === lang
                                    ? 'bg-brand-600 text-white'
                                    : 'bg-surface-100 text-zinc-700 hover:bg-surface-200',
                                )}
                              >
                                {lang === 'english' ? 'English' : lang === 'hindi' ? 'Hindi' : 'Bilingual'}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Angle */}
                        <div>
                          <label className="block text-sm font-semibold text-zinc-900 mb-1">
                            Your angle or idea
                            <span className="font-normal text-zinc-400 ml-1">(optional)</span>
                          </label>
                          <p className="text-xs text-zinc-500 mb-2">
                            What unique perspective or hook do you want? AI will research trends and build on your idea.
                          </p>
                          <textarea
                            rows={3}
                            value={userAngle}
                            onChange={e => setUserAngle(e.target.value)}
                            placeholder={`e.g. 'Show how this is perfect for gifting' or\n'Focus on the quality vs cheap alternatives' or\n'Target working women in their 30s'`}
                            className="w-full px-3 py-2.5 text-sm border border-surface-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
                          />
                          <div className="flex flex-wrap gap-2 mt-2">
                            {loadingAngles && (
                              <p className="text-xs text-zinc-400 italic">Loading brand-aligned suggestions…</p>
                            )}
                            {!loadingAngles && (
                              <>
                                {brandAlignedAngles.length > 0 && (
                                  <p className="text-xs text-emerald-600 font-medium mr-auto">✨ Brand-aligned suggestions</p>
                                )}
                                {(brandAlignedAngles.length > 0 ? brandAlignedAngles : DEFAULT_ANGLE_SUGGESTIONS).map(s => (
                                  <button
                                    key={s}
                                    onClick={() => setUserAngle(s)}
                                    className={cn(
                                      'text-xs rounded-xl px-3 py-1.5 transition-colors cursor-pointer border',
                                      brandAlignedAngles.length > 0
                                        ? 'bg-emerald-50 hover:bg-emerald-100 border-emerald-200 text-emerald-700 font-medium'
                                        : 'bg-surface-100 hover:bg-brand-50 hover:border-brand-200 border-transparent text-zinc-600'
                                    )}
                                  >
                                    {s}
                                  </button>
                                ))}
                              </>
                            )}
                          </div>
                        </div>

                        {/* Reference images */}
                        <div className="border border-surface-200 rounded-xl overflow-hidden">
                          <button
                            type="button"
                            onClick={() => setRefImagesExpanded(v => !v)}
                            className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-surface-50 transition-colors"
                          >
                            <span className="flex items-center gap-2 text-sm font-medium text-zinc-700">
                              <Paperclip className="h-4 w-4 text-zinc-400" />
                              📎 Add Reference Images <span className="font-normal text-zinc-400">(optional)</span>
                            </span>
                            {refImagesExpanded
                              ? <ChevronUp className="h-4 w-4 text-zinc-400" />
                              : <ChevronDown className="h-4 w-4 text-zinc-400" />}
                          </button>

                          {refImagesExpanded && (
                            <div className="px-4 pb-4 space-y-3 border-t border-surface-100">
                              <p className="text-xs text-zinc-500 pt-3">
                                Upload 1–3 images to guide the visual style of this specific post. These are used only for this post.
                              </p>

                              {/* Uploaded thumbnails */}
                              {referenceImages.length > 0 && (
                                <div className="flex gap-2 flex-wrap">
                                  {referenceImages.map((url, i) => (
                                    <div key={url} className="relative w-20 h-20 rounded-lg overflow-hidden border border-surface-200">
                                      <img src={url} alt={`Reference ${i + 1}`} className="w-full h-full object-cover" />
                                      <button
                                        type="button"
                                        onClick={() => setReferenceImages(imgs => imgs.filter((_, idx) => idx !== i))}
                                        className="absolute top-0.5 right-0.5 w-5 h-5 rounded-full bg-black/60 flex items-center justify-center text-white hover:bg-black/80"
                                      >
                                        <X className="h-3 w-3" />
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              )}

                              {/* Per-file errors */}
                              {refUploadErrors.map((err, i) => (
                                <p key={i} className="text-xs text-red-500">{err}</p>
                              ))}

                              {/* Upload button */}
                              {referenceImages.length < 3 && (
                                <label className={cn(
                                  'flex items-center gap-2 px-3 py-2 rounded-lg border border-dashed border-surface-300 text-sm text-zinc-500 cursor-pointer hover:bg-surface-50 transition-colors w-fit',
                                  uploadingRefCount > 0 && 'opacity-60 pointer-events-none',
                                )}>
                                  <ImageIcon className="h-4 w-4" />
                                  {uploadingRefCount > 0 ? `Uploading… (${uploadingRefCount})` : `Upload images (${referenceImages.length}/3)`}
                                  <input
                                    type="file"
                                    accept="image/jpeg,image/png,image/webp"
                                    multiple
                                    className="hidden"
                                    onChange={async (e) => {
                                      const selected = Array.from(e.target.files ?? [])
                                      e.target.value = ''
                                      if (!selected.length) return
                                      const slots = 3 - referenceImages.length
                                      const toUpload = selected.slice(0, slots)
                                      const errors: string[] = []
                                      const valid = toUpload.filter(f => {
                                        if (f.size > 5 * 1024 * 1024) {
                                          errors.push(`${f.name}: exceeds 5 MB limit`)
                                          return false
                                        }
                                        return true
                                      })
                                      setRefUploadErrors(errors)
                                      await Promise.all(valid.map(async (file) => {
                                        setUploadingRefCount(n => n + 1)
                                        try {
                                          const res = await uploadService.uploadReferenceImage(file)
                                          setReferenceImages(imgs => [...imgs, res.data.url])
                                        } catch (err) {
                                          const msg = err instanceof Error ? err.message : 'upload failed'
                                          setRefUploadErrors(errs => [...errs, `${file.name}: ${msg}`])
                                        } finally {
                                          setUploadingRefCount(n => n - 1)
                                        }
                                      }))
                                    }}
                                  />
                                </label>
                              )}
                            </div>
                          )}
                        </div>

                      </div>

                      {/* Config footer */}
                      <div className="shrink-0 border-t border-surface-100 px-5 py-4">
                        <Button
                          variant="primary"
                          className="w-full"
                          disabled={!selectedProductId || isGeneratingScript || uploadingRefCount > 0}
                          loading={isGeneratingScript}
                          onClick={() => runGenerateScript()}
                        >
                          <Sparkles className="h-4 w-4 mr-2" />
                          Generate Script →
                        </Button>
                      </div>
                    </>
                  )}

                  {/* ══════════════════════════════════════════════════════
                      PHASE: review_script
                  ══════════════════════════════════════════════════════ */}
                  {phase === 'review_script' && generatedScript && (
                    <>
                      {/* Variant selector — Script 1 ready, Script 2 & 3 lazy-load on click */}
                      {scriptVariants.length > 0 && (
                        <div className="shrink-0 px-5 pt-4 pb-2">
                          <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wide mb-2">Choose a script angle</p>
                          <div className="flex gap-2 overflow-x-auto pb-1">
                            {[0, 1, 2].map((i) => {
                              const v = scriptVariants[i] ?? null
                              const isLoading = loadingVariantIdx === i
                              const isReady   = v !== null
                              const isActive  = selectedVariantIdx === i

                              const handleClick = async () => {
                                if (isLoading) return
                                if (isReady) {
                                  applyVariant(v, i, selectedVariantIdx)
                                  setSelectedVariantIdx(i)
                                  return
                                }
                                // Lazy-load this variant
                                if (!scriptBase) return
                                setLoadingVariantIdx(i as 1 | 2)
                                try {
                                  const res = await postService.generateVariant({
                                    base:         scriptBase,
                                    variantIndex: i as 1 | 2,
                                    postType:     selectedPostType,
                                    platform:     selectedPlatform,
                                    language:     selectedLanguage,
                                    userAngle:    userAngle.trim() || undefined,
                                  })
                                  const loaded = res.data.variant
                                  setScriptVariants(prev => {
                                    const next = [...prev]
                                    next[i] = loaded
                                    return next
                                  })
                                  applyVariant(loaded, i, selectedVariantIdx)
                                  setSelectedVariantIdx(i)
                                } catch {
                                  showToast('Could not load this script angle. Please try again.', 'error')
                                } finally {
                                  setLoadingVariantIdx(null)
                                }
                              }

                              return (
                                <button
                                  key={i}
                                  onClick={handleClick}
                                  disabled={isLoading}
                                  className={cn(
                                    'shrink-0 flex flex-col items-start gap-1 px-3 py-2 rounded-xl border-2 text-left transition-all min-w-30 max-w-40',
                                    isActive
                                      ? 'border-brand-600 bg-brand-50'
                                      : 'border-zinc-200 bg-white hover:border-zinc-300',
                                    isLoading && 'opacity-60 cursor-wait',
                                  )}
                                >
                                  <span className="text-[10px] font-bold text-zinc-400 uppercase">Script {i + 1}</span>
                                  {isLoading ? (
                                    <span className="text-xs text-zinc-400 italic">Generating…</span>
                                  ) : isReady ? (
                                    <span className="text-xs font-semibold text-zinc-800 leading-snug line-clamp-2">{v.hook}</span>
                                  ) : (
                                    <span className="text-xs text-zinc-400 italic">Tap to generate</span>
                                  )}
                                  {variantPreviews[i] && (
                                    <img src={variantPreviews[i]!} alt={`Preview ${i + 1}`} className="w-full h-16 object-cover rounded-lg mt-1" />
                                  )}
                                </button>
                              )
                            })}
                          </div>
                        </div>
                      )}

                      {/* Tab navigation */}
                      <div className="shrink-0 border-b border-surface-200 px-5 pt-4">
                        <div className="flex gap-1 overflow-x-auto">
                          {/* Stories don't use captions or hashtags — IG/FB Stories ignore them at publish */}
                          {selectedPostType !== 'story' && (
                            <button
                              onClick={() => setActiveReviewTab('caption')}
                              className={cn(
                                'shrink-0 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors',
                                activeReviewTab === 'caption'
                                  ? 'border-brand-600 text-brand-600'
                                  : 'border-transparent text-zinc-600 hover:text-zinc-900',
                              )}
                            >
                              ✍️ Caption
                            </button>
                          )}
                          <button
                            onClick={() => setActiveReviewTab('image_script')}
                            className={cn(
                              'shrink-0 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors',
                              activeReviewTab === 'image_script'
                                ? 'border-brand-600 text-brand-600'
                                : 'border-transparent text-zinc-600 hover:text-zinc-900',
                            )}
                          >
                            🖼️ {selectedPostType === 'story' ? 'Story Visual' : 'Image Script'}
                          </button>
                          <button
                            onClick={() => setActiveReviewTab('caption_preview')}
                            className={cn(
                              'shrink-0 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors',
                              activeReviewTab === 'caption_preview'
                                ? 'border-brand-600 text-brand-600'
                                : 'border-transparent text-zinc-600 hover:text-zinc-900',
                            )}
                          >
                            📸 Preview
                          </button>
                        </div>
                      </div>

                      <div className="overflow-y-auto flex-1 px-5 py-5 space-y-4">

                        {/* TAB 1: SCRIPT */}
                        {activeReviewTab === 'caption' && (
                          <>
                            {/* Brand awareness goal section */}
                            <div className="bg-brand-50 rounded-xl p-4 border border-brand-100 space-y-3">
                              <p className="text-[10px] font-bold text-brand-700 uppercase tracking-wide">
                                ✨ Brand Awareness Goal
                              </p>
                              <div className="space-y-3">
                                <div>
                                  <p className="text-xs text-zinc-600 font-medium mb-1">Emotional Goal:</p>
                                  <p className="text-sm text-zinc-900 font-semibold">{generatedScript.brandEmotionalGoal}</p>
                                </div>
                                <div>
                                  <p className="text-xs text-zinc-600 font-medium mb-1">Brand Value Thread:</p>
                                  <p className="text-sm text-zinc-900">{generatedScript.brandValueThread}</p>
                                </div>
                                {generatedScript.trendContext && (
                                  <div>
                                    <p className="text-xs text-zinc-600 font-medium mb-1">Trend Context:</p>
                                    <p className="text-sm text-zinc-900">{generatedScript.trendContext}</p>
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Hook section */}
                            <div className="space-y-2">
                              <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wide">
                                🎣 Hook
                              </p>
                              <div className="bg-zinc-50 rounded-xl p-4 space-y-3">
                                <div className="bg-white rounded-lg p-3 border-2 border-brand-200">
                                  <p className="text-sm font-semibold text-zinc-900 leading-snug">{generatedScript.hook}</p>
                                </div>
                                <textarea
                                  value={editedHook}
                                  onChange={e => setEditedHook(e.target.value)}
                                  rows={2}
                                  placeholder="Edit hook…"
                                  className="w-full bg-white border border-surface-200 rounded-lg px-3 py-2 text-sm font-medium text-zinc-900 resize-none focus:outline-none focus:ring-2 focus:ring-brand-400"
                                />
                                {generatedScript.hookExplanation && (
                                  <p className="text-xs text-zinc-600 italic">
                                    💡 Why it works: {generatedScript.hookExplanation}
                                  </p>
                                )}
                              </div>
                            </div>

                            {/* Angle */}
                            <div>
                              <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wide mb-2">
                                📐 Angle
                              </p>
                              <p className="text-sm text-zinc-700 bg-zinc-50 rounded-lg p-3">{generatedScript.angle}</p>
                            </div>

                            {/* Full script */}
                            <div>
                              <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wide mb-2">
                                📝 Full Script <span className="text-amber-600">(editable — enhances caption improvements)</span>
                              </p>
                              <textarea
                                value={editedScript}
                                onChange={(e) => setEditedScript(e.target.value)}
                                rows={10}
                                className="w-full px-3 py-2.5 font-mono text-xs border border-surface-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-400 resize-none"
                                placeholder="Edit the strategy here to customize caption improvements..."
                              />
                            </div>

                            {/* Reel script if applicable */}
                            {selectedPostType === 'reel' && generatedScript.reelScript && (
                              <div className="bg-zinc-50 rounded-xl p-4 space-y-3">
                                <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wide">🎬 Reel Script</p>
                                <div className="space-y-2 text-xs">
                                  <div>
                                    <p className="text-zinc-600 font-medium">Hook Visual (0–3s):</p>
                                    <p className="text-zinc-900">{generatedScript.reelScript.hook_visual}</p>
                                  </div>
                                  <div>
                                    <p className="text-zinc-600 font-medium">Scene 2 Visual (3–8s):</p>
                                    <p className="text-zinc-900">{generatedScript.reelScript.scene2_visual}</p>
                                  </div>
                                  <div>
                                    <p className="text-zinc-600 font-medium">Scene 3 Visual (8–12s):</p>
                                    <p className="text-zinc-900">{generatedScript.reelScript.scene3_visual}</p>
                                  </div>
                                  <div>
                                    <p className="text-zinc-600 font-medium">CTA Visual:</p>
                                    <p className="text-zinc-900">{generatedScript.reelScript.cta_visual}</p>
                                  </div>
                                  <div className="pt-2 border-t border-zinc-200">
                                    <p className="text-zinc-600 font-medium">Audio Mood:</p>
                                    <p className="text-zinc-900">{generatedScript.reelScript.audioMood}</p>
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* Carousel slides if applicable */}
                            {selectedPostType === 'carousel' && generatedScript.carouselSlides && Array.isArray(generatedScript.carouselSlides) && (
                              <div className="bg-zinc-50 rounded-xl p-4 space-y-3">
                                <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wide">🎠 Carousel Slides</p>
                                {generatedScript.carouselSlides.map((slide, i) => (
                                  <div key={i} className="bg-white rounded-lg p-3 border border-zinc-200 space-y-2">
                                    <p className="text-xs font-semibold text-zinc-600">Slide {i + 1}</p>
                                    <p className="text-sm font-medium text-zinc-900">{slide.headline}</p>
                                    {slide.subtext && (
                                      <p className="text-xs text-zinc-600">{slide.subtext}</p>
                                    )}
                                    <div>
                                      <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wide mb-1">
                                        Visual Direction (Slide {i + 1})
                                      </p>
                                      <textarea
                                        rows={2}
                                        value={editedCarouselSlides[i]?.visual ?? slide.visual}
                                        onChange={(e) => {
                                          const updated = [...editedCarouselSlides]
                                          if (updated[i]) updated[i] = { ...updated[i], visual: e.target.value }
                                          setEditedCarouselSlides(updated)
                                        }}
                                        className="w-full px-3 py-2 text-xs border border-surface-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-400 resize-none"
                                      />
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}

                            {/* Story script if applicable */}
                            {selectedPostType === 'story' && generatedScript.storyScript && (
                              <div className="bg-zinc-50 rounded-xl p-4 space-y-3">
                                <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wide">📱 Story Format</p>
                                <div className="space-y-2 text-sm">
                                  <div>
                                    <p className="text-zinc-600 font-medium text-xs">Format:</p>
                                    <p className="text-zinc-900">{generatedScript.storyScript.format}</p>
                                  </div>
                                  <div>
                                    <p className="text-zinc-600 font-medium text-xs">Line 1:</p>
                                    <p className="text-zinc-900 font-semibold">{generatedScript.storyScript.overlayLine1}</p>
                                  </div>
                                  <div>
                                    <p className="text-zinc-600 font-medium text-xs">Line 2:</p>
                                    <p className="text-zinc-900 font-semibold">{generatedScript.storyScript.overlayLine2}</p>
                                  </div>
                                  <div>
                                    <p className="text-zinc-600 font-medium text-xs">CTA Sticker:</p>
                                    <p className="text-zinc-900">{generatedScript.storyScript.ctaSticker}</p>
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* Suggested angles */}
                            {generatedScript.suggestedAngles && generatedScript.suggestedAngles.length > 0 && (
                              <div>
                                <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-2">
                                  Try a different angle:
                                </p>
                                <div className="flex flex-col gap-2">
                                  {generatedScript.suggestedAngles.map((angle, i) => {
                                    const isSelected = userAngle === angle
                                    return (
                                      <button
                                        key={i}
                                        onClick={() => setUserAngle(angle)}
                                        className={cn(
                                          'text-left text-sm rounded-xl px-3 py-2.5 transition-colors cursor-pointer border',
                                          isSelected
                                            ? 'bg-brand-100 border-brand-400 text-brand-900 font-medium shadow-sm'
                                            : 'bg-surface-100 hover:bg-brand-50 hover:border-brand-200 border-transparent text-zinc-600'
                                        )}
                                      >
                                        {isSelected && '✓ '}{angle}
                                      </button>
                                    )
                                  })}
                                  {userAngle && generatedScript.suggestedAngles.includes(userAngle) && (
                                    <button
                                      onClick={() => runGenerateScript()}
                                      disabled={isGeneratingScript}
                                      className="text-sm font-medium bg-brand-600 text-white hover:bg-brand-700 disabled:bg-brand-400 disabled:cursor-wait border border-transparent rounded-xl px-3 py-2.5 transition-colors mt-2"
                                    >
                                      {isGeneratingScript ? '⏳ Regenerating...' : '🔄 Regenerate with this angle'}
                                    </button>
                                  )}
                                </div>
                              </div>
                            )}

                            {/* ── Caption section (inline below script) ── */}
                            <div className="border-t border-surface-200 pt-4" />
                            {/* Instagram Caption Preview */}
                            <div className="space-y-2">
                              <div className="flex items-center justify-between">
                                <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wide">📷 Instagram Caption</p>
                                <div className="flex items-center gap-2">
                                  <p className={cn(
                                    'text-[10px] font-mono',
                                    instagramCaptionPreview.length > 2100 ? 'text-red-600' :
                                    instagramCaptionPreview.length > 1800 ? 'text-amber-600' :
                                    'text-zinc-400'
                                  )}>
                                    {instagramCaptionPreview.length} / 2200
                                  </p>
                                  <button
                                    onClick={improveCaption}
                                    disabled={isImprovingCaption}
                                    className="text-xs font-medium py-1 px-2.5 rounded-lg bg-brand-50 text-brand-700 hover:bg-brand-100 border border-brand-200 transition-colors disabled:opacity-50 disabled:cursor-wait"
                                  >
                                    {isImprovingCaption ? '⏳ Improving...' : '✨ Improve'}
                                  </button>
                                </div>
                              </div>
                              <textarea
                                value={instagramCaptionPreview}
                                onChange={(e) => {
                                  setInstagramCaptionPreview(e.target.value)
                                  setShowCaptionDiff(false)
                                  // Check if edits are heavy
                                  if (isHeavyEdit(originalInstagramCaption, e.target.value)) {
                                    setShowCaptionWarning(true)
                                  } else {
                                    setShowCaptionWarning(false)
                                  }
                                }}
                                rows={8}
                                className="w-full px-3 py-2.5 text-sm border border-surface-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-400 resize-none"
                              />

                              {/* Caption Improvement Diff Visualization */}
                              {showCaptionDiff && captionBeforeImprovement && (
                                <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 space-y-2.5">
                                  <p className="text-xs font-semibold text-emerald-900">What changed:</p>
                                  <div className="text-xs leading-relaxed text-emerald-900 space-y-1">
                                    {computeCaptionDiff(captionBeforeImprovement, instagramCaptionPreview).map((seg, idx) => (
                                      <span key={idx} className={cn(
                                        seg.type === 'added' && 'bg-emerald-200 font-semibold rounded px-1',
                                        seg.type === 'removed' && 'line-through opacity-50 bg-red-100 px-1 rounded',
                                        seg.type === 'unchanged' && ''
                                      )}>
                                        {seg.text}
                                      </span>
                                    ))}
                                  </div>

                                  {/* Action Buttons */}
                                  <div className="flex gap-2 pt-1 border-t border-emerald-200">
                                    <button
                                      onClick={() => setShowCaptionDiff(false)}
                                      className="flex-1 text-xs font-medium py-1.5 px-3 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition-colors"
                                    >
                                      Keep Improvements ✅
                                    </button>
                                    <button
                                      onClick={() => {
                                        setInstagramCaptionPreview(captionBeforeImprovement)
                                        setShowCaptionDiff(false)
                                      }}
                                      className="flex-1 text-xs font-medium py-1.5 px-3 rounded-lg border border-emerald-300 text-emerald-900 hover:bg-emerald-100 transition-colors"
                                    >
                                      Revert ↺
                                    </button>
                                  </div>
                                </div>
                              )}

                              {/* Caption Edit Warning with Actions */}
                              {showCaptionWarning && (
                                <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 space-y-3">
                                  <div className="flex items-start gap-2">
                                    <span className="text-lg shrink-0 mt-0.5">⚠️</span>
                                    <div className="min-w-0 flex-1">
                                      <p className="text-xs font-semibold text-amber-900">Caption differs from brand strategy</p>
                                      <p className="text-xs text-amber-800 mt-1">
                                        Your edits have significantly changed the generated caption. The original was optimized for brand awareness and resonance with your audience.
                                      </p>
                                    </div>
                                  </div>

                                  {/* Action Buttons */}
                                  <div className="flex gap-2 pt-1 border-t border-amber-200">
                                    <button
                                      onClick={() => {
                                        setInstagramCaptionPreview(originalInstagramCaption)
                                        setShowCaptionWarning(false)
                                      }}
                                      className="flex-1 text-xs font-medium py-2 px-3 rounded-lg border border-amber-300 text-amber-900 hover:bg-amber-100 transition-colors"
                                    >
                                      ↺ Restore Original
                                    </button>
                                    <button
                                      onClick={improveCaption}
                                      disabled={isImprovingCaption}
                                      className="flex-1 text-xs font-medium py-2 px-3 rounded-lg bg-amber-600 text-white hover:bg-amber-700 disabled:bg-amber-400 disabled:cursor-wait transition-colors"
                                    >
                                      {isImprovingCaption ? '⏳ Improving...' : '✨ Improve My Version'}
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>

                            {/* Instagram Hashtags */}
                            <div className="space-y-2">
                              <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wide">🏷️ Hashtags</p>
                              <div className="flex flex-wrap gap-2">
                                {instagramHashtagsPreview.map(tag => (
                                  <span
                                    key={tag}
                                    className="inline-flex items-center gap-1.5 bg-brand-50 text-brand-700 text-xs rounded-full px-3 py-1.5 border border-brand-200"
                                  >
                                    <span className="text-blue-600">{tag}</span>
                                    <button
                                      onClick={() => setInstagramHashtagsPreview(prev => prev.filter(t => t !== tag))}
                                      className="text-brand-600 hover:text-brand-900 cursor-pointer"
                                    >
                                      <X className="h-3 w-3" />
                                    </button>
                                  </span>
                                ))}
                              </div>
                              <div className="flex gap-2">
                                <input
                                  type="text"
                                  value={newHashtagPreview}
                                  onChange={e => setNewHashtagPreview(e.target.value)}
                                  onKeyDown={e => {
                                    if (e.key === 'Enter') {
                                      e.preventDefault()
                                      const tag = newHashtagPreview.trim().startsWith('#') ? newHashtagPreview.trim() : `#${newHashtagPreview.trim()}`
                                      if (tag !== '#' && !instagramHashtagsPreview.includes(tag)) {
                                        setInstagramHashtagsPreview(prev => [...prev, tag])
                                      }
                                      setNewHashtagPreview('')
                                    }
                                  }}
                                  placeholder="Add hashtag…"
                                  className="flex-1 px-3 py-2 text-sm border border-surface-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-400"
                                />
                                <Button
                                  variant="secondary"
                                  size="sm"
                                  onClick={() => {
                                    const tag = newHashtagPreview.trim().startsWith('#') ? newHashtagPreview.trim() : `#${newHashtagPreview.trim()}`
                                    if (tag !== '#' && !instagramHashtagsPreview.includes(tag)) {
                                      setInstagramHashtagsPreview(prev => [...prev, tag])
                                    }
                                    setNewHashtagPreview('')
                                  }}
                                  className="shrink-0"
                                >
                                  Add
                                </Button>
                              </div>
                            </div>

                            {/* Divider */}
                            <div className="border-t border-surface-200 pt-4" />

                            {/* Facebook Caption Preview */}
                            <div className="space-y-2">
                              <div className="flex items-center justify-between">
                                <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wide">f Facebook Caption</p>
                                <div className="flex items-center gap-2">
                                  <p className="text-[10px] text-zinc-400 font-mono">{facebookCaptionPreview.length} / 500</p>
                                  <button
                                    onClick={() => improveCaptionFacebook()}
                                    disabled={isImprovingCaption}
                                    className="text-xs font-medium py-1 px-2.5 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 transition-colors disabled:opacity-50 disabled:cursor-wait"
                                  >
                                    {isImprovingCaption ? '⏳ Improving...' : '✨ Improve'}
                                  </button>
                                </div>
                              </div>
                              <textarea
                                value={facebookCaptionPreview}
                                onChange={(e) => {
                                  setFacebookCaptionPreview(e.target.value)
                                  // Check if edits are heavy
                                  if (isHeavyEdit(originalFacebookCaption, e.target.value)) {
                                    setShowCaptionWarning(true)
                                  } else {
                                    setShowCaptionWarning(false)
                                  }
                                }}
                                rows={4}
                                className="w-full px-3 py-2.5 text-sm border border-surface-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-400 resize-none"
                              />
                            </div>

                            {/* Facebook Hashtags (top 5 from Instagram) */}
                            <div className="space-y-2">
                              <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wide">Facebook Tags</p>
                              <div className="flex flex-wrap gap-2">
                                {instagramHashtagsPreview.slice(0, 5).map(tag => (
                                  <span
                                    key={tag}
                                    className="inline-flex items-center gap-1.5 bg-blue-50 text-blue-700 text-xs rounded-full px-3 py-1.5 border border-blue-200"
                                  >
                                    <span className="text-blue-600">{tag}</span>
                                  </span>
                                ))}
                              </div>
                              <p className="text-xs text-zinc-500">First 5 Instagram hashtags auto-synced to Facebook</p>
                            </div>
                          </>
                        )}

                        {/* ── TAB 2: IMAGE SCRIPT ── */}
                        {activeReviewTab === 'image_script' && (
                          <>
                            {/* Feed / Story / Reel: single script editor */}
                            {selectedPostType !== 'carousel' && (
                              <div className="space-y-3">
                                <div className="flex items-start justify-between gap-2">
                                  <div>
                                    <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wide mb-1">
                                      🎨 Image Direction Script
                                    </p>
                                    <p className="text-xs text-zinc-400">
                                      Full prompt sent to the AI image generator. Be specific about environment, lighting, and mood.
                                    </p>
                                  </div>
                                </div>
                                <div className="rounded-xl bg-zinc-900 p-1">
                                  <textarea
                                    value={editedImageScript}
                                    onChange={(e) => {
                                      setEditedImageScript(e.target.value)
                                      // Invalidate stale preview so create reflects the latest edit
                                      if (previewImageUrl) setPreviewImageUrl(null)
                                    }}
                                    rows={12}
                                    spellCheck={false}
                                    className="w-full bg-transparent px-3 py-2.5 text-xs font-mono text-zinc-100 placeholder-zinc-600 focus:outline-none resize-none leading-relaxed"
                                    placeholder="Describe the full visual direction — environment, lighting style, color palette, mood, composition. Your product will be composited on top."
                                  />
                                </div>
                                <div className="flex gap-2">
                                  <button
                                    disabled={isImprovingImageScript || !editedImageScript.trim()}
                                    onClick={async () => {
                                      if (!editedImageScript.trim()) return
                                      setIsImprovingImageScript(true)
                                      try {
                                        const res = await postService.improveImageScript({
                                          script: editedImageScript,
                                          postType: selectedPostType,
                                          brandPersonality,
                                        })
                                        setEditedImageScript(res.data.improved)
                                        if (previewImageUrl) setPreviewImageUrl(null)
                                        showToast('Image script improved', 'success')
                                      } catch {
                                        showToast('Could not improve script', 'error')
                                      } finally {
                                        setIsImprovingImageScript(false)
                                      }
                                    }}
                                    className="flex-1 min-h-[44px] text-xs font-semibold py-2 px-3 rounded-lg bg-brand-600 text-white hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                  >
                                    {isImprovingImageScript ? '⏳ Improving…' : '✨ Improve Script'}
                                  </button>
                                  <button
                                    disabled={isSavingImageScript || !editedImageScript.trim()}
                                    onClick={async () => {
                                      setIsSavingImageScript(true)
                                      try {
                                        await brandService.saveImageScripts({ [selectedPostType]: editedImageScript })
                                        showToast('Saved as brand default', 'success')
                                      } catch {
                                        showToast('Could not save', 'error')
                                      } finally {
                                        setIsSavingImageScript(false)
                                      }
                                    }}
                                    className="min-h-[44px] text-xs font-semibold py-2 px-3 rounded-lg border border-zinc-300 text-zinc-700 hover:bg-zinc-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                  >
                                    {isSavingImageScript ? '⏳…' : '💾 Save Default'}
                                  </button>
                                  <button
                                    disabled={!editedImagePrompt}
                                    onClick={() => setEditedImageScript(editedImagePrompt)}
                                    title="Reset to AI suggestion"
                                    className="min-h-[44px] text-xs font-semibold py-2 px-3 rounded-lg border border-zinc-300 text-zinc-700 hover:bg-zinc-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                                  >
                                    ↺ Reset
                                  </button>
                                </div>
                              </div>
                            )}

                            {/* Carousel: per-slide script editor */}
                            {selectedPostType === 'carousel' && (
                              <div className="space-y-3">
                                <div>
                                  <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wide mb-1">
                                    🎠 Carousel Image Scripts — Per Slide
                                  </p>
                                  <p className="text-xs text-zinc-400 mb-3">
                                    Each slide gets its own visual direction. All {carouselSlideCount} slides share the same product image, so focus on environment and mood changes.
                                  </p>
                                  {/* Slide tabs */}
                                  <div className="flex gap-1 mb-3">
                                    {Array.from({ length: carouselSlideCount }, (_, i) => i).map((i) => (
                                      <button
                                        key={i}
                                        onClick={() => setActiveCarouselScriptSlide(i)}
                                        className={cn(
                                          'flex-1 py-1.5 text-xs font-semibold rounded-lg transition-colors',
                                          activeCarouselScriptSlide === i
                                            ? 'bg-brand-600 text-white'
                                            : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200',
                                        )}
                                      >
                                        {i + 1}
                                      </button>
                                    ))}
                                  </div>
                                  <div className="text-xs text-zinc-500 mb-2 font-medium">
                                    {carouselRolesFor(carouselSlideCount)[activeCarouselScriptSlide] ?? 'Slide'}
                                  </div>
                                  <div className="rounded-xl bg-zinc-900 p-1">
                                    <textarea
                                      key={activeCarouselScriptSlide}
                                      value={editedCarouselImageScripts[activeCarouselScriptSlide] ?? ''}
                                      onChange={(e) => {
                                        const updated = [...editedCarouselImageScripts]
                                        updated[activeCarouselScriptSlide] = e.target.value
                                        setEditedCarouselImageScripts(updated)
                                        // Invalidate stale carousel preview so create reflects the latest edit
                                        if (carouselPreviewUrls.length > 0) setCarouselPreviewUrls([])
                                      }}
                                      rows={10}
                                      spellCheck={false}
                                      className="w-full bg-transparent px-3 py-2.5 text-xs font-mono text-zinc-100 placeholder-zinc-600 focus:outline-none resize-none leading-relaxed"
                                      placeholder={`Visual direction for Slide ${activeCarouselScriptSlide + 1}…`}
                                    />
                                  </div>
                                </div>
                                <div className="flex gap-2">
                                  <button
                                    disabled={isImprovingImageScript || !(editedCarouselImageScripts[activeCarouselScriptSlide] ?? '').trim()}
                                    onClick={async () => {
                                      const script = editedCarouselImageScripts[activeCarouselScriptSlide] ?? ''
                                      if (!script.trim()) return
                                      setIsImprovingImageScript(true)
                                      try {
                                        const res = await postService.improveImageScript({
                                          script,
                                          postType: 'carousel',
                                          brandPersonality,
                                          slideIndex: activeCarouselScriptSlide,
                                        })
                                        const updated = [...editedCarouselImageScripts]
                                        updated[activeCarouselScriptSlide] = res.data.improved
                                        setEditedCarouselImageScripts(updated)
                                        if (carouselPreviewUrls.length > 0) setCarouselPreviewUrls([])
                                        showToast('Slide script improved', 'success')
                                      } catch {
                                        showToast('Could not improve script', 'error')
                                      } finally {
                                        setIsImprovingImageScript(false)
                                      }
                                    }}
                                    className="flex-1 min-h-[44px] text-xs font-semibold py-2 px-3 rounded-lg bg-brand-600 text-white hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                  >
                                    {isImprovingImageScript ? '⏳ Improving…' : '✨ Improve Slide'}
                                  </button>
                                  <button
                                    onClick={() => {
                                      const visual = editedCarouselSlides[activeCarouselScriptSlide]?.visual ?? ''
                                      const updated = [...editedCarouselImageScripts]
                                      updated[activeCarouselScriptSlide] = visual
                                      setEditedCarouselImageScripts(updated)
                                    }}
                                    className="min-h-[44px] text-xs font-semibold py-2 px-3 rounded-lg border border-zinc-300 text-zinc-700 hover:bg-zinc-50 transition-colors"
                                  >
                                    ↺ Reset
                                  </button>
                                </div>
                              </div>
                            )}
                          </>
                        )}

                        {/* ── TAB 3: CAPTION PREVIEW ── */}
                        {activeReviewTab === 'caption_preview' && (
                          <>
                            {/* Reel: no image preview */}
                            {selectedPostType === 'reel' && (
                              <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 text-center">
                                <p className="text-sm text-zinc-500">🎬 Reel videos are generated automatically — no image preview available.</p>
                              </div>
                            )}

                            {/* Image preview (non-reel) */}
                            {selectedPostType !== 'reel' && (
                              <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                  <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wide">📸 Image Preview</p>
                                  <Button
                                    variant="secondary"
                                    size="sm"
                                    className="text-xs h-8 px-3"
                                    loading={isAnyPreviewPending}
                                    disabled={isAnyPreviewPending}
                                    onClick={() => runPreview()}
                                  >
                                    {(previewImageUrl || carouselPreviewUrls.length > 0) ? 'Regenerate Preview' : 'Generate Preview'}
                                  </Button>
                                </div>

                                {isAnyPreviewPending && (
                                  <div className="flex flex-col items-center justify-center gap-2 py-8 rounded-xl border border-zinc-200 bg-zinc-50">
                                    <motion.div
                                      animate={{ rotate: 360 }}
                                      transition={{ repeat: Infinity, duration: 1.2, ease: 'linear' }}
                                      className="w-7 h-7 rounded-full border-2 border-brand-200 border-t-brand-600"
                                    />
                                    <p className="text-xs text-zinc-500">
                                      {selectedPostType === 'carousel' ? `Generating all ${carouselSlideCount} slides…` : 'Generating image preview…'}
                                    </p>
                                  </div>
                                )}

                                {!isAnyPreviewPending && selectedPostType === 'carousel' && carouselPreviewUrls.length > 0 && (
                                  <div className="flex gap-2 overflow-x-auto snap-x snap-mandatory pb-1">
                                    {carouselPreviewUrls.map((url, i) => (
                                      <div key={i} className="shrink-0 w-[70%] snap-center rounded-xl overflow-hidden border border-surface-200 relative">
                                        <img src={url} alt={`Slide ${i + 1}`} className="w-full object-cover" />
                                        <span className="absolute top-1.5 right-1.5 text-[9px] font-bold text-white bg-black/55 rounded-full px-1.5 py-0.5">{i + 1}/{carouselPreviewUrls.length}</span>
                                      </div>
                                    ))}
                                  </div>
                                )}

                                {!isAnyPreviewPending && selectedPostType !== 'carousel' && previewImageUrl && (
                                  <div className="rounded-xl overflow-hidden border border-surface-200">
                                    <img src={previewImageUrl} alt="Post preview" className="w-full object-cover" />
                                  </div>
                                )}

                                {!isAnyPreviewPending && previewError && (
                                  <div className="rounded-xl border border-red-200 bg-red-50 p-3">
                                    <p className="text-xs text-red-600">{previewError}</p>
                                  </div>
                                )}

                                {!isAnyPreviewPending && !previewImageUrl && carouselPreviewUrls.length === 0 && !previewError && (
                                  <div className="rounded-xl border border-dashed border-zinc-200 bg-zinc-50 p-6 text-center">
                                    <p className="text-xs text-zinc-400">Click "Generate Preview" to see how your image will look.</p>
                                  </div>
                                )}
                              </div>
                            )}
                          </>
                        )}

                      </div>

                      {/* Review footer */}
                      <div className="shrink-0 border-t border-surface-100 px-5 py-4 flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="shrink-0"
                          onClick={() => setPhase('config')}
                        >
                          ↩ Change
                        </Button>

                        {/* Regenerate popover */}
                        <div className="relative flex-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="w-full"
                            disabled={isGeneratingScript}
                            onClick={() => setShowRegenPopover(p => !p)}
                          >
                            <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
                            Regenerate
                          </Button>
                          {showRegenPopover && (
                            <div className="absolute bottom-full left-0 right-0 mb-2 bg-white border border-surface-200 rounded-xl shadow-elevated p-3 space-y-2 z-10">
                              <p className="text-xs font-medium text-zinc-700">What to change?</p>
                              <textarea
                                rows={2}
                                value={regenNote}
                                onChange={e => setRegenNote(e.target.value)}
                                placeholder="e.g. Make it funnier, focus on price…"
                                className="w-full px-2.5 py-2 text-xs border border-surface-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-400 resize-none"
                              />
                              <Button
                                variant="primary"
                                size="sm"
                                className="w-full"
                                loading={isGeneratingScript}
                                onClick={() => {
                                  setUserAngle(regenNote)
                                  setShowRegenPopover(false)
                                  runGenerateScript()
                                }}
                              >
                                Regenerate
                              </Button>
                            </div>
                          )}
                        </div>

                        <Button
                          variant="primary"
                          className="shrink-0 flex items-center gap-1.5"
                          loading={isCreatingPost}
                          onClick={() => runGeneratePost()}
                        >
                          Create Post ✨
                        </Button>
                      </div>
                    </>
                  )}

                </div>
              </motion.div>
            </Dialog.Content>
          </Dialog.Portal>
        )}
      </AnimatePresence>
    </Dialog.Root>
  )
}
