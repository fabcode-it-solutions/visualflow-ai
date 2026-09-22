import { useState, useMemo, useEffect } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { ConfirmDialog } from './ConfirmDialog'
import type { Post } from '@/types/post.types'
import { X } from 'lucide-react'

interface EditPostModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  post: Post
  onSave: (captionInstagram: string, captionFacebook: string, hashtags: string[]) => void
  onRegenerate: () => void
  isSaving?: boolean
  isRegenerating?: boolean
}

const MAX_CAPTION_LENGTH = 2200

export function EditPostModal({
  open,
  onOpenChange,
  post,
  onSave,
  onRegenerate,
  isSaving = false,
  isRegenerating = false,
}: EditPostModalProps) {
  const [activeTab, setActiveTab] = useState<'instagram' | 'facebook'>('instagram')
  const [captionInstagram, setCaptionInstagram] = useState(post.captionInstagram || '')
  const [captionFacebook, setCaptionFacebook] = useState(post.captionFacebook || '')
  const [hashtags, setHashtags] = useState<string[]>(post.hashtags || [])
  const [hashtagInput, setHashtagInput] = useState('')
  const [confirmAction, setConfirmAction] = useState<'regenerate' | null>(null)

  // Sync local state when post data updates (e.g. after regeneration refetches)
  useEffect(() => {
    setCaptionInstagram(post.captionInstagram || '')
    setCaptionFacebook(post.captionFacebook || '')
    setHashtags(post.hashtags || [])
  }, [post.captionInstagram, post.captionFacebook, post.hashtags])

  const currentCaption = activeTab === 'instagram' ? captionInstagram : captionFacebook
  const isNearLimit = currentCaption.length > 1800
  const isOverLimit = currentCaption.length > MAX_CAPTION_LENGTH

  const hasChanges = useMemo(() => {
    return (
      captionInstagram !== (post.captionInstagram || '') ||
      captionFacebook !== (post.captionFacebook || '') ||
      JSON.stringify(hashtags) !== JSON.stringify(post.hashtags || [])
    )
  }, [captionInstagram, captionFacebook, hashtags, post])

  const handleAddHashtag = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      const trimmed = hashtagInput.trim()
      if (trimmed && !hashtags.includes(trimmed) && hashtags.length < 30) {
        setHashtags([...hashtags, trimmed])
        setHashtagInput('')
      }
    }
  }

  const handleRemoveHashtag = (tag: string) => {
    setHashtags(hashtags.filter(h => h !== tag))
  }

  const handleSave = () => {
    onSave(captionInstagram, captionFacebook, hashtags)
  }

  const handleRegenerate = () => {
    onRegenerate()
    setConfirmAction(null)
  }

  const handleModalOpenChange = (isOpen: boolean) => {
    // Prevent closing while saving or regenerating
    if (!isOpen && (isSaving || isRegenerating)) {
      return
    }
    onOpenChange(isOpen)
  }

  return (
    <>
      <Modal
        open={open}
        onOpenChange={handleModalOpenChange}
        title="Edit Post Content"
        size="lg"
        footer={
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
            <Button
              variant="ghost"
              onClick={() => setConfirmAction('regenerate')}
              disabled={isSaving || isRegenerating}
            >
              Regenerate with AI
            </Button>
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end sm:gap-3">
              <Button
                variant="secondary"
                onClick={() => onOpenChange(false)}
                disabled={isSaving || isRegenerating}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleSave}
                disabled={!hasChanges || isSaving || isRegenerating}
                loading={isSaving}
              >
                Save Changes
              </Button>
            </div>
          </div>
        }
      >
        {/* Tabs */}
        <div className="flex gap-4 border-b border-surface-200 mb-6">
          <button
            onClick={() => setActiveTab('instagram')}
            className={`pb-3 px-1 border-b-2 transition-colors ${
              activeTab === 'instagram'
                ? 'border-brand-600 text-brand-600 font-medium'
                : 'border-transparent text-zinc-500 hover:text-zinc-700'
            }`}
          >
            Instagram
          </button>
          <button
            onClick={() => setActiveTab('facebook')}
            className={`pb-3 px-1 border-b-2 transition-colors ${
              activeTab === 'facebook'
                ? 'border-brand-600 text-brand-600 font-medium'
                : 'border-transparent text-zinc-500 hover:text-zinc-700'
            }`}
          >
            Facebook
          </button>
        </div>

        {/* Caption Textarea */}
        <div className="space-y-2 mb-6">
          <label className="block text-sm font-medium text-zinc-900">
            {activeTab === 'instagram' ? 'Instagram' : 'Facebook'} Caption
          </label>
          <textarea
            value={activeTab === 'instagram' ? captionInstagram : captionFacebook}
            onChange={(e) => {
              if (activeTab === 'instagram') {
                setCaptionInstagram(e.target.value.slice(0, MAX_CAPTION_LENGTH))
              } else {
                setCaptionFacebook(e.target.value.slice(0, MAX_CAPTION_LENGTH))
              }
            }}
            rows={6}
            className={`w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 resize-none ${
              isOverLimit
                ? 'border-red-300 focus:ring-red-400'
                : isNearLimit
                  ? 'border-amber-300 focus:ring-amber-400'
                  : 'border-surface-300 focus:ring-brand-400'
            }`}
            placeholder={`Write your ${activeTab === 'instagram' ? 'Instagram' : 'Facebook'} caption here...`}
          />
          <div className="flex items-center justify-between">
            <span className={`text-xs font-medium ${
              isOverLimit ? 'text-red-600' : isNearLimit ? 'text-amber-600' : 'text-zinc-500'
            }`}>
              {currentCaption.length} / {MAX_CAPTION_LENGTH}
            </span>
            {isOverLimit && <span className="text-xs text-red-600">Caption exceeds limit</span>}
          </div>
        </div>

        {/* Hashtag Editor */}
        <div className="space-y-3">
          <label className="block text-sm font-medium text-zinc-900">Hashtags</label>

          {/* Hashtag Chips */}
          <div className="flex flex-wrap gap-2 mb-3">
            {hashtags.map((tag) => (
              <Badge key={tag} variant="brand" size="sm" className="flex items-center gap-1.5">
                {tag}
                <button
                  onClick={() => handleRemoveHashtag(tag)}
                  className="hover:opacity-70 transition-opacity"
                  aria-label={`Remove ${tag}`}
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>

          {/* Hashtag Input */}
          <input
            type="text"
            value={hashtagInput}
            onChange={(e) => setHashtagInput(e.target.value)}
            onKeyDown={handleAddHashtag}
            disabled={hashtags.length >= 30}
            placeholder={hashtags.length >= 30 ? 'Maximum 30 hashtags reached' : 'Add hashtag and press Enter'}
            className="w-full px-3 py-2 text-sm border border-surface-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-400 disabled:bg-surface-50 disabled:text-zinc-400"
          />

          <p className="text-xs text-zinc-500">
            {hashtags.length} / 30 hashtags
          </p>
        </div>
      </Modal>

      {/* Regenerate Confirmation */}
      <ConfirmDialog
        open={confirmAction === 'regenerate'}
        title="Regenerate with AI?"
        description="This will replace your current caption with a newly generated one."
        confirmText="Regenerate"
        cancelText="Cancel"
        variant="primary"
        onConfirm={handleRegenerate}
        onClose={() => setConfirmAction(null)}
        isConfirming={isRegenerating}
      />
    </>
  )
}
