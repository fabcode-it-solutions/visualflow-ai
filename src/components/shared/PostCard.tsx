import { useState, useRef } from 'react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { ConfirmDialog } from './ConfirmDialog'
import { BoostConfirmDialog } from './BoostConfirmDialog'
import { EditPostModal } from './EditPostModal'
import { PostViewModal } from './PostViewModal'
import { smartDate } from '@utils/dateUtils'
import type { Post } from '@/types/post.types'
import { Image, CheckCircle, Edit2, X as XIcon, Video, RefreshCw, Eye, Link2, Copy, Check, ArrowUpRight } from 'lucide-react'
import { cn } from '@utils/cn'

interface PostCardProps {
  post: Post
  productName?: string
  productImageUrl?: string
  onApprove?: (id: string) => void
  onSkip?: (id: string) => void
  onRestore?: (id: string) => void
  onDelete?: (id: string) => void
  onSave?: (id: string, captionInstagram: string, captionFacebook: string, hashtags: string[]) => void
  onRegenerate?: (id: string) => void
  onRegenerateWithNote?: (id: string) => void
  onSwapProduct?: (id: string) => void
  onOverrideHold?: (id: string) => void
  onReplaceProduct?: (id: string) => void
  onRetryFailed?: (id: string) => void
  onPublish?: (id: string) => void
  onSchedule?: (id: string, scheduledAt: string) => void | Promise<void>
  onBoost?: (id: string, budget: number, durationHours: number) => void
  onRetryReel?: (id: string) => void
  storeTimezone?: string
  isApproving?: boolean
  isSkipping?: boolean
  isRestoring?: boolean
  isDeleting?: boolean
  isSaving?: boolean
  isRegenerating?: boolean
  isPublishing?: boolean
  isBoosting?: boolean
  isRetryingReel?: boolean
  isOverridingHold?: boolean
  isRetryingPost?: boolean
  readOnly?: boolean
  directActions?: boolean
  onProductClick?: () => void
}

const POST_TYPE_LABELS: Record<string, string> = {
  feed_image: '🖼️ Feed',
  carousel:   '🎠 Carousel',
  story:      '📖 Story',
  reel:       '🎬 Reel',
  ad:         '📢 Ad',
}

const PLATFORM_COLORS: Record<string, string> = {
  instagram: 'bg-pink-50 text-pink-700 border-pink-200',
  facebook:  'bg-blue-50 text-blue-700 border-blue-200',
  both:      'bg-violet-50 text-violet-700 border-violet-200',
}

const PLATFORM_ICON: Record<string, string> = {
  instagram: '📷',
  facebook:  '👍',
  both:      '📱',
}

export function PostCard({
  post,
  productName = 'Product',
  productImageUrl,
  onApprove,
  onSkip,
  onRestore,
  onDelete,
  onSave,
  onRegenerate,
  onOverrideHold,
  onReplaceProduct,
  onRetryFailed,
  onPublish,
  onSchedule,
  onBoost,
  onRetryReel,
  storeTimezone = 'Asia/Kolkata',
  isApproving = false,
  isSkipping = false,
  isRestoring = false,
  isDeleting = false,
  isSaving = false,
  isRegenerating = false,
  isPublishing = false,
  isBoosting = false,
  isRetryingReel = false,
  isOverridingHold = false,
  isRetryingPost = false,
  readOnly = false,
  directActions = false,
  onProductClick,
}: PostCardProps) {
  const thumbnail = post.mediaUrls?.[0] ?? productImageUrl ?? null
  const isReelWithoutVideo = post.postType === 'reel' && (!post.mediaUrls || post.mediaUrls.length === 0)
  const postTypeLabel = post.postType ? (POST_TYPE_LABELS[post.postType] ?? post.postType) : null
  const isCollection = post.metadata?.collectionType === 'collection'
  const isTestimonial = post.metadata?.testimonialType === 'testimonial'
  const caption = post.captionInstagram ?? post.captionFacebook ?? post.caption ?? ''
  const isStory = post.postType === 'story'
  const isScheduledPost = (post.status === 'approved' || post.status === 'scheduled') && Boolean(post.scheduledAt)

  const [editModalOpen, setEditModalOpen] = useState(false)
  const [viewModalOpen, setViewModalOpen] = useState(false)
  const [boostDialogOpen, setBoostDialogOpen] = useState(false)
  const [confirmAction, setConfirmAction] = useState<'approve' | 'skip' | 'publish' | null>(null)
  const [isApproved, setIsApproved] = useState(post.status === 'approved')
  const [urlCopied, setUrlCopied] = useState(false)
  const [captionCopied, setCaptionCopied] = useState(false)
  const [scheduleOpen, setScheduleOpen] = useState(false)
  const [scheduleValue, setScheduleValue] = useState('')
  const [isScheduling, setIsScheduling] = useState(false)
  const scheduleInputRef = useRef<HTMLInputElement>(null)

  const handleCopyUrl = () => {
    if (!post.shopifyProductUrl) return
    void navigator.clipboard.writeText(post.shopifyProductUrl).then(() => {
      setUrlCopied(true)
      setTimeout(() => setUrlCopied(false), 2000)
    })
  }

  const handleCopyCaption = () => {
    const text = post.captionInstagram ?? post.captionFacebook ?? post.caption ?? ''
    if (!text) return
    void navigator.clipboard.writeText(text).then(() => {
      setCaptionCopied(true)
      setTimeout(() => setCaptionCopied(false), 2000)
    })
  }

  const handleApprove = () => { onApprove?.(post.id); setIsApproved(true); setConfirmAction(null) }
  const handleSkip = () => { onSkip?.(post.id); setConfirmAction(null) }
  const handleRestore = () => { onRestore?.(post.id); setConfirmAction(null) }
  const handleDeleteDraft = () => { onDelete?.(post.id); setConfirmAction(null) }
  const handlePublish = () => { onPublish?.(post.id); setConfirmAction(null) }
  const handleSave = (ig: string, fb: string, tags: string[]) => onSave?.(post.id, ig, fb, tags)
  const handleRegenerate = () => onRegenerate?.(post.id)
  const handleBoost = (budget: number, hours: number) => { onBoost?.(post.id, budget, hours); setBoostDialogOpen(false) }

  // ── Schedule helpers ───────────────────────────────────────────────────────
  // Format a Date as "YYYY-MM-DDTHH:mm" in local wall time for datetime-local input
  const toLocalDatetimeString = (date: Date): string => {
    const pad = (n: number) => String(n).padStart(2, '0')
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
  }

  const handleOpenSchedule = () => {
    const now = new Date()
    const defaultDate = post.scheduledAt
      ? new Date(post.scheduledAt)
      : new Date(now.getTime() + 24 * 60 * 60 * 1000)
    setScheduleValue(toLocalDatetimeString(defaultDate))
    setScheduleOpen(true)
    setTimeout(() => scheduleInputRef.current?.focus(), 50)
  }

  const scheduleMin = toLocalDatetimeString(new Date(Date.now() + 5 * 60 * 1000))

  const handleConfirmSchedule = async () => {
    if (!scheduleValue) return
    const picked = new Date(scheduleValue)
    if (picked <= new Date(Date.now() + 4 * 60 * 1000)) return
    setIsScheduling(true)
    try {
      await onSchedule?.(post.id, picked.toISOString())
      setScheduleOpen(false)
    } catch {
      // Mutation-level toast handles the visible error; keep the picker open.
    } finally {
      setIsScheduling(false)
    }
  }

  const platformStr = post.platform as string
  const platformLabel = platformStr === 'both' ? 'IG + FB' : platformStr === 'instagram' ? 'Instagram' : 'Facebook'

  return (
    <>
      <Card className={cn(
        'flex flex-col overflow-hidden bg-white transition-all duration-200 border hover:shadow-md',
        post.status === 'held' ? 'border-amber-300' : 'border-zinc-100',
      )}>

        {/* ── Main row: thumbnail + content ── */}
        <div className="flex gap-3.5 p-4">

          {/* Thumbnail */}
          <button
            type="button"
            onClick={() => setViewModalOpen(true)}
            aria-label="Preview post"
            className="group relative shrink-0 w-20 h-20 rounded-xl overflow-hidden bg-zinc-100 flex items-center justify-center"
          >
            {thumbnail ? (
              <>
                <img src={thumbnail} alt={productName} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200" />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center">
                  <Eye className="w-5 h-5 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                {post.postType === 'carousel' && (post.mediaUrls?.length ?? 0) > 1 && (
                  <div className="absolute bottom-1 right-1 bg-black/70 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full leading-none">
                    {post.mediaUrls?.length}
                  </div>
                )}
              </>
            ) : isReelWithoutVideo ? (
              <div className="bg-zinc-900 w-full h-full flex items-center justify-center">
                <Video className="w-6 h-6 text-zinc-500" />
              </div>
            ) : (
              <Image className="w-6 h-6 text-zinc-300" />
            )}
          </button>

          {/* Content */}
          <div className="flex-1 min-w-0 flex flex-col gap-1.5">
            {/* Badges row */}
            <div className="flex items-center gap-1.5 flex-wrap">
              {postTypeLabel && (
                <span className="inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-full bg-brand-50 text-brand-700 border border-brand-100">
                  {postTypeLabel}
                </span>
              )}
              {isCollection && (
                <span className="inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-100">
                  ✨ Collection
                </span>
              )}
              {isTestimonial && (
                <span className="inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-100">
                  ⭐ Testimonial
                </span>
              )}
              <span className={cn(
                'inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border',
                PLATFORM_COLORS[post.platform] ?? 'bg-zinc-50 text-zinc-600 border-zinc-200',
              )}>
                {PLATFORM_ICON[platformStr]} {platformLabel}
              </span>
              {post.generationError && (
                <span className="inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                  ⚠️ Incomplete
                </span>
              )}
            </div>

            {/* Product name */}
            {onProductClick ? (
              <button
                type="button"
                onClick={onProductClick}
                className="group/name flex items-center gap-1 text-sm font-semibold text-zinc-900 leading-tight truncate hover:text-brand-600 transition-colors cursor-pointer text-left"
              >
                {productName}
                <ArrowUpRight className="h-3.5 w-3.5 shrink-0 opacity-0 group-hover/name:opacity-100 transition-opacity text-brand-500" />
              </button>
            ) : (
              <p className="text-sm font-semibold text-zinc-900 leading-tight truncate">{productName}</p>
            )}

            {/* Caption or story badge */}
            {isStory ? (
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2.5 py-1 rounded-full bg-linear-to-r from-violet-500 to-brand-600 text-white self-start">
                ✦ Text baked into image
              </span>
            ) : (
              <p className="text-xs text-zinc-500 line-clamp-2 leading-relaxed">
                {caption || <span className="italic text-zinc-400">No caption yet</span>}
              </p>
            )}

            {/* Footer row */}
            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
              {post.hashtags && post.hashtags.length > 0 && (
                <span className="text-[10px] text-zinc-400 font-medium">📎 {post.hashtags.length} tags</span>
              )}
              {post.scheduledAt && (
                <span className="text-[10px] text-zinc-400 font-medium">📅 {smartDate(post.scheduledAt)}</span>
              )}
            </div>

            {/* Product link row */}
            {post.shopifyProductUrl && (
              <button
                type="button"
                onClick={handleCopyUrl}
                className="flex items-center gap-1.5 mt-0.5 group w-full min-w-0"
                title={post.shopifyProductUrl}
              >
                <Link2 className="w-3 h-3 text-brand-500 shrink-0" />
                <span className="text-[10px] text-brand-600 truncate flex-1 text-left font-medium">
                  {post.shopifyProductUrl.replace(/^https?:\/\//, '').slice(0, 48)}…
                </span>
                {urlCopied
                  ? <Check className="w-3 h-3 text-emerald-500 shrink-0" />
                  : <Copy className="w-3 h-3 text-zinc-400 group-hover:text-brand-500 shrink-0 transition-colors" />
                }
              </button>
            )}
          </div>
        </div>

        {/* ── Status-specific detail banners ── */}
        {post.status === 'held' && (
          <div className="mx-4 mb-3 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 flex items-center gap-2">
            <span className="text-sm">⚠️</span>
            <p className="text-xs text-amber-800 font-medium">
              Held — low inventory
              {post.metadata && typeof post.metadata === 'object' && 'inventoryAtHold' in post.metadata
                ? ` (${String(post.metadata['inventoryAtHold'])} units left)`
                : ''}
            </p>
          </div>
        )}

        {post.status === 'failed' && (
          <div className="mx-4 mb-3 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            <p className="text-xs text-red-800 font-semibold">❌ Failed to publish</p>
            {post.metadata && typeof post.metadata === 'object' && 'failReason' in post.metadata && (
              <p className="text-xs text-red-700 mt-0.5 line-clamp-1">{String(post.metadata['failReason'])}</p>
            )}
          </div>
        )}

        {/* ── Action bar ── */}
        {directActions && !readOnly && post.status === 'pending_approval' && !isReelWithoutVideo ? (
          /* Premium two-row layout for direct-action pending posts */
          <div className="border-t border-zinc-100">
            {/* Row 1 — secondary actions */}
            <div className="flex items-center gap-0.5 px-3 py-1.5 border-b border-zinc-50">
              <button
                onClick={() => onProductClick ? onProductClick() : setViewModalOpen(true)}
                aria-label={onProductClick ? 'View product page' : 'Preview post'}
                className="flex items-center gap-1 text-[11px] font-medium text-zinc-400 hover:text-brand-600 px-2 py-1 rounded-md hover:bg-brand-50 transition-all"
              >
                {onProductClick ? <ArrowUpRight className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />} View
              </button>
              {!isStory && (
                <button
                  onClick={() => setEditModalOpen(true)}
                  className="flex items-center gap-1 text-[11px] font-medium text-zinc-400 hover:text-brand-600 px-2 py-1 rounded-md hover:bg-brand-50 transition-all"
                >
                  <Edit2 className="w-3.5 h-3.5" /> Edit
                </button>
              )}
            </div>
            {/* Row 2 — primary actions */}
            <div className="flex items-center gap-2 px-3 py-2.5">
              {onSkip && (
                <button
                  onClick={() => setConfirmAction('skip')}
                  disabled={isSkipping || isPublishing}
                  className="flex items-center gap-1.5 text-xs font-semibold text-red-400 hover:text-red-500 px-2 py-1.5 rounded-lg hover:bg-red-50 transition-all disabled:opacity-40"
                >
                  <XIcon className="w-3.5 h-3.5" /> Skip
                </button>
              )}
              <div className="flex-1 flex items-center gap-2">
                {onSchedule && (
                  <button
                    onClick={handleOpenSchedule}
                    disabled={isPublishing || isSkipping}
                    className="flex-1 flex items-center justify-center gap-1.5 text-xs font-semibold text-zinc-600 bg-zinc-100 hover:bg-zinc-200 rounded-lg py-2 transition-all disabled:opacity-40"
                  >
                    <span className="text-sm leading-none">📅</span> Schedule
                  </button>
                )}
                {onPublish && (
                  <button
                    onClick={() => setConfirmAction('publish')}
                    disabled={isPublishing || isSkipping}
                    className={cn(
                      'flex-1 flex items-center justify-center gap-1.5 text-xs font-bold rounded-lg py-2 transition-all disabled:opacity-40',
                      isPublishing
                        ? 'bg-emerald-400 text-white cursor-wait'
                        : 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-sm shadow-emerald-200',
                    )}
                  >
                    {isPublishing ? (
                      <><span className="w-3 h-3 rounded-full border-2 border-white/40 border-t-white animate-spin" /> Publishing…</>
                    ) : (
                      <><span className="text-sm leading-none">📤</span> Publish Now</>
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>
        ) : (
        <div className={cn(
          'border-t px-4 py-2.5',
          post.status === 'published' || isScheduledPost ? 'space-y-2' : 'flex items-center gap-1.5',
          post.status === 'held'      ? 'border-amber-200 bg-amber-50/50' :
          post.status === 'approved'  ? 'border-emerald-100 bg-emerald-50/40' :
          post.status === 'scheduled' ? 'border-emerald-100 bg-emerald-50/40' :
          post.status === 'published' ? 'border-emerald-100 bg-emerald-50/40' :
          post.status === 'failed'    ? 'border-red-100 bg-red-50/40' :
          'border-zinc-100 bg-zinc-50/50',
        )}>

          {post.status === 'published' && (
            <div className="flex items-center gap-1.5 text-emerald-700 min-w-0">
              <CheckCircle className="h-3.5 w-3.5 shrink-0" />
              <span className="text-xs font-semibold truncate">
                {post.publishedAt
                  ? `Published ${new Date(post.publishedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} at ${new Date(post.publishedAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}`
                  : 'Published'}
              </span>
            </div>
          )}

          {isScheduledPost && (
            <>
              <div className="flex items-center gap-1.5 text-emerald-700 min-w-0">
                <CheckCircle className="h-3.5 w-3.5 shrink-0" />
                <span className="text-xs font-semibold truncate">
                  Scheduled {new Date(post.scheduledAt as string).toLocaleDateString('en-IN', { timeZone: storeTimezone, day: 'numeric', month: 'short' })} at {new Date(post.scheduledAt as string).toLocaleTimeString('en-IN', { timeZone: storeTimezone, hour: '2-digit', minute: '2-digit', hour12: true })}
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => onProductClick ? onProductClick() : setViewModalOpen(true)}
                  aria-label={onProductClick ? 'View product page' : 'Preview post'}
                  className="flex min-h-11 items-center justify-center gap-1 rounded-lg border border-emerald-100 bg-white/80 px-2 py-2 text-xs font-medium text-zinc-600 transition-all hover:bg-white hover:text-brand-600"
                >
                  {onProductClick ? <ArrowUpRight className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  View
                </button>
                {onSchedule && (
                  <button
                    type="button"
                    onClick={handleOpenSchedule}
                    className="flex min-h-11 items-center justify-center gap-1 rounded-lg border border-emerald-100 bg-white/80 px-2 py-2 text-xs font-medium text-zinc-600 transition-all hover:bg-white hover:text-brand-600"
                  >
                    📅 Change Time
                  </button>
                )}
                {!isReelWithoutVideo && onPublish && (
                  <button
                    type="button"
                    onClick={() => setConfirmAction('publish')}
                    disabled={isPublishing}
                    className="col-span-2 flex min-h-11 items-center justify-center gap-1 rounded-lg bg-emerald-600 px-2 py-2 text-xs font-bold text-white shadow-sm shadow-emerald-100 transition-all hover:bg-emerald-700 disabled:opacity-50 sm:col-span-1"
                  >
                    {isPublishing ? 'Publishing...' : '📤 Publish Now'}
                  </button>
                )}
              </div>
            </>
          )}

          {/* View always available */}
          {!isScheduledPost && (
          <div className={cn(
            post.status === 'published'
              ? 'grid grid-cols-2 gap-2'
              : 'contents',
          )}>
            <button
              onClick={() => onProductClick ? onProductClick() : setViewModalOpen(true)}
              aria-label={onProductClick ? 'View product page' : 'Preview post'}
              className={cn(
                'flex items-center gap-1 text-xs font-medium text-zinc-500 hover:text-brand-600 px-2 py-1.5 rounded-lg hover:bg-brand-50 transition-all',
                post.status === 'published' && 'justify-center min-h-9 bg-white/80 border border-emerald-100 text-zinc-600',
              )}
            >
              {onProductClick ? <ArrowUpRight className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              View
            </button>
            {post.status === 'published' && (
              <button
                type="button"
                onClick={handleCopyCaption}
                className="flex min-h-9 items-center justify-center gap-1 rounded-lg border border-emerald-100 bg-white/80 px-2 py-1.5 text-xs font-medium text-zinc-600 transition-all hover:bg-white hover:text-brand-600"
              >
                {captionCopied ? '✓ Copied' : '📋 Copy Caption'}
              </button>
            )}
          </div>
          )}

          {/* Edit only for non-story posts */}
          {!isStory && !readOnly && post.status !== 'published' && !isScheduledPost && (
            <button
              onClick={() => setEditModalOpen(true)}
              className="flex items-center gap-1 text-xs font-medium text-zinc-500 hover:text-brand-600 px-2 py-1.5 rounded-lg hover:bg-brand-50 transition-all"
            >
              <Edit2 className="w-3.5 h-3.5" />
              Edit
            </button>
          )}

          {post.status !== 'published' && !isScheduledPost && <div className="flex-1" />}

          {/* Status-specific right-side actions */}
          {!readOnly && !isScheduledPost && post.status === 'pending_approval' && (
            isReelWithoutVideo ? (
              <>
                {onDelete && (
                  <Button variant="ghost" size="sm" onClick={handleDeleteDraft} disabled={isDeleting || isRetryingReel}
                    className="text-red-600 hover:bg-red-50 text-xs h-8 px-3">Delete</Button>
                )}
                {onRetryReel && (
                  <Button variant="primary" size="sm" onClick={() => onRetryReel(post.id)} disabled={isRetryingReel || isDeleting}
                    loading={isRetryingReel} leftIcon={<RefreshCw className="w-3 h-3" />} className="text-xs h-8 px-3">Retry</Button>
                )}
              </>
            ) : (
              <>
                {onSkip && (
                  <Button variant="ghost" size="sm" onClick={() => setConfirmAction('skip')} disabled={isSkipping || isApproving}
                    leftIcon={<XIcon className="w-3.5 h-3.5" />}
                    className="text-amber-600 hover:bg-amber-50 hover:text-amber-700 text-xs h-8 px-3">Skip</Button>
                )}
                {onApprove && (
                  <Button variant="primary" size="sm" onClick={() => setConfirmAction('approve')} disabled={isApproving || isSkipping}
                    loading={isApproving} className="text-xs h-8 px-3 font-semibold">
                    {isApproved ? '✓ Approved' : 'Approve'}
                  </Button>
                )}
              </>
            )
          )}

          {!readOnly && !isScheduledPost && post.status === 'approved' && (
            <>
              {isReelWithoutVideo && onRetryReel && (
                <Button variant="primary" size="sm" onClick={() => onRetryReel(post.id)} disabled={isRetryingReel}
                  loading={isRetryingReel} leftIcon={<RefreshCw className="w-3 h-3" />} className="text-xs h-8 px-3">Retry Reel</Button>
              )}
              {!isReelWithoutVideo && onPublish && (
                <Button variant="success" size="sm" onClick={() => setConfirmAction('publish')} disabled={isPublishing}
                  loading={isPublishing} className="text-xs h-8 px-3 font-semibold">📤 Publish Now</Button>
              )}
              {onSchedule && (
                <Button variant="secondary" size="sm" onClick={handleOpenSchedule}
                  className="text-xs h-8 px-3">📅 Schedule</Button>
              )}
              <div className="flex items-center gap-1.5 text-emerald-700">
                <CheckCircle className="h-3.5 w-3.5" />
                <span className="text-xs font-semibold">Ready</span>
              </div>
            </>
          )}

          {readOnly && !isScheduledPost && post.status === 'approved' && (
            <div className="flex items-center gap-1.5 text-emerald-700">
              <CheckCircle className="h-3.5 w-3.5" />
              <span className="text-xs font-semibold">Ready</span>
            </div>
          )}

          {!readOnly && post.status === 'draft' && (
            <>
              {onDelete && (
                <Button variant="ghost" size="sm" onClick={handleDeleteDraft} disabled={isDeleting || isRestoring}
                  className="text-red-600 hover:bg-red-50 text-xs h-8 px-3">Delete</Button>
              )}
              {onRestore && (
                <Button variant="primary" size="sm" onClick={handleRestore} disabled={isRestoring || isDeleting}
                  loading={isRestoring} className="text-xs h-8 px-3 font-semibold">Restore</Button>
              )}
            </>
          )}

          {!readOnly && post.status === 'held' && (
            <>
              {onReplaceProduct && (
                <Button variant="ghost" size="sm" onClick={() => onReplaceProduct(post.id)} className="text-xs h-8 px-3">Replace</Button>
              )}
              {onOverrideHold && (
                <Button variant="primary" size="sm" onClick={() => onOverrideHold(post.id)} disabled={isOverridingHold}
                  loading={isOverridingHold} className="text-xs h-8 px-3 bg-amber-600 hover:bg-amber-700 font-semibold">Publish Anyway</Button>
              )}
            </>
          )}

          {!readOnly && post.status === 'failed' && (
            <>
              {onDelete && (
                <Button variant="ghost" size="sm" onClick={() => onDelete(post.id)} disabled={isDeleting}
                  loading={isDeleting} className="text-xs h-8 px-3">Delete</Button>
              )}
              {onRetryFailed && (
                <Button variant="primary" size="sm" onClick={() => onRetryFailed(post.id)} disabled={isRetryingPost}
                  loading={isRetryingPost} leftIcon={<RefreshCw className="h-3 w-3" />} className="text-xs h-8 px-3 font-semibold">Retry</Button>
              )}
            </>
          )}

        </div>
        )}

        {/* ── Inline schedule picker ── */}
        {scheduleOpen && (post.status === 'approved' || post.status === 'scheduled' || (directActions && post.status === 'pending_approval')) && (
          <div className="border-t border-zinc-100 px-4 py-3 bg-zinc-50 space-y-2">
            {post.scheduledAt && (
              <p className="text-xs text-zinc-500">
                Currently scheduled: <span className="font-medium text-zinc-700">
                  {new Date(post.scheduledAt).toLocaleString('en-IN', { timeZone: storeTimezone, dateStyle: 'medium', timeStyle: 'short' })}
                </span>
              </p>
            )}
            <label className="block text-xs font-medium text-zinc-700 mb-1">Pick date &amp; time (IST)</label>
            <input
              ref={scheduleInputRef}
              type="datetime-local"
              value={scheduleValue}
              min={scheduleMin}
              onChange={(e) => setScheduleValue(e.target.value)}
              className="w-full text-sm border border-zinc-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-400 bg-white"
            />
            <div className="flex items-center gap-3 pt-1">
              <Button
                variant="primary"
                size="sm"
                className="text-xs h-8 px-3"
                loading={isScheduling}
                disabled={!scheduleValue || isScheduling}
                onClick={() => void handleConfirmSchedule()}
              >
                Confirm Schedule
              </Button>
              <button
                type="button"
                className="text-xs text-zinc-400 hover:text-zinc-600 underline"
                onClick={() => setScheduleOpen(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </Card>

      <PostViewModal post={post} productName={productName} open={viewModalOpen} onClose={() => setViewModalOpen(false)} />

      <EditPostModal open={editModalOpen} onOpenChange={setEditModalOpen} post={post}
        onSave={handleSave} onRegenerate={handleRegenerate} isSaving={isSaving} isRegenerating={isRegenerating} />

      <ConfirmDialog open={confirmAction === 'approve'} title="Approve Post?"
        description={`This post will be ready to publish to ${platformLabel}.`}
        confirmText="Approve" cancelText="Cancel" variant="success"
        onConfirm={handleApprove} onClose={() => setConfirmAction(null)} isConfirming={isApproving} />

      <ConfirmDialog open={confirmAction === 'skip'} title="Skip this post?"
        description="It won't be published." confirmText="Skip Post" cancelText="Cancel" variant="danger"
        onConfirm={handleSkip} onClose={() => setConfirmAction(null)} isConfirming={isSkipping} />

      <ConfirmDialog open={confirmAction === 'publish'} title="Publish this post?"
        description={`This will go live on ${platformLabel} immediately.`}
        confirmText="Publish" cancelText="Cancel" variant="success"
        onConfirm={handlePublish} onClose={() => setConfirmAction(null)} isConfirming={isPublishing} />

      <BoostConfirmDialog open={boostDialogOpen} onClose={() => setBoostDialogOpen(false)}
        onConfirm={handleBoost} isConfirming={isBoosting} />
    </>
  )
}
