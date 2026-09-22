import { useEffect, useRef, useState } from 'react'
import { CheckCircle2, XCircle, Loader2, AlertTriangle } from 'lucide-react'
import { cn } from '@utils/cn'
import type { Post } from '@/types/post.types'

interface Step { id: string; label: string; detail: string }
type StepStatus = 'pending' | 'running' | 'done' | 'error' | 'cancelled'

export interface PublishProgressModalProps {
  post: Post
  onDone: () => void
  onError: (msg: string) => void
  publishFn: (signal: AbortSignal) => Promise<unknown>
}

function getSteps(post: Post): Step[] {
  const isReel     = post.postType === 'reel'
  const isCarousel = post.postType === 'carousel'
  const isStory    = post.postType === 'story'
  const platform   = post.platform as string
  const hasIG      = platform === 'instagram' || platform === 'both'
  const hasFB      = platform === 'facebook'  || platform === 'both'

  const steps: Step[] = [{ id: 'prepare', label: 'Preparing post', detail: 'Validating content and media URL' }]

  if (hasIG) {
    if (isReel) {
      steps.push({ id: 'ig_container', label: 'Creating Instagram Reel',    detail: 'Uploading video to Instagram container' })
      steps.push({ id: 'ig_process',   label: 'Processing video',           detail: 'Instagram is encoding your reel (this can take up to 2 min)' })
    } else if (isCarousel) {
      steps.push({ id: 'ig_slides',    label: 'Uploading carousel slides',  detail: 'Creating individual slide containers on Instagram' })
      steps.push({ id: 'ig_container', label: 'Building carousel',          detail: 'Assembling slides into a carousel post' })
    } else if (isStory) {
      steps.push({ id: 'ig_container', label: 'Creating Instagram Story',   detail: 'Uploading story media container' })
    } else {
      steps.push({ id: 'ig_container', label: 'Creating Instagram post',    detail: 'Uploading image to Instagram' })
    }
    steps.push({ id: 'ig_publish', label: 'Publishing to Instagram', detail: 'Making your post live on Instagram' })
  }

  if (hasFB) {
    if (isCarousel) {
      steps.push({ id: 'fb_slides',  label: 'Uploading to Facebook',     detail: 'Uploading carousel slides to Facebook' })
      steps.push({ id: 'fb_publish', label: 'Publishing to Facebook',    detail: 'Making your carousel live on Facebook' })
    } else if (isReel) {
      steps.push({ id: 'fb_publish', label: 'Publishing Facebook Reel',  detail: 'Uploading reel video to Facebook' })
    } else if (isStory) {
      steps.push({ id: 'fb_publish', label: 'Publishing Facebook Story', detail: 'Posting story to your Facebook page' })
    } else {
      steps.push({ id: 'fb_publish', label: 'Publishing to Facebook',    detail: 'Posting to your Facebook page' })
    }
  }

  steps.push({ id: 'done', label: 'All done!', detail: 'Your post is now live' })
  return steps
}

function stepDuration(id: string, post: Post): number {
  if (id === 'prepare')    return 600
  if (id === 'ig_process') return post.postType === 'reel' ? 30000 : 3000
  if (id === 'ig_slides')  return 2000
  if (id === 'fb_slides')  return 2000
  return 1800
}

function humaniseError(err: unknown): string {
  let msg = 'Publishing failed. Please try again.'
  if (err && typeof err === 'object') {
    const e = err as { response?: { data?: { error?: string; message?: string } }; message?: string; name?: string }
    if (e.name === 'AbortError' || e.message === 'canceled') return '__cancelled__'
    msg = e.response?.data?.error ?? e.response?.data?.message ?? e.message ?? msg
    if (msg.includes('permissions expired') || msg.includes('reconnect'))
      return 'Facebook permissions expired. Go to Settings → Disconnect → Reconnect Facebook.'
    if (msg.includes('reduce the amount of data'))
      return 'Post content is too long. Try shortening the caption or reducing hashtags.'
    if (msg.includes('Invalid image') || msg.includes('image_url'))
      return 'The image could not be fetched by Instagram. Make sure the image URL is publicly accessible.'
    if (msg.includes('video') && msg.includes('format'))
      return 'Unsupported video format. Instagram requires MP4 with H.264 codec.'
    if (msg.includes('timed out'))
      return 'Instagram is taking too long to process the video. It may still publish — check your Instagram profile.'
  }
  return msg
}

type ModalState = 'publishing' | 'cancelling' | 'cancelled' | 'done' | 'error'

export function PublishProgressModal({ post, onDone, onError, publishFn }: PublishProgressModalProps) {
  const steps   = getSteps(post)
  const platform = post.platform as string

  const [statuses, setStatuses] = useState<Record<string, StepStatus>>(
    Object.fromEntries(steps.map(s => [s.id, 'pending']))
  )
  const [modalState, setModalState]   = useState<ModalState>('publishing')
  const [errorMsg,   setErrorMsg]     = useState<string | null>(null)
  const [partialIG,  setPartialIG]    = useState(false) // IG may have published before cancel

  const abortRef     = useRef<AbortController | null>(null)
  const cancelledRef = useRef(false)

  useEffect(() => {
    const controller   = new AbortController()
    abortRef.current   = controller
    cancelledRef.current = false

    async function run() {
      const apiPromise = publishFn(controller.signal).catch((err: unknown) => { throw err })

      // Walk through visual steps while API runs in parallel
      const visualSteps = steps.slice(0, -1)
      for (const step of visualSteps) {
        if (cancelledRef.current) return
        setStatuses(prev => ({ ...prev, [step.id]: 'running' }))
        await new Promise<void>(resolve => {
          const t = setTimeout(resolve, stepDuration(step.id, post))
          // Store timer id on controller so we can fast-forward on cancel
          ;(controller as AbortController & { _timers?: ReturnType<typeof setTimeout>[] })._timers ??= []
          ;(controller as AbortController & { _timers?: ReturnType<typeof setTimeout>[] })._timers!.push(t)
        })
        if (cancelledRef.current) return
        setStatuses(prev => ({ ...prev, [step.id]: 'done' }))
      }

      // Await the actual API
      try {
        await apiPromise
        if (cancelledRef.current) return
        setStatuses(prev => ({ ...prev, done: 'done' }))
        setModalState('done')
        setTimeout(() => { if (!cancelledRef.current) onDone() }, 1400)
      } catch (err: unknown) {
        if (cancelledRef.current) return
        const msg = humaniseError(err)
        if (msg === '__cancelled__') return // already handled by cancel flow
        setStatuses(prev => {
          const u = { ...prev }
          for (const s of steps) { if (u[s.id] === 'running') { u[s.id] = 'error'; break } }
          return u
        })
        setErrorMsg(msg)
        setModalState('error')
      }
    }

    void run()
    return () => {
      cancelledRef.current = true
      controller.abort()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function handleCancel() {
    if (modalState !== 'publishing') return
    cancelledRef.current = true

    // Check if IG steps were already done — warn the user
    const igDone = ['ig_container', 'ig_slides', 'ig_publish'].some(id => statuses[id] === 'done')
    setPartialIG(igDone)

    // Abort the HTTP request
    abortRef.current?.abort()

    // Mark all running steps as cancelled
    setStatuses(prev => {
      const u = { ...prev }
      for (const s of steps) {
        if (u[s.id] === 'running' || u[s.id] === 'pending') u[s.id] = 'cancelled'
      }
      return u
    })

    setModalState('cancelling')
    // Brief red animation then settle on cancelled
    setTimeout(() => setModalState('cancelled'), 1200)
  }

  const currentRunning = steps.find(s => statuses[s.id] === 'running')
  const doneCount      = steps.filter(s => statuses[s.id] === 'done').length
  const progress       = Math.round((doneCount / steps.length) * 100)

  const isCancelling = modalState === 'cancelling'
  const isCancelled  = modalState === 'cancelled'
  const isDone       = modalState === 'done'
  const isError      = modalState === 'error'
  const isPublishing = modalState === 'publishing'

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      {/* Backdrop — not clickable while publishing */}
      <div
        className={cn('absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity', (isDone || isError || isCancelled) && 'cursor-pointer')}
        onClick={isDone || isError || isCancelled ? onDone : undefined}
      />

      {/* Modal */}
      <div className="relative w-full sm:max-w-md bg-white sm:rounded-2xl rounded-t-2xl shadow-2xl overflow-hidden">

        {/* Header */}
        <div className={cn(
          'px-5 py-4 border-b transition-all duration-300',
          isError     && 'bg-red-50 border-red-100',
          isDone      && 'bg-green-50 border-green-100',
          isCancelling && 'bg-red-50 border-red-100',
          isCancelled  && 'bg-zinc-50 border-zinc-100',
          isPublishing && 'bg-brand-50 border-brand-100',
        )}>
          <div className="flex items-center gap-3">
            {/* Status icon */}
            <div className="shrink-0">
              {isDone      && <CheckCircle2 className="w-5 h-5 text-green-500" />}
              {isError     && <XCircle className="w-5 h-5 text-red-500" />}
              {isCancelled && <XCircle className="w-5 h-5 text-zinc-400" />}
              {isCancelling && <Loader2 className="w-5 h-5 text-red-500 animate-spin" />}
              {isPublishing && <Loader2 className="w-5 h-5 text-brand-600 animate-spin" />}
            </div>

            <div className="flex-1 min-w-0">
              <p className={cn('text-sm font-semibold leading-tight',
                isDone       && 'text-green-800',
                isError      && 'text-red-800',
                isCancelling && 'text-red-700',
                isCancelled  && 'text-zinc-600',
                isPublishing && 'text-brand-900',
              )}>
                {isDone       && 'Published successfully!'}
                {isError      && 'Publishing failed'}
                {isCancelling && 'Cancelling…'}
                {isCancelled  && 'Cancelled — post not published'}
                {isPublishing && 'Publishing your post…'}
              </p>
              {isPublishing && currentRunning && (
                <p className="text-xs text-brand-700 mt-0.5 truncate">{currentRunning.detail}</p>
              )}
              {isCancelling && (
                <p className="text-xs text-red-500 mt-0.5">Stopping publish and cleaning up…</p>
              )}
            </div>
          </div>

          {/* Platform + type badges */}
          <div className="flex items-center gap-2 mt-3">
            {(platform === 'instagram' || platform === 'both') && (
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-white border border-pink-200 text-pink-700">IG</span>
            )}
            {(platform === 'facebook' || platform === 'both') && (
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-white border border-blue-200 text-blue-700">FB</span>
            )}
            <span className="text-[11px] text-zinc-400 capitalize">{post.postType?.replace('_', ' ') ?? 'post'}</span>
          </div>
        </div>

        {/* Steps list */}
        <div className="px-5 py-4 space-y-3">
          {steps.map(step => {
            const s = statuses[step.id]
            return (
              <div key={step.id} className="flex items-start gap-3">
                {/* Step icon */}
                <div className="shrink-0 mt-0.5 w-4 h-4 flex items-center justify-center">
                  {s === 'done'      && <CheckCircle2 className="w-4 h-4 text-green-500" />}
                  {s === 'running'   && <Loader2 className={cn('w-4 h-4 animate-spin', isCancelling ? 'text-red-400' : 'text-brand-600')} />}
                  {s === 'error'     && <XCircle className="w-4 h-4 text-red-500" />}
                  {s === 'cancelled' && <XCircle className="w-4 h-4 text-zinc-300" />}
                  {s === 'pending'   && <div className="w-2.5 h-2.5 rounded-full border-2 border-zinc-200 mx-auto" />}
                </div>

                {/* Step label */}
                <div className="flex-1 min-w-0">
                  <p className={cn('text-sm font-medium leading-tight',
                    s === 'done'      && 'text-zinc-500',
                    s === 'running'   && (isCancelling ? 'text-red-600' : 'text-zinc-900'),
                    s === 'error'     && 'text-red-600',
                    s === 'cancelled' && 'text-zinc-300 line-through',
                    s === 'pending'   && 'text-zinc-400',
                  )}>
                    {step.label}
                  </p>
                  {s === 'running' && !isCancelling && (
                    <p className="text-xs text-zinc-400 mt-0.5">{step.detail}</p>
                  )}
                </div>

                {s === 'done' && step.id !== 'done' && (
                  <span className="text-[10px] font-semibold text-green-600 shrink-0">Done</span>
                )}
                {s === 'cancelled' && (
                  <span className="text-[10px] font-medium text-zinc-300 shrink-0">Skipped</span>
                )}
              </div>
            )
          })}
        </div>

        {/* Progress bar */}
        {(isPublishing || isCancelling) && (
          <div className="mx-5 mb-1">
            <div className="h-1 bg-surface-100 rounded-full overflow-hidden">
              <div
                className={cn('h-full rounded-full transition-all duration-700', isCancelling ? 'bg-red-400' : 'bg-brand-500')}
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        {/* Error message */}
        {isError && errorMsg && (
          <div className="mx-5 mb-3 p-3 rounded-xl bg-red-50 border border-red-100">
            <p className="text-xs text-red-700 leading-relaxed">{errorMsg}</p>
          </div>
        )}

        {/* Partial publish warning */}
        {isCancelled && partialIG && (
          <div className="mx-5 mb-3 p-3 rounded-xl bg-amber-50 border border-amber-200 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-800 leading-relaxed">
              Instagram may have already published this post before cancellation. Please check your Instagram profile.
            </p>
          </div>
        )}

        {/* Footer */}
        <div className="px-5 pb-5 space-y-2">
          {/* Cancel button — only while publishing */}
          {isPublishing && (
            <button
              onClick={handleCancel}
              className="w-full py-2.5 text-sm font-medium text-zinc-500 border border-zinc-200 rounded-xl hover:border-red-300 hover:text-red-600 hover:bg-red-50 transition-all duration-200 cursor-pointer"
            >
              Cancel
            </button>
          )}

          {/* Cancelling — disabled red button */}
          {isCancelling && (
            <button disabled className="w-full py-2.5 text-sm font-medium text-red-400 border border-red-200 bg-red-50 rounded-xl cursor-not-allowed flex items-center justify-center gap-2">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              Cancelling…
            </button>
          )}

          {/* Cancelled — dismiss */}
          {isCancelled && (
            <button
              onClick={() => onError('Cancelled')}
              className="w-full py-2.5 text-sm font-medium text-zinc-600 bg-surface-100 rounded-xl hover:bg-surface-200 transition-colors cursor-pointer"
            >
              Dismiss
            </button>
          )}

          {/* Error — dismiss */}
          {isError && (
            <button
              onClick={() => onError(errorMsg ?? 'Publishing failed')}
              className="w-full py-2.5 text-sm font-medium text-zinc-700 bg-surface-100 rounded-xl hover:bg-surface-200 transition-colors cursor-pointer"
            >
              Dismiss
            </button>
          )}

          {/* Done */}
          {isDone && (
            <button
              onClick={onDone}
              className="w-full py-2.5 text-sm font-semibold text-white bg-green-600 rounded-xl hover:bg-green-700 transition-colors cursor-pointer"
            >
              Great!
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
