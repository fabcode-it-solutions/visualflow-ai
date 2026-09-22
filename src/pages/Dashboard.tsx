import { useEffect, useState } from 'react'
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { DashboardSkeleton } from '@/components/skeletons/DashboardSkeleton'
import { ErrorState } from '@/components/ui/ErrorState'
import { Skeleton } from '@/components/ui/Skeleton'
import { PostCard } from '@/components/shared/PostCard'
import { CollectionPostModal } from '@/components/shared/CollectionPostModal'
import { CreatePostModal } from '@/components/shared/CreatePostModal'
import { CreatePostSheet } from '@/components/shared/CreatePostSheet'
import { NotificationBell } from '@/components/shared/NotificationBell'
import { PublishProgressModal } from '@/components/shared/PublishProgressModal'
import type { Post } from '@/types/post.types'
import { postService } from '@/services/postService'
import { shopService } from '@/services/shopService'
import { analyticsService } from '@/services/analyticsService'
import { productService } from '@/services/productService'
import { useToast } from '@/hooks/useToast'
import { toIST } from '@utils/dateUtils'
import { formatINR } from '@utils/indianFormat'
import { cn } from '@utils/cn'
import {
  ArrowRight,
  CalendarDays, Clock, Package, CheckCircle,
  Sparkles,
} from 'lucide-react'
import { TestimonialPostModal } from '@/components/shared/TestimonialPostModal'
import api from '@/services/api'
import type { ActivityLogEntry } from '@/types/analytics.types'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isToday(dateStr: string | null | undefined): boolean {
  if (!dateStr) return false
  const postIST  = toIST(new Date(dateStr))
  const todayIST = toIST(new Date())
  return (
    postIST.getFullYear() === todayIST.getFullYear() &&
    postIST.getMonth()    === todayIST.getMonth()    &&
    postIST.getDate()     === todayIST.getDate()
  )
}

function timeAgo(iso: string): string {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

function formatContentGenTime(t: string): string {
  const [h, m] = t.split(':').map(Number)
  const ampm = (h ?? 0) >= 12 ? 'PM' : 'AM'
  const hour = (h ?? 0) % 12 || 12
  return `${hour}:${String(m ?? 0).padStart(2, '0')} ${ampm}`
}

function activityDotColor(entry: ActivityLogEntry): string {
  const a = (entry.action ?? '').toLowerCase()
  if (a.includes('publish') || a.includes('sync'))   return 'bg-emerald-500'
  if (a.includes('generat') || a.includes('approv')) return 'bg-blue-500'
  if (a.includes('held')    || a.includes('warn'))   return 'bg-amber-500'
  if (a.includes('fail')    || a.includes('error'))  return 'bg-red-500'
  return 'bg-zinc-400'
}

// ─── Quick Actions config ─────────────────────────────────────────────────────


// ─── Dashboard ────────────────────────────────────────────────────────────────

export default function Dashboard() {
  useEffect(() => {
    document.title = 'Dashboard — VisualFlow AI'
  }, [])

  const navigate     = useNavigate()
  const queryClient  = useQueryClient()
  const { showToast } = useToast()

  const [createSheetOpen, setCreateSheetOpen] = useState(false)
  const [collectionModalOpen, setCollectionModalOpen] = useState(false)
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [testimonialModalOpen, setTestimonialModalOpen] = useState(false)
  const [loadingPostActions, setLoadingPostActions] = useState<Record<string, Record<string, boolean>>>({})
  const [publishingPost, setPublishingPost] = useState<Post | null>(null)

  const setActionLoading = (id: string, action: string, loading: boolean) =>
    setLoadingPostActions(prev => ({ ...prev, [id]: { ...(prev[id] ?? {}), [action]: loading } }))
  const isActionLoading = (id: string, action: string): boolean => loadingPostActions[id]?.[action] ?? false

  // ── Queries ──────────────────────────────────────────────────────────────

  const {
    data: posts,
    isLoading: postsLoading,
    isError: postsError,
    error: postsErr,
  } = useQuery<Post[]>({
    queryKey: ['posts', 'dashboard'],
    queryFn:  postService.getDashboardPosts,
  })

  const { data: onboardingData } = useQuery({
    queryKey: ['onboarding-data'],
    queryFn:  shopService.getOnboardingData,
    staleTime: 5 * 60 * 1000,
  })

  const { data: yesterday, isLoading: yesterdayLoading } = useQuery({
    queryKey: ['analytics', 'yesterday'],
    queryFn:  () => analyticsService.getYesterday().then(r => r.data),
    staleTime: 5 * 60 * 1000,
    retry: false,
  })

  const { data: activityData } = useQuery({
    queryKey: ['activity', 'dashboard'],
    queryFn:  async () => {
      const res = await api.get<{ data: ActivityLogEntry[] }>(
        '/activity-logs',
        { params: { limit: 6 } },
      )
      return res.data.data ?? []
    },
    staleTime: 2 * 60 * 1000,
    retry: false,
  })

  const { data: productsPage } = useQuery({
    queryKey: ['products', 'dashboard'],
    queryFn:  () => productService.getAll({ limit: 10 }),
    staleTime: 5 * 60 * 1000,
  })

  const { data: publishedPage } = useQuery({
    queryKey: ['posts', 'published-count'],
    queryFn:  () => postService.getAll({ status: 'published', page: 1 }),
    staleTime: 5 * 60 * 1000,
  })

  // ── Mutations ─────────────────────────────────────────────────────────────

  const INDIA_TIMEZONE = 'Asia/Kolkata'

  const { mutate: skip } = useMutation({
    mutationFn: (id: string) => postService.skip(id),
    onMutate:   (id) => setActionLoading(id, 'skip', true),
    onSuccess:  () => {
      showToast('Post moved to Drafts', 'success')
      void queryClient.invalidateQueries({ queryKey: ['posts'] })
    },
    onError:    () => showToast('Failed to skip post', 'error'),
    onSettled:  (_, __, id) => setActionLoading(id, 'skip', false),
  })

  const { mutate: save } = useMutation({
    mutationFn: ({ id, captionInstagram, captionFacebook, hashtags }: {
      id: string
      captionInstagram: string
      captionFacebook: string
      hashtags: string[]
    }) => postService.update(id, { captionInstagram, captionFacebook, hashtags }),
    onMutate:  ({ id }) => setActionLoading(id, 'save', true),
    onSuccess: () => {
      showToast('Post saved', 'success')
      void queryClient.invalidateQueries({ queryKey: ['posts'] })
    },
    onError:   () => showToast('Failed to save post', 'error'),
    onSettled: (_, __, { id }) => setActionLoading(id, 'save', false),
  })

  const { mutate: regenerate } = useMutation({
    mutationFn: (id: string) => postService.regenerate(id),
    onMutate:   (id) => setActionLoading(id, 'regenerate', true),
    onSuccess:  () => {
      showToast('Regenerating post…', 'success')
      void queryClient.invalidateQueries({ queryKey: ['posts'] })
    },
    onError:    () => showToast('Failed to regenerate', 'error'),
    onSettled:  (_, __, id) => setActionLoading(id, 'regenerate', false),
  })

  function approveAndPublish(id: string) {
    const post = (posts ?? []).find(p => p.id === id)
    if (post) setPublishingPost(post)
  }

  const { mutateAsync: approveAndSchedule } = useMutation({
    mutationFn: async ({ id, scheduledAt }: { id: string; scheduledAt: string }) => {
      await postService.approve(id)
      return postService.schedulePost(id, { scheduledAt })
    },
    onMutate:  ({ id }) => setActionLoading(id, 'schedule', true),
    onSuccess: (res) => {
      void queryClient.invalidateQueries({ queryKey: ['posts'] })
      const post = res.data as import('@/types/post.types').Post & { scheduledAt?: string }
      const formatted = post.scheduledAt
        ? new Date(post.scheduledAt).toLocaleString('en-IN', { timeZone: INDIA_TIMEZONE, dateStyle: 'medium', timeStyle: 'short' })
        : ''
      showToast(`Post scheduled for ${formatted} 📅`, 'success')
    },
    onError:   () => showToast('Failed to schedule post', 'error'),
    onSettled: (_, __, { id }) => setActionLoading(id, 'schedule', false),
  })


  // ── Loading / error states ────────────────────────────────────────────────

  if (postsLoading) return <DashboardSkeleton />

  if (postsError) return (
    <div className="p-6">
      <ErrorState
        title="Could not load dashboard"
        message={postsErr instanceof Error ? postsErr.message : 'Something went wrong'}
        onRetry={() => queryClient.invalidateQueries({ queryKey: ['posts', 'dashboard'] })}
      />
    </div>
  )

  // ── Derived data ──────────────────────────────────────────────────────────

  const postList   = posts ?? []
  const allPending = postList.filter(p => p.status === 'pending_approval')
  const publishedTotal = publishedPage?.data.meta.total ?? 0

  const autoApprove    = onboardingData?.preferences?.autoApprove ?? false
  const contentGenTime = onboardingData?.preferences?.contentGenerationTime ?? '02:00'

  const displayBrandName = onboardingData?.brand?.brandName?.trim() || null

  const displayWebsite = (() => {
    const url = onboardingData?.brand?.websiteUrl
    if (!url) return null
    return url.trim().replace(/^https?:\/\//i, '').replace(/^www\./i, '').replace(/\/+$/, '') || null
  })()
  const activityEntries = (activityData ?? []).slice(0, 6)
  const products        = productsPage?.data.data ?? []
  const productTotal    = productsPage?.data.meta.total ?? products.length

  const productNames: Record<string, string> = {}
  const productImages: Record<string, string | undefined> = {}
  products.forEach(p => {
    productNames[p.id] = p.title
    productImages[p.id] = p.images?.[0] ?? undefined
  })

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <>
      {/* ── Top Bar ─────────────────────────────────────────────────────── */}
      <div className="sticky top-0 z-10 hidden lg:flex h-16 items-center justify-between px-8 bg-white/80 backdrop-blur-md border-b border-zinc-100">
        <div className="flex items-center gap-2.5">
          <p className="font-display font-bold text-zinc-900 text-sm">Dashboard</p>
          {displayWebsite && (
            <span className="text-[10px] font-medium text-zinc-400 bg-zinc-100 rounded-full px-2 py-0.5">{displayWebsite}</span>
          )}
        </div>
        <div className="flex items-center gap-3">
          {displayBrandName && (
            <div className="flex items-center gap-2 bg-linear-to-r from-violet-50 to-purple-50 border border-violet-100 rounded-full px-3.5 py-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-violet-500 shrink-0" />
              <span className="text-xs font-semibold text-violet-700 truncate max-w-40 tracking-wide">{displayBrandName}</span>
            </div>
          )}
          <NotificationBell />
          <button
            onClick={() => setCreateSheetOpen(true)}
            className="flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-sm hover:shadow-md active:scale-95 transition-all cursor-pointer"
          >
            <Sparkles className="h-3.5 w-3.5" />
            Create Post
          </button>
        </div>
      </div>

      {/* ── Page content ────────────────────────────────────────────────── */}
      <div className="bg-white min-h-full px-6 md:px-8 py-8 space-y-10">

        {/* ── 1. Overview ──────────────────────────────────────────────── */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display font-bold text-xl text-zinc-900">Overview</h2>
            <span className="text-xs text-zinc-400">Today</span>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="bg-white rounded-2xl border border-surface-100 shadow-card p-4">
              <div className="w-9 h-9 rounded-xl bg-brand-50 flex items-center justify-center mb-3">
                <CalendarDays className="h-4.5 w-4.5 text-brand-600" />
              </div>
              <p className="font-display font-bold text-2xl text-zinc-900 leading-none">{postList.filter(p => isToday(p.createdAt)).length}</p>
              <p className="text-xs text-zinc-500 mt-1.5 font-medium">Posts Today</p>
            </div>
            <button
              onClick={() => navigate('/approval')}
              className={cn(
                'bg-white rounded-2xl border shadow-card p-4 text-left transition-all duration-150 cursor-pointer hover:shadow-elevated active:scale-[0.98]',
                allPending.length > 0 ? 'border-l-4 border-l-amber-400 border-amber-200' : 'border-surface-100',
              )}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center">
                  <Clock className="h-4.5 w-4.5 text-amber-600" />
                </div>
                {allPending.length > 0 && (
                  <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-amber-500 text-white text-[10px] font-bold">{allPending.length}</span>
                )}
              </div>
              <p className="font-display font-bold text-2xl text-zinc-900 leading-none">{allPending.length}</p>
              <p className="text-xs text-zinc-500 mt-1.5 font-medium">Pending Approval</p>
              {allPending.length > 0 && (
                <p className="text-[10px] text-amber-600 font-semibold mt-1.5 flex items-center gap-0.5">Review now <ArrowRight className="h-2.5 w-2.5" /></p>
              )}
            </button>
            <div className="bg-white rounded-2xl border border-surface-100 shadow-card p-4">
              <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center mb-3">
                <Package className="h-4.5 w-4.5 text-emerald-600" />
              </div>
              <p className="font-display font-bold text-2xl text-zinc-900 leading-none">{productTotal}</p>
              <p className="text-xs text-zinc-500 mt-1.5 font-medium">Products Synced</p>
            </div>
            <div className="bg-white rounded-2xl border border-surface-100 shadow-card p-4">
              <div className="w-9 h-9 rounded-xl bg-violet-50 flex items-center justify-center mb-3">
                <CheckCircle className="h-4.5 w-4.5 text-violet-600" />
              </div>
              <p className="font-display font-bold text-2xl text-zinc-900 leading-none">{publishedTotal}</p>
              <p className="text-xs text-zinc-500 mt-1.5 font-medium">Posts Published</p>
            </div>
          </div>
        </div>

        {/* ── 2. Pending Approval ──────────────────────────────────────── */}
        <div>
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2.5">
              <h2 className="font-display font-bold text-xl text-zinc-900">Pending Approval</h2>
              {allPending.length > 0 && (
                <span className="inline-flex items-center justify-center min-w-5 h-5 px-1.5 rounded-full bg-amber-500 text-white text-[10px] font-bold">{allPending.length}</span>
              )}
            </div>
            {allPending.length > 4 && (
              <button onClick={() => navigate('/approval')} className="text-sm font-medium text-brand-600 hover:text-brand-700 flex items-center gap-1 transition-colors cursor-pointer">
                View All <ArrowRight className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          {autoApprove && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex items-center justify-between gap-3 mb-3">
              <p className="text-sm text-emerald-700">Auto-approve is ON — posts publish automatically</p>
              <button onClick={() => navigate('/calendar')} className="text-xs font-medium text-emerald-700 hover:text-emerald-900 flex items-center gap-1 shrink-0 cursor-pointer">
                View Calendar <ArrowRight className="h-3 w-3" />
              </button>
            </div>
          )}
          {allPending.length > 0 ? (
            <>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {allPending.slice(0, 4).map(post => (
                  <PostCard key={post.id} post={post}
                    productName={post.productId ? (productNames[post.productId] ?? 'Product') : 'Product'}
                    productImageUrl={post.productId ? productImages[post.productId] : undefined}
                    onProductClick={post.productId ? () => navigate(`/products/${post.productId}`) : undefined}
                    onSkip={skip}
                    onPublish={(id) => approveAndPublish(id)}
                    onSchedule={async (id, scheduledAt) => { await approveAndSchedule({ id, scheduledAt }) }}
                    onSave={(id, ig, fb, tags) => save({ id, captionInstagram: ig, captionFacebook: fb, hashtags: tags })}
                    onRegenerate={regenerate}
                    directActions
                    isSkipping={isActionLoading(post.id, 'skip')}
                    isPublishing={isActionLoading(post.id, 'publish') || isActionLoading(post.id, 'schedule')}
                    isSaving={isActionLoading(post.id, 'save')}
                    isRegenerating={isActionLoading(post.id, 'regenerate')}
                    storeTimezone={INDIA_TIMEZONE} />
                ))}
              </div>
              {allPending.length > 4 && (
                <button onClick={() => navigate('/approval')} className="mt-3 w-full py-3 rounded-2xl border border-dashed border-brand-200 bg-brand-50/50 text-sm font-semibold text-brand-600 hover:bg-brand-50 hover:border-brand-300 transition-all cursor-pointer">
                  View All {allPending.length} Pending Posts →
                </button>
              )}
            </>
          ) : (
            <div className="bg-white rounded-2xl border border-surface-100 shadow-card p-8 text-center">
              {autoApprove
                ? <p className="font-semibold text-zinc-700">All content approved and scheduled</p>
                : <><p className="font-semibold text-zinc-700">No posts pending approval</p><p className="text-sm text-zinc-400 mt-1">AI generates content daily at {formatContentGenTime(contentGenTime)} IST</p></>}
            </div>
          )}
        </div>

        {/* ── 3. Yesterday's Results ───────────────────────────────────── */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display font-bold text-xl text-zinc-900">Yesterday's Results</h2>
            <span className="text-xs text-zinc-400">Last 24h</span>
          </div>
          {yesterdayLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-20 rounded-2xl" />)}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: 'Reach',      value: yesterday ? yesterday.reach.toLocaleString('en-IN')      : '—', color: 'text-brand-600',   icon: '👁️' },
                { label: 'Engagement', value: yesterday ? yesterday.engagement.toLocaleString('en-IN') : '—', color: 'text-pink-600',    icon: '❤️' },
                { label: 'Clicks',     value: yesterday ? yesterday.clicks.toLocaleString('en-IN')     : '—', color: 'text-amber-600',   icon: '🖱️' },
                { label: 'Revenue',    value: yesterday ? formatINR(yesterday.revenue)                 : '—', color: 'text-emerald-600', icon: '💰' },
              ].map(stat => (
                <div key={stat.label} className="bg-white rounded-2xl border border-surface-100 shadow-card p-4">
                  <span className="text-lg leading-none">{stat.icon}</span>
                  <p className={cn('font-display font-bold text-xl mt-2 leading-none', yesterday ? stat.color : 'text-zinc-300')}>{stat.value}</p>
                  <p className="text-xs text-zinc-500 mt-1.5 font-medium">{stat.label}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── 4. Recent Activity ───────────────────────────────────────── */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display font-bold text-xl text-zinc-900">Recent Activity</h2>
            <button onClick={() => navigate('/activity')} className="flex items-center gap-1 text-xs font-semibold text-brand-600 hover:text-brand-700 transition-colors cursor-pointer">
              View All <ArrowRight className="h-3 w-3" />
            </button>
          </div>
          {activityEntries.length > 0 ? (
            <div className="bg-white rounded-2xl border border-surface-100 shadow-card divide-y divide-zinc-50 overflow-hidden">
              {activityEntries.map((entry, i) => (
                <div key={entry.id} className={cn('flex items-center gap-3 px-4 py-3', i === 0 && 'pt-3.5')}>
                  <div className={cn('w-2 h-2 rounded-full shrink-0', activityDotColor(entry))} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-zinc-800 font-medium line-clamp-1">{entry.description || entry.action}</p>
                    <p className="text-[11px] text-zinc-400 mt-0.5 capitalize">{entry.entityType?.replace(/_/g, ' ')}</p>
                  </div>
                  <span className="text-[11px] text-zinc-400 whitespace-nowrap shrink-0 tabular-nums">{timeAgo(entry.createdAt)}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-surface-100 shadow-card p-8 text-center">
              <p className="text-sm text-zinc-400">Activity will appear here once you start publishing</p>
            </div>
          )}
        </div>

      </div>

      {collectionModalOpen && (
        <CollectionPostModal
          products={products}
          onClose={() => setCollectionModalOpen(false)}
        />
      )}

      {testimonialModalOpen && (
        <TestimonialPostModal
          products={products}
          onClose={() => setTestimonialModalOpen(false)}
        />
      )}

      <CreatePostModal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
      />

      <CreatePostSheet
        open={createSheetOpen}
        onClose={() => setCreateSheetOpen(false)}
        onSinglePost={() => setCreateModalOpen(true)}
        onCollection={() => setCollectionModalOpen(true)}
        onTestimonial={() => setTestimonialModalOpen(true)}
        collectionDisabled={products.filter(p => p.price && p.inventoryQuantity > 0).length < 3}
        testimonialDisabled={products.length === 0}
      />

      {/* Mobile floating Create button */}
      <button
        onClick={() => setCreateSheetOpen(true)}
        className="lg:hidden fixed bottom-6 right-4 z-30 flex items-center gap-2 bg-brand-600 text-white text-sm font-bold px-5 py-3.5 rounded-2xl shadow-elevated hover:bg-brand-700 active:scale-95 transition-all cursor-pointer"
      >
        <Sparkles className="h-4 w-4" />
        Create Post
      </button>

      {publishingPost && (
        <PublishProgressModal
          post={publishingPost}
          publishFn={async (signal) => {
            await postService.approve(publishingPost.id)
            return postService.publish(publishingPost.id, signal)
          }}
          onDone={() => {
            setPublishingPost(null)
            showToast('Post published successfully!', 'success')
            void queryClient.invalidateQueries({ queryKey: ['posts'] })
          }}
          onError={(msg) => {
            setPublishingPost(null)
            showToast(msg, 'error')
          }}
        />
      )}

    </>
  )
}
