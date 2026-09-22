import { useState } from 'react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { ConfirmDialog } from './ConfirmDialog'
import { PostViewModal } from './PostViewModal'
import type { Post } from '@/types/post.types'
import { Image, ZoomIn } from 'lucide-react'

interface CompactPostCardProps {
  post: Post
  onApprove?: (id: string) => void
  onSkip?: (id: string) => void
  isApproving?: boolean
  isSkipping?: boolean
}

const POST_TYPE_LABELS: Record<string, string> = {
  feed_image: 'Feed',
  carousel: 'Carousel',
  story: 'Story',
  reel: 'Reel',
  ad: 'Ad',
}

const PLATFORM_EMOJIS: Record<string, string> = {
  instagram: '📷',
  facebook: '👍',
  both: '📱',
}

export function CompactPostCard({
  post,
  onApprove,
  onSkip,
  isApproving = false,
  isSkipping = false,
}: CompactPostCardProps) {
  const thumbnail = post.mediaUrls?.[0] ?? post.imageUrl
  const postTypeLabel = post.postType ? (POST_TYPE_LABELS[post.postType] ?? post.postType) : null
  const isCollection = post.metadata?.collectionType === 'collection'
  const isTestimonial = post.metadata?.testimonialType === 'testimonial'
  const platformEmoji = PLATFORM_EMOJIS[post.platform] ?? '📱'
  const caption = post.captionInstagram ?? post.captionFacebook ?? post.caption ?? ''

  const [confirmAction, setConfirmAction] = useState<'approve' | 'skip' | null>(null)
  const [viewModalOpen, setViewModalOpen] = useState(false)

  return (
    <>
      <div className="shrink-0 w-72 bg-white border border-surface-200 rounded-xl overflow-hidden hover:shadow-md transition-shadow">
        {/* Image — clickable to view full post */}
        <button
          type="button"
          onClick={() => setViewModalOpen(true)}
          className="group relative h-32 w-full bg-surface-100 flex items-center justify-center overflow-hidden focus:outline-none"
        >
          {thumbnail ? (
            <img
              src={thumbnail}
              alt={caption}
              className="w-full h-full object-cover"
            />
          ) : (
            <Image className="h-6 w-6 text-surface-400" />
          )}
          {/* Hover zoom overlay */}
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/25 transition-colors flex items-center justify-center">
            <ZoomIn className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-lg" />
          </div>
          {/* Badges */}
          <div className="absolute top-2 right-2 flex gap-1">
            {postTypeLabel && (
              <Badge variant="default" size="sm">
                {postTypeLabel}
              </Badge>
            )}
            {isCollection && (
              <Badge variant="warning" size="sm">
                ✨ Collection
              </Badge>
            )}
            {isTestimonial && (
              <Badge variant="warning" size="sm">
                ⭐ Testimonial
              </Badge>
            )}
          </div>
        </button>

        {/* Content */}
        <div className="p-3 space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-lg">{platformEmoji}</span>
            <p className="text-xs font-medium text-zinc-500">
              {post.platform === 'instagram' ? 'Instagram' : 'Facebook'}
            </p>
          </div>

          {/* Caption preview */}
          {caption ? (
            <p className="text-xs text-zinc-700 line-clamp-2">
              {caption.length > 60 ? `${caption.slice(0, 60)}…` : caption}
            </p>
          ) : (
            <p className="text-xs text-zinc-400 italic">
              {postTypeLabel ? `${postTypeLabel} post` : 'Visual post'} · no caption
            </p>
          )}

          {/* Buttons */}
          <div className="flex gap-2 pt-1">
            {onSkip && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setConfirmAction('skip')}
                disabled={isSkipping || isApproving}
                className="flex-1 text-xs h-8"
              >
                Skip
              </Button>
            )}
            {onApprove && (
              <Button
                variant="success"
                size="sm"
                onClick={() => setConfirmAction('approve')}
                disabled={isApproving || isSkipping}
                loading={isApproving}
                className="flex-1 text-xs h-8"
              >
                Approve
              </Button>
            )}
          </div>
        </div>
      </div>

      <PostViewModal
        post={post}
        open={viewModalOpen}
        onClose={() => setViewModalOpen(false)}
      />

      {/* Confirm Dialogs */}
      <ConfirmDialog
        open={confirmAction === 'approve'}
        title="Approve Post?"
        description="This post will be ready to publish."
        confirmText="Approve"
        cancelText="Cancel"
        variant="success"
        onConfirm={() => {
          onApprove?.(post.id)
          setConfirmAction(null)
        }}
        onClose={() => setConfirmAction(null)}
        isConfirming={isApproving}
      />

      <ConfirmDialog
        open={confirmAction === 'skip'}
        title="Skip this post?"
        description="It won't be published."
        confirmText="Skip Post"
        cancelText="Cancel"
        variant="danger"
        onConfirm={() => {
          onSkip?.(post.id)
          setConfirmAction(null)
        }}
        onClose={() => setConfirmAction(null)}
        isConfirming={isSkipping}
      />
    </>
  )
}
