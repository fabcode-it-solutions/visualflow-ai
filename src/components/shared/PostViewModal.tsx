import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, ChevronLeft, ChevronRight, Image as ImageIcon, ZoomIn } from 'lucide-react'
import { cn } from '@utils/cn'
import { smartDate } from '@utils/dateUtils'
import type { Post } from '@/types/post.types'

interface PostViewModalProps {
  post: Post
  productName?: string
  open: boolean
  onClose: () => void
}

const POST_TYPE_LABELS: Record<string, string> = {
  feed_image: '🖼️ Feed',
  carousel:   '🎠 Carousel',
  story:      '📖 Story',
  reel:       '🎬 Reel',
  ad:         '📢 Ad',
}

// ─── Lightbox ────────────────────────────────────────────────────────────────

function Lightbox({ src, alt, onClose }: { src: string; alt: string; onClose: () => void }) {
  useEffect(() => {
    const fn = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', fn)
    return () => window.removeEventListener('keydown', fn)
  }, [onClose])

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      className="fixed inset-0 z-100 bg-black/95 flex items-center justify-center p-4"
    >
      <button
        onClick={onClose}
        className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
      >
        <X className="w-5 h-5" />
      </button>
      <motion.img
        initial={{ scale: 0.93, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 300, damping: 26 }}
        src={src}
        alt={alt}
        onClick={(e) => e.stopPropagation()}
        className="max-w-full max-h-[92vh] object-contain rounded-2xl shadow-2xl"
      />
    </motion.div>
  )
}

// ─── Caption tabs ─────────────────────────────────────────────────────────────

function CaptionTabs({ post }: { post: Post }) {
  const hasIG = !!(post.captionInstagram ?? post.caption)
  const hasFB = !!post.captionFacebook
  const isBoth = (post.platform as string) === 'both' || (hasIG && hasFB)

  const [tab, setTab] = useState<'instagram' | 'facebook'>(
    (post.platform as string) === 'facebook' ? 'facebook' : 'instagram',
  )

  const captionIG = post.captionInstagram ?? post.caption ?? ''
  const captionFB = post.captionFacebook ?? post.caption ?? ''
  const activeCaption = tab === 'instagram' ? captionIG : captionFB

  return (
    <div className="space-y-3">
      {isBoth && (
        <div className="flex rounded-xl overflow-hidden border border-zinc-200 p-0.5 bg-zinc-100 gap-0.5">
          <button
            onClick={() => setTab('instagram')}
            className={cn(
              'flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-semibold rounded-lg transition-all',
              tab === 'instagram'
                ? 'bg-white shadow-sm text-zinc-900'
                : 'text-zinc-500 hover:text-zinc-700',
            )}
          >
            <span className="text-base leading-none">📷</span>
            Instagram
          </button>
          <button
            onClick={() => setTab('facebook')}
            className={cn(
              'flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-semibold rounded-lg transition-all',
              tab === 'facebook'
                ? 'bg-white shadow-sm text-zinc-900'
                : 'text-zinc-500 hover:text-zinc-700',
            )}
          >
            <span className="text-base leading-none">👍</span>
            Facebook
          </button>
        </div>
      )}

      {!isBoth && (
        <div className="flex items-center gap-1.5">
          <span className="text-sm">{(post.platform as string) === 'facebook' ? '👍' : '📷'}</span>
          <p className="text-xs font-bold text-zinc-400 uppercase tracking-wide">
            {(post.platform as string) === 'facebook' ? 'Facebook' : 'Instagram'} Caption
          </p>
        </div>
      )}

      <div className="bg-zinc-50 rounded-xl p-3.5 border border-zinc-100 min-h-20">
        <p className="text-sm text-zinc-800 leading-relaxed whitespace-pre-wrap">
          {activeCaption || <span className="text-zinc-400 italic">(no caption)</span>}
        </p>
      </div>
      {activeCaption && (
        <p className="text-xs text-zinc-400 text-right">{activeCaption.length} / 2200</p>
      )}
    </div>
  )
}

// ─── Main Modal ───────────────────────────────────────────────────────────────

export function PostViewModal({ post, productName = 'Product', open, onClose }: PostViewModalProps) {
  const [slide, setSlide] = useState(0)
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null)

  const images = post.mediaUrls && post.mediaUrls.length > 0
    ? post.mediaUrls
    : post.imageUrl ? [post.imageUrl] : []

  const totalSlides = images.length
  const currentImage = images[slide] ?? null
  const isCarousel = post.postType === 'carousel' && totalSlides > 1
  const isStory = post.postType === 'story'

  const prev = useCallback(() => setSlide(s => Math.max(0, s - 1)), [])
  const next = useCallback(() => setSlide(s => Math.min(totalSlides - 1, s + 1)), [totalSlides])

  useEffect(() => { setSlide(0) }, [post.id])

  useEffect(() => {
    if (!open) return
    const fn = (e: KeyboardEvent) => { if (e.key === 'Escape' && !lightboxSrc) onClose() }
    window.addEventListener('keydown', fn)
    return () => window.removeEventListener('keydown', fn)
  }, [open, onClose, lightboxSrc])

  const postTypeLabel = post.postType ? (POST_TYPE_LABELS[post.postType] ?? post.postType) : null
  const isCollection = post.metadata?.collectionType === 'collection'
  const isTestimonial = post.metadata?.testimonialType === 'testimonial'

  return (
    <>
      <AnimatePresence>
        {open && (
          <>
            {/* Backdrop */}
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onClose}
              className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm"
            />

            {/* Sheet */}
            <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 pointer-events-none">
              <motion.div
                key="modal"
                initial={{ opacity: 0, y: 40, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 24, scale: 0.98 }}
                transition={{ type: 'spring', stiffness: 380, damping: 32 }}
                onClick={e => e.stopPropagation()}
                className="pointer-events-auto w-full sm:max-w-xl bg-white sm:rounded-3xl rounded-t-3xl shadow-2xl flex flex-col overflow-hidden max-h-[92vh]"
              >
                {/* ── Header ── */}
                <div className="flex items-center justify-between px-5 py-3.5 border-b border-zinc-100 shrink-0">
                  <div className="flex items-center gap-2">
                    {postTypeLabel && (
                      <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-brand-50 text-brand-700 border border-brand-100">
                        {postTypeLabel}
                      </span>
                    )}
                    {isCollection && (
                      <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-100">
                        ✨ Collection
                      </span>
                    )}
                    {isTestimonial && (
                      <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-100">
                        ⭐ Testimonial
                      </span>
                    )}
                    <span className="text-sm font-semibold text-zinc-800 truncate max-w-45">{productName}</span>
                  </div>
                  <button
                    onClick={onClose}
                    className="w-8 h-8 rounded-full bg-zinc-100 hover:bg-zinc-200 flex items-center justify-center transition-colors shrink-0"
                  >
                    <X className="w-4 h-4 text-zinc-600" />
                  </button>
                </div>

                {/* ── Scrollable body ── */}
                <div className="overflow-y-auto flex-1 overscroll-contain">

                  {/* ── Image section ── */}
                  <div className={cn(
                    'relative bg-zinc-950 flex items-center justify-center w-full overflow-hidden',
                    isStory ? 'max-h-[55vh]' : 'max-h-[50vh]',
                  )}>
                    {currentImage ? (
                      <>
                        <img
                          src={currentImage}
                          alt={post.imageAltText || productName}
                          className={cn(
                            'w-full h-full',
                            isStory ? 'object-contain max-h-[55vh]' : 'object-contain max-h-[50vh]',
                          )}
                        />

                        {/* Zoom */}
                        <button
                          onClick={() => setLightboxSrc(currentImage)}
                          className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/70 transition-colors"
                        >
                          <ZoomIn className="w-3.5 h-3.5" />
                        </button>

                        {/* Carousel controls */}
                        {isCarousel && (
                          <>
                            {slide > 0 && (
                              <button onClick={prev}
                                className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/70 transition-colors">
                                <ChevronLeft className="w-4 h-4" />
                              </button>
                            )}
                            {slide < totalSlides - 1 && (
                              <button onClick={next}
                                className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/70 transition-colors">
                                <ChevronRight className="w-4 h-4" />
                              </button>
                            )}
                            {/* Slide counter */}
                            <div className="absolute top-3 left-3 bg-black/60 backdrop-blur-sm text-white text-xs font-bold px-2.5 py-1 rounded-full">
                              {slide + 1} / {totalSlides}
                            </div>
                            {/* Dot strip */}
                            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                              {images.map((_, i) => (
                                <button key={i} onClick={() => setSlide(i)}
                                  className={cn('rounded-full transition-all duration-200',
                                    i === slide ? 'w-5 h-1.5 bg-white' : 'w-1.5 h-1.5 bg-white/40 hover:bg-white/70',
                                  )} />
                              ))}
                            </div>
                          </>
                        )}
                      </>
                    ) : (
                      <div className="h-40 flex flex-col items-center justify-center text-zinc-600 gap-2">
                        <ImageIcon className="w-10 h-10 opacity-30" />
                        <span className="text-xs opacity-50">No image</span>
                      </div>
                    )}
                  </div>

                  {/* Carousel thumbnail strip */}
                  {isCarousel && totalSlides > 1 && (
                    <div className="flex gap-1.5 px-4 py-2.5 bg-zinc-900 overflow-x-auto">
                      {images.map((url, i) => (
                        <button key={i} onClick={() => setSlide(i)}
                          className={cn(
                            'shrink-0 w-12 h-12 rounded-lg overflow-hidden border-2 transition-all',
                            i === slide ? 'border-white' : 'border-transparent opacity-50 hover:opacity-80',
                          )}>
                          <img src={url} alt={`Slide ${i + 1}`} className="w-full h-full object-cover" />
                        </button>
                      ))}
                    </div>
                  )}

                  {/* ── Caption / content section ── */}
                  <div className="p-5 space-y-4">
                    {isStory ? (
                      <div className="flex flex-col items-center gap-3 py-4 text-center">
                        <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold bg-linear-to-r from-violet-500 to-brand-600 text-white shadow-md">
                          ✦ Text baked into image
                        </span>
                        <p className="text-xs text-zinc-400">The caption and text are rendered directly onto the story image</p>
                      </div>
                    ) : (
                      <CaptionTabs post={post} />
                    )}

                    {/* Hashtags */}
                    {post.hashtags && post.hashtags.length > 0 && (
                      <div>
                        <p className="text-xs font-bold text-zinc-400 uppercase tracking-wide mb-2">
                          Tags <span className="text-brand-600 normal-case font-medium">· {post.hashtags.length}</span>
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {post.hashtags.map(tag => (
                            <span key={tag} className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-brand-50 text-brand-700 border border-brand-100">
                              #{tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Schedule + error */}
                    {post.scheduledAt && (
                      <div className="flex items-center gap-2 text-xs text-zinc-500 bg-zinc-50 rounded-lg px-3 py-2 border border-zinc-100">
                        <span>📅</span>
                        <span className="font-medium">{smartDate(post.scheduledAt)} IST</span>
                      </div>
                    )}

                    {post.generationError && (
                      <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
                        <p className="text-xs font-semibold text-amber-800 mb-0.5">⚠️ Generation issue</p>
                        <p className="text-xs text-amber-700">{post.generationError}</p>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {lightboxSrc && (
          <Lightbox
            src={lightboxSrc}
            alt={post.imageAltText || productName}
            onClose={() => setLightboxSrc(null)}
          />
        )}
      </AnimatePresence>
    </>
  )
}
