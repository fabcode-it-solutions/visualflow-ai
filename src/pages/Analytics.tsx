import { useEffect, useState } from 'react'
import { cn } from '@utils/cn'
import { useSearchParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { PageWrapper } from '@/components/layout/PageWrapper'
import { AnalyticsSkeleton } from '@/components/skeletons/AnalyticsSkeleton'
import { ErrorState } from '@/components/ui/ErrorState'
import { StatCard } from '@/components/shared/StatCard'
import { Card } from '@/components/ui/Card'
import { PlatformBadge } from '@/components/shared/PlatformBadge'
import { analyticsService } from '@/services/analyticsService'
import { formatINR } from '@utils/indianFormat'
import { formatIST } from '@utils/dateUtils'
import {
  LineChart, Line, BarChart, Bar,
  XAxis, YAxis, Tooltip, ResponsiveContainer,
} from 'recharts'
import {
  Eye, BarChart2, RefreshCw, Heart, MessageCircle,
  Share2, Bookmark, Image, MousePointer, TrendingUp,
  ChevronLeft, ChevronRight, Download, ShoppingBag,
} from 'lucide-react'
import {
  format as dfFormat,
  startOfWeek, endOfWeek, addWeeks,
} from 'date-fns'
import { useToast } from '@/hooks/useToast'
import { postService } from '@/services/postService'
import { PostViewModal } from '@/components/shared/PostViewModal'
import type { Post } from '@/types/post.types'
import type { SocialPlatform } from '@/types/shop.types'
import type { PostWithEngagement, AnalyticsOverview, DailyPoint, ProductAnalyticsRow, ContentTypeRow, TimeOfDayData, WeeklyReport, MonthlyReport } from '@/services/analyticsService'

// ─── Types ───────────────────────────────────────────────────────────────────

type TabId = 'overview' | 'by-content' | 'by-product' | 'by-time' | 'reports'
type RangeValue = '7d' | '30d' | '90d' | 'month'

const TABS: { id: TabId; label: string }[] = [
  { id: 'overview',    label: 'Overview'    },
  { id: 'by-content',  label: 'By Content'  },
  { id: 'by-product',  label: 'By Product'  },
  { id: 'by-time',     label: 'By Time'     },
  { id: 'reports',     label: 'Reports'     },
]

const RANGES: { label: string; value: RangeValue }[] = [
  { label: '7 days',     value: '7d'    },
  { label: '30 days',    value: '30d'   },
  { label: '90 days',    value: '90d'   },
  { label: 'This Month', value: 'month' },
]

// ─── Helpers ─────────────────────────────────────────────────────────────────

function toApiRange(r: RangeValue): '7d' | '30d' | '90d' {
  return r === 'month' ? '30d' : r
}

function shortDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })
}

function minsAgo(iso: string) {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  return hrs < 24 ? `${hrs}h ago` : `${Math.floor(hrs / 24)}d ago`
}

function postCaption(p: PostWithEngagement) {
  return p.captionInstagram ?? p.captionFacebook ?? p.caption ?? ''
}

// ─── Overview Tab ────────────────────────────────────────────────────────────

function OverviewTab({
  overview,
  series,
}: {
  overview: AnalyticsOverview
  series: DailyPoint[]
}) {
  const yesterdayKey = (() => {
    const d = new Date()
    d.setDate(d.getDate() - 1)
    return d.toISOString().slice(0, 10)
  })()
  const yesterday = series.find(p => p.date === yesterdayKey)
  const chartData = series.map(p => ({ ...p, date: shortDate(p.date) }))
  const topPost = overview.topPosts[0] ?? null

  return (
    <div className="space-y-5">
      {/* Yesterday snapshot chips */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-zinc-400 font-medium shrink-0">Yesterday:</span>
        {([
          { icon: '📡', label: 'Reach',      value: (yesterday?.reach      ?? 0).toLocaleString('en-IN') },
          { icon: '👆', label: 'Clicks',     value: (yesterday?.clicks     ?? 0).toLocaleString('en-IN') },
          { icon: '❤️', label: 'Engagement', value: (yesterday?.engagement ?? 0).toLocaleString('en-IN') },
          { icon: '💰', label: 'Revenue',    value: formatINR(0) },
        ] as const).map(chip => (
          <div
            key={chip.label}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-surface-50 border border-surface-200 rounded-full text-xs"
          >
            <span>{chip.icon}</span>
            <span className="text-zinc-500">{chip.label}:</span>
            <span className="font-semibold text-zinc-800">{chip.value}</span>
          </div>
        ))}
      </div>

      {/* Main stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Total Reach"       value={overview.totalReach.toLocaleString('en-IN')}       icon={<Eye           className="h-4 w-4" />} />
        <StatCard label="Total Engagement"  value={overview.totalEngagement.toLocaleString('en-IN')}  icon={<BarChart2     className="h-4 w-4" />} />
        <StatCard label="Total Clicks"      value={overview.totalClicks.toLocaleString('en-IN')}      icon={<MousePointer  className="h-4 w-4" />} />
        <StatCard label="ROAS"              value={overview.roas > 0 ? `${overview.roas.toFixed(1)}x` : '—'} icon={<TrendingUp className="h-4 w-4" />} />
      </div>

      {/* Engagement breakdown */}
      {overview.totalEngagement > 0 && (
        <Card padding="md">
          <h3 className="text-sm font-semibold text-zinc-800 mb-3">Engagement Breakdown</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {([
              { icon: <Heart        className="h-4 w-4 text-rose-500  shrink-0" />, label: 'Likes',    value: overview.totalLikes    },
              { icon: <MessageCircle className="h-4 w-4 text-blue-500  shrink-0" />, label: 'Comments', value: overview.totalComments },
              { icon: <Share2       className="h-4 w-4 text-green-500 shrink-0" />, label: 'Shares',   value: overview.totalShares   },
              { icon: <Bookmark     className="h-4 w-4 text-amber-500 shrink-0" />, label: 'Saves',    value: overview.totalSaves    },
            ] as const).map(item => (
              <div key={item.label} className="flex items-center gap-2">
                {item.icon}
                <div>
                  <p className="text-xs text-zinc-500">{item.label}</p>
                  <p className="text-sm font-semibold text-zinc-800">{item.value.toLocaleString('en-IN')}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Reach over time chart */}
      <Card padding="md">
        <h3 className="text-sm font-semibold text-zinc-800 mb-4">Reach Over Time</h3>
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
              <Tooltip />
              <Line type="monotone" dataKey="reach"      stroke="#7c3aed" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="engagement" stroke="#f59e0b" strokeWidth={2} dot={false} strokeDasharray="4 2" />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="flex items-center gap-4 mt-2">
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-0.5 bg-brand-600 rounded" />
            <span className="text-xs text-zinc-500">Reach</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-4 border-t-2 border-dashed border-amber-500" />
            <span className="text-xs text-zinc-500">Engagement</span>
          </div>
        </div>
      </Card>

      {/* Best post */}
      <Card padding="md">
        <h3 className="text-sm font-semibold text-zinc-800 mb-3">🏆 Best Post This Period</h3>
        {topPost ? (
          <div className="flex items-start gap-3">
            <div className="h-16 w-16 rounded-lg bg-surface-100 overflow-hidden shrink-0 flex items-center justify-center">
              {(topPost.mediaUrls?.[0] ?? topPost.imageUrl) ? (
                <img
                  src={(topPost.mediaUrls?.[0] ?? topPost.imageUrl) as string}
                  alt=""
                  className="h-full w-full object-cover"
                />
              ) : (
                <Image className="h-5 w-5 text-surface-400" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-zinc-700 line-clamp-2">{postCaption(topPost) || '(no caption)'}</p>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <PlatformBadge platform={topPost.platform as SocialPlatform} />
                {topPost.publishedAt && (
                  <span className="text-xs text-zinc-400">{formatIST(topPost.publishedAt)}</span>
                )}
              </div>
              <div className="flex items-center gap-3 mt-1.5 text-xs text-zinc-500">
                <span className="flex items-center gap-0.5"><Eye              className="h-3 w-3"               />{topPost.analytics.reach.toLocaleString('en-IN')}</span>
                <span className="flex items-center gap-0.5"><Heart            className="h-3 w-3 text-rose-400"  />{topPost.analytics.likes}</span>
                <span className="flex items-center gap-0.5"><MessageCircle    className="h-3 w-3 text-blue-400"  />{topPost.analytics.comments}</span>
                <span className="flex items-center gap-0.5"><Share2           className="h-3 w-3 text-green-400" />{topPost.analytics.shares}</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-sm text-zinc-400 mb-1">No analytics data yet</p>
            <p className="text-xs text-zinc-400">Publish posts and tap Refresh to fetch insights from Instagram &amp; Facebook.</p>
          </div>
        )}
      </Card>

      {/* Ad revenue — only when present */}
      {overview.totalRevenue > 0 && (
        <Card padding="md">
          <h3 className="text-sm font-semibold text-zinc-800 mb-3">Ad Revenue</h3>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-xs text-zinc-500">Revenue Attributed</p>
              <p className="text-lg font-semibold text-zinc-800">{formatINR(overview.totalRevenue)}</p>
            </div>
            <div>
              <p className="text-xs text-zinc-500">ROAS</p>
              <p className="text-lg font-semibold text-zinc-800">
                {overview.roas > 0 ? `${overview.roas.toFixed(1)}x` : '—'}
              </p>
            </div>
          </div>
        </Card>
      )}
    </div>
  )
}

// ─── By Content Tab ───────────────────────────────────────────────────────────

const POST_TYPE_LABEL: Record<string, string> = {
  feed_image: 'Feed Image',
  carousel:   'Carousel',
  story:      'Story',
  reel:       'Reel',
  ad:         'Ad',
}

interface ByContentTabProps { range: string }

function ByContentTab({ range }: ByContentTabProps) {
  const { data, isLoading } = useQuery<ContentTypeRow[]>({
    queryKey: ['analytics', 'by-content', range],
    queryFn:  () => analyticsService.getByContentType(range).then(r => r.data),
  })

  const best = data?.reduce<ContentTypeRow | null>((b, r) => (!b || r.avgEngagement > b.avgEngagement) ? r : b, null)

  return (
    <div className="space-y-4">
      <Card padding="md">
        <h3 className="text-sm font-semibold text-zinc-800 mb-4">Performance by Content Type</h3>

        {/* Bar chart */}
        {(isLoading || !data || data.length === 0) ? (
          <div className="h-44 flex items-center justify-center bg-surface-50 rounded-lg mb-5">
            {isLoading ? (
              <div className="w-full h-full flex items-end gap-3 px-6 pb-4 pt-6">
                {[60,80,45,70,55].map((h, i) => (
                  <div key={i} className="flex-1 bg-surface-100 rounded-t animate-pulse" style={{ height: `${h}%` }} />
                ))}
              </div>
            ) : (
              <div className="text-center">
                <BarChart2 className="h-8 w-8 text-zinc-200 mx-auto mb-2" />
                <p className="text-xs text-zinc-400">No data yet — publish posts and sync analytics</p>
              </div>
            )}
          </div>
        ) : (
          <div className="h-44 mb-5">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} margin={{ top: 0, right: 0, bottom: 0, left: -20 }}>
                <XAxis dataKey="postType" tick={{ fontSize: 10 }} tickFormatter={t => POST_TYPE_LABEL[t] ?? t} />
                <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                <Tooltip
                  formatter={(v, name) => [v, name === 'avgReach' ? 'Avg Reach' : 'Avg Engagement']}
                  labelFormatter={t => POST_TYPE_LABEL[t as string] ?? t}
                />
                <Bar dataKey="avgReach"       name="avgReach"       fill="#a78bfa" radius={[2, 2, 0, 0]} />
                <Bar dataKey="avgEngagement"  name="avgEngagement"  fill="#7c3aed" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-surface-100">
                <th className="text-left py-2 text-zinc-500 font-medium">Type</th>
                <th className="text-right py-2 text-zinc-500 font-medium">Posts</th>
                <th className="text-right py-2 text-zinc-500 font-medium">Avg Reach</th>
                <th className="text-right py-2 text-zinc-500 font-medium">Avg Eng.</th>
                <th className="text-right py-2 text-zinc-500 font-medium">Avg Clicks</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && Array.from({ length: 3 }).map((_, i) => (
                <tr key={i} className="border-b border-surface-50">
                  {[1,2,3,4,5].map(j => (
                    <td key={j} className="py-2.5">
                      <div className="h-3 bg-surface-100 rounded animate-pulse" style={{ width: j === 1 ? '80px' : '40px', marginLeft: j > 1 ? 'auto' : undefined }} />
                    </td>
                  ))}
                </tr>
              ))}
              {!isLoading && (!data || data.length === 0) && (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-xs text-zinc-400">
                    No published posts in this period
                  </td>
                </tr>
              )}
              {!isLoading && data?.map(row => (
                <tr key={row.postType} className="border-b border-surface-50 last:border-0">
                  <td className="py-2 text-zinc-700 font-medium flex items-center gap-1.5">
                    {POST_TYPE_LABEL[row.postType] ?? row.postType}
                    {best?.postType === row.postType && row.avgEngagement > 0 && (
                      <span className="text-[9px] bg-brand-100 text-brand-700 px-1 py-0.5 rounded font-semibold">BEST</span>
                    )}
                  </td>
                  <td className="py-2 text-right text-zinc-600">{row.postCount}</td>
                  <td className="py-2 text-right text-zinc-600">{row.avgReach.toLocaleString('en-IN')}</td>
                  <td className="py-2 text-right text-zinc-600">{row.avgEngagement.toLocaleString('en-IN')}</td>
                  <td className="py-2 text-right text-zinc-600">{row.avgClicks > 0 ? row.avgClicks.toLocaleString('en-IN') : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {best && best.avgEngagement > 0 && (
        <div className="bg-brand-50 border border-brand-100 rounded-xl p-4">
          <p className="text-xs font-semibold text-brand-800 mb-1">💡 AI Insight</p>
          <p className="text-xs text-brand-700">
            {POST_TYPE_LABEL[best.postType] ?? best.postType} posts are your best performing type with an average of {best.avgEngagement} engagements per post. Consider increasing their frequency.
          </p>
        </div>
      )}
    </div>
  )
}

// ─── By Product Tab ───────────────────────────────────────────────────────────

// Product drill-down panel — shown when a product row is clicked
interface ProductDrillDownProps { product: ProductAnalyticsRow; onClose: () => void }

function ProductDrillDown({ product, onClose }: ProductDrillDownProps) {
  const [selectedPost, setSelectedPost] = useState<Post | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['posts', 'byProduct', product.productId],
    queryFn: () =>
      postService.getAll({ product_id: product.productId, status: 'published', limit: 50 })
        .then(r => r.data.data),
  })

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed inset-x-0 bottom-0 sm:inset-0 sm:flex sm:items-center sm:justify-center z-50 p-0 sm:p-4">
        <div className="bg-white w-full sm:max-w-2xl sm:rounded-2xl rounded-t-2xl shadow-2xl max-h-[92vh] sm:max-h-[85vh] flex flex-col overflow-hidden">

          {/* Header */}
          <div className="flex items-center gap-3 px-5 py-4 border-b border-surface-100 shrink-0">
            {product.productImage ? (
              <img src={product.productImage} alt="" className="w-10 h-10 rounded-lg object-cover shrink-0 border border-surface-100" />
            ) : (
              <div className="w-10 h-10 rounded-lg bg-surface-100 flex items-center justify-center shrink-0">
                <ShoppingBag className="w-4 h-4 text-zinc-300" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-zinc-800 truncate">{product.productTitle}</p>
              <p className="text-xs text-zinc-400 mt-0.5">{product.postCount} published {product.postCount === 1 ? 'post' : 'posts'}</p>
            </div>
            <button onClick={onClose} className="w-9 h-9 rounded-xl flex items-center justify-center text-zinc-400 hover:text-zinc-600 hover:bg-surface-100 transition-colors cursor-pointer shrink-0">
              <ChevronLeft className="w-4 h-4" />
            </button>
          </div>

          {/* Aggregate stats */}
          <div className="grid grid-cols-4 divide-x divide-surface-100 border-b border-surface-100 shrink-0">
            {([
              { label: 'Reach',    value: product.totalReach },
              { label: 'Likes',    value: product.totalLikes },
              { label: 'Comments', value: product.totalComments },
              { label: 'Shares',   value: product.totalShares },
            ]).map(s => (
              <div key={s.label} className="py-3 text-center">
                <p className="text-base font-bold text-zinc-800 leading-none">{s.value.toLocaleString('en-IN')}</p>
                <p className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wide mt-1">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Posts */}
          <div className="overflow-y-auto flex-1 p-4">
            {isLoading && (
              <div className="space-y-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="flex gap-3 p-3 rounded-xl border border-surface-100">
                    <div className="w-16 h-16 rounded-lg bg-surface-100 animate-pulse shrink-0" />
                    <div className="flex-1 space-y-2 pt-1">
                      <div className="h-3 bg-surface-100 rounded animate-pulse w-3/4" />
                      <div className="h-3 bg-surface-100 rounded animate-pulse w-1/2" />
                      <div className="h-2.5 bg-surface-100 rounded animate-pulse w-1/3" />
                    </div>
                  </div>
                ))}
              </div>
            )}
            {!isLoading && (!data || data.length === 0) && (
              <p className="py-10 text-center text-sm text-zinc-400">No published posts for this product</p>
            )}
            {!isLoading && data && data.length > 0 && (
              <div className="space-y-2">
                {data.map((post: Post) => {
                  const thumb = post.mediaUrls?.[0] ?? post.imageUrl
                  const caption = post.captionInstagram ?? post.captionFacebook ?? ''
                  type PostWithAnalytics = Post & { analytics?: { reach?: number; likes?: number; comments?: number } }
                  const pa = (post as PostWithAnalytics).analytics
                  return (
                    <button
                      key={post.id}
                      onClick={() => setSelectedPost(post)}
                      className="w-full flex items-start gap-3 p-3 rounded-xl border border-surface-100 hover:border-brand-200 hover:bg-brand-50/30 transition-colors text-left cursor-pointer group"
                    >
                      <div className="w-16 h-16 rounded-lg bg-surface-100 overflow-hidden shrink-0">
                        {thumb
                          ? <img src={thumb} alt="" className="w-full h-full object-cover" />
                          : <div className="w-full h-full flex items-center justify-center"><Image className="w-5 h-5 text-zinc-300" /></div>
                        }
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[11px] font-medium text-zinc-400 mb-1">
                          {POST_TYPE_LABEL[post.postType ?? ''] ?? post.postType ?? 'Post'}
                          {post.publishedAt && <span className="ml-2 text-zinc-300">{formatIST(post.publishedAt)}</span>}
                        </p>
                        <p className="text-sm text-zinc-700 line-clamp-2 leading-snug">{caption || '(no caption)'}</p>
                        <div className="flex items-center gap-3 mt-1.5 text-[11px] text-zinc-400">
                          <span className="flex items-center gap-1"><Eye className="w-3 h-3" />{pa?.reach?.toLocaleString('en-IN') ?? '—'}</span>
                          <span className="flex items-center gap-1"><Heart className="w-3 h-3" />{pa?.likes ?? '—'}</span>
                          <span className="flex items-center gap-1"><MessageCircle className="w-3 h-3" />{pa?.comments ?? '—'}</span>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-zinc-300 group-hover:text-brand-400 transition-colors shrink-0 mt-2" />
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {selectedPost && (
        <PostViewModal post={selectedPost} productName={product.productTitle} open={true} onClose={() => setSelectedPost(null)} />
      )}
    </>
  )
}

// Platform split indicator — clean dot + number, no emoji
function PlatformSplit({ ig, fb }: { ig: number; fb: number }) {
  if (ig === 0 && fb === 0) return <span className="text-zinc-300 text-[11px]">—</span>
  return (
    <span className="inline-flex items-center gap-2 text-[11px] font-medium text-zinc-400">
      {ig > 0 && (
        <span className="inline-flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-pink-400 shrink-0" />
          {ig.toLocaleString('en-IN')}
        </span>
      )}
      {ig > 0 && fb > 0 && <span className="text-zinc-200">·</span>}
      {fb > 0 && (
        <span className="inline-flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
          {fb.toLocaleString('en-IN')}
        </span>
      )}
    </span>
  )
}

interface ByProductTabProps { range: string }

function ByProductTab({ range }: ByProductTabProps) {
  const [selectedProduct, setSelectedProduct] = useState<ProductAnalyticsRow | null>(null)

  const { data, isLoading, isError } = useQuery<ProductAnalyticsRow[]>({
    queryKey: ['analytics', 'by-product', range],
    queryFn:  () => analyticsService.getByProduct(range).then(r => r.data),
  })

  return (
    <div className="space-y-3">
      <Card padding="md">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-sm font-semibold text-zinc-800">Performance by Product</h3>
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-zinc-400">
              <span className="w-2 h-2 rounded-full bg-pink-400" />Instagram
            </span>
            <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-zinc-400">
              <span className="w-2 h-2 rounded-full bg-blue-500" />Facebook
            </span>
          </div>
        </div>
        <div className="overflow-x-auto">

          {/* Loading skeleton */}
          {isLoading && (
            <div className="space-y-px">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4 py-4 border-b border-surface-50">
                  <div className="w-10 h-10 rounded-lg bg-surface-100 animate-pulse shrink-0" />
                  <div className="flex-1 space-y-2 min-w-0">
                    <div className="h-3.5 bg-surface-100 rounded animate-pulse w-40" />
                    <div className="h-2.5 bg-surface-100 rounded animate-pulse w-20" />
                  </div>
                  <div className="hidden sm:flex gap-5 shrink-0">
                    {[1,2,3,4].map(j => (
                      <div key={j} className="text-right space-y-1.5 w-14">
                        <div className="h-3.5 bg-surface-100 rounded animate-pulse" />
                        <div className="h-2.5 bg-surface-100 rounded animate-pulse w-10 ml-auto" />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Error */}
          {isError && (
            <p className="py-8 text-center text-sm text-zinc-400">Failed to load product analytics</p>
          )}

          {/* Empty */}
          {!isLoading && !isError && (!data || data.length === 0) && (
            <div className="py-12 text-center">
              <ShoppingBag className="w-8 h-8 text-zinc-200 mx-auto mb-3" />
              <p className="text-sm font-medium text-zinc-400 mb-1">No product analytics yet</p>
              <p className="text-xs text-zinc-300">Publish posts tagged to products to see performance here.</p>
            </div>
          )}

          {/* Desktop table — hidden on mobile */}
          {!isLoading && data && data.length > 0 && (
            <>
              <table className="hidden md:table w-full">
                <thead>
                  <tr className="border-b border-surface-100">
                    <th className="text-left pb-3 text-[11px] font-semibold text-zinc-400 uppercase tracking-wide">Product</th>
                    <th className="text-right pb-3 text-[11px] font-semibold text-zinc-400 uppercase tracking-wide pl-6">Posts</th>
                    <th className="text-right pb-3 text-[11px] font-semibold text-zinc-400 uppercase tracking-wide pl-6">Reach</th>
                    <th className="text-right pb-3 text-[11px] font-semibold text-zinc-400 uppercase tracking-wide pl-6">Likes</th>
                    <th className="text-right pb-3 text-[11px] font-semibold text-zinc-400 uppercase tracking-wide pl-6">Comments</th>
                    <th className="text-right pb-3 text-[11px] font-semibold text-zinc-400 uppercase tracking-wide pl-6">Shares</th>
                    <th className="text-right pb-3 text-[11px] font-semibold text-zinc-400 uppercase tracking-wide pl-6">Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {data.map(row => (
                    <tr key={row.productId} onClick={() => setSelectedProduct(row)} className="border-b border-surface-50 last:border-0 hover:bg-brand-50/40 transition-colors cursor-pointer group">
                      <td className="py-4 pr-4">
                        <div className="flex items-center gap-3">
                          {row.productImage ? (
                            <img src={row.productImage} alt="" className="w-9 h-9 rounded-lg object-cover shrink-0 border border-surface-100" />
                          ) : (
                            <div className="w-9 h-9 rounded-lg bg-surface-100 flex items-center justify-center shrink-0">
                              <ShoppingBag className="w-4 h-4 text-zinc-300" />
                            </div>
                          )}
                          <span className="text-sm font-medium text-zinc-700 line-clamp-1">{row.productTitle}</span>
                        </div>
                      </td>
                      <td className="py-4 pl-6 text-right text-sm font-semibold text-zinc-700">{row.postCount}</td>
                      <td className="py-4 pl-6 text-right">
                        <div className="text-sm font-semibold text-zinc-700">{row.totalReach.toLocaleString('en-IN')}</div>
                        <div className="mt-0.5"><PlatformSplit ig={row.igReach} fb={row.fbReach} /></div>
                      </td>
                      <td className="py-4 pl-6 text-right">
                        <div className="text-sm font-semibold text-zinc-700">{row.totalLikes.toLocaleString('en-IN')}</div>
                        <div className="mt-0.5"><PlatformSplit ig={row.igLikes} fb={row.fbLikes} /></div>
                      </td>
                      <td className="py-4 pl-6 text-right">
                        <div className="text-sm font-semibold text-zinc-700">{row.totalComments.toLocaleString('en-IN')}</div>
                        <div className="mt-0.5"><PlatformSplit ig={row.igComments} fb={row.fbComments} /></div>
                      </td>
                      <td className="py-4 pl-6 text-right">
                        <div className="text-sm font-semibold text-zinc-700">{row.totalShares.toLocaleString('en-IN')}</div>
                        <div className="mt-0.5"><PlatformSplit ig={row.igShares} fb={row.fbShares} /></div>
                      </td>
                      <td className="py-4 pl-6 text-right">
                        <span className={cn('text-sm font-semibold', row.totalRevenue > 0 ? 'text-green-600' : 'text-zinc-300')}>
                          {row.totalRevenue > 0 ? formatINR(row.totalRevenue) : '—'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Mobile cards */}
              <div className="md:hidden space-y-3">
                {data.map(row => (
                  <button key={row.productId} onClick={() => setSelectedProduct(row)} className="w-full rounded-xl border border-surface-100 overflow-hidden hover:border-brand-200 transition-colors text-left cursor-pointer">
                    <div className="flex items-center gap-3 p-3 bg-surface-50/50">
                      {row.productImage ? (
                        <img src={row.productImage} alt="" className="w-10 h-10 rounded-lg object-cover shrink-0 border border-surface-100" />
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-surface-100 flex items-center justify-center shrink-0">
                          <ShoppingBag className="w-4 h-4 text-zinc-300" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-zinc-800 truncate">{row.productTitle}</p>
                        <p className="text-xs text-zinc-400 mt-0.5">{row.postCount} {row.postCount === 1 ? 'post' : 'posts'}</p>
                      </div>
                      {row.totalRevenue > 0 && (
                        <span className="text-xs font-semibold text-green-600 shrink-0 bg-green-50 px-2 py-1 rounded-md">{formatINR(row.totalRevenue)}</span>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-px bg-surface-100">
                      {([
                        { label: 'Reach',    total: row.totalReach,    ig: row.igReach,    fb: row.fbReach    },
                        { label: 'Likes',    total: row.totalLikes,    ig: row.igLikes,    fb: row.fbLikes    },
                        { label: 'Comments', total: row.totalComments, ig: row.igComments, fb: row.fbComments },
                        { label: 'Shares',   total: row.totalShares,   ig: row.igShares,   fb: row.fbShares   },
                      ]).map(m => (
                        <div key={m.label} className="bg-white px-3 py-2.5">
                          <p className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wide mb-1">{m.label}</p>
                          <p className="text-base font-bold text-zinc-800 leading-none mb-1.5">{m.total.toLocaleString('en-IN')}</p>
                          <PlatformSplit ig={m.ig} fb={m.fb} />
                        </div>
                      ))}
                    </div>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </Card>

      {selectedProduct && (
        <ProductDrillDown product={selectedProduct} onClose={() => setSelectedProduct(null)} />
      )}
    </div>
  )
}

// ─── By Time Tab ─────────────────────────────────────────────────────────────

interface ByTimeTabProps { range: string }

function ByTimeTab({ range }: ByTimeTabProps) {
  const { data, isLoading } = useQuery<TimeOfDayData>({
    queryKey: ['analytics', 'by-time', range],
    queryFn:  () => analyticsService.getByTime(range).then(r => r.data),
  })

  const hourData = data?.byHour ?? Array.from({ length: 24 }, (_, h) => ({ hour: h, avgReach: 0, avgEngagement: 0, postCount: 0 }))
  const dayData  = data?.byDay  ?? Array.from({ length: 7  }, (_, d) => ({ dayOfWeek: d, dayName: ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][d], avgReach: 0, avgEngagement: 0, postCount: 0 }))

  const bestHour = data?.byHour.reduce<typeof hourData[0] | null>((b, r) => (!b || r.avgReach > b.avgReach) ? r : b, null)
  const bestDay  = data?.byDay.reduce<typeof dayData[0]  | null>((b, r) => (!b || r.avgReach > b.avgReach) ? r : b, null)
  const hasData  = data?.byHour.some(h => h.postCount > 0)

  return (
    <div className="space-y-5">
      <Card padding="md">
        <h3 className="text-sm font-semibold text-zinc-800 mb-1">Reach by Hour of Day</h3>
        <p className="text-xs text-zinc-400 mb-4">IST — based on post publish time</p>
        <div className="h-36">
          {isLoading ? (
            <div className="h-full flex items-end gap-0.5 px-1">
              {Array.from({ length: 24 }).map((_, i) => (
                <div key={i} className="flex-1 bg-surface-100 rounded-t animate-pulse" style={{ height: `${20 + Math.random() * 60}%` }} />
              ))}
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={hourData} margin={{ top: 0, right: 0, bottom: 0, left: -20 }}>
                <XAxis dataKey="hour" tick={{ fontSize: 10 }} tickFormatter={h => `${h}h`} interval={3} />
                <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                <Tooltip formatter={v => [v, 'Avg Reach']} labelFormatter={h => `${h}:00 IST`} />
                <Bar dataKey="avgReach" fill="#7c3aed" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
        {!isLoading && hasData && bestHour && bestHour.avgReach > 0 && (
          <p className="text-xs text-brand-700 mt-2 text-center">
            Best time: <strong>{bestHour.hour}:00–{bestHour.hour + 1}:00 IST</strong> · avg reach {bestHour.avgReach}
          </p>
        )}
        {!isLoading && !hasData && (
          <p className="text-xs text-zinc-400 mt-2 text-center">
            Peak hours appear once posts across different times are synced
          </p>
        )}
      </Card>

      <Card padding="md">
        <h3 className="text-sm font-semibold text-zinc-800 mb-4">Reach by Day of Week</h3>
        <div className="h-36">
          {isLoading ? (
            <div className="h-full flex items-end gap-1 px-2">
              {Array.from({ length: 7 }).map((_, i) => (
                <div key={i} className="flex-1 bg-surface-100 rounded-t animate-pulse" style={{ height: `${30 + Math.random() * 55}%` }} />
              ))}
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dayData} margin={{ top: 0, right: 0, bottom: 0, left: -20 }}>
                <XAxis dataKey="dayName" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                <Tooltip formatter={v => [v, 'Avg Reach']} />
                <Bar dataKey="avgReach" fill="#7c3aed" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
        {!isLoading && hasData && bestDay && bestDay.avgReach > 0 && (
          <p className="text-xs text-brand-700 mt-2 text-center">
            Best day: <strong>{bestDay.dayName}</strong> · avg reach {bestDay.avgReach}
          </p>
        )}
      </Card>
    </div>
  )
}

// ─── Reports Tab ──────────────────────────────────────────────────────────────

function ReportsTab(_: { overview: AnalyticsOverview; series: DailyPoint[] }) {
  const [subTab, setSubTab]         = useState<'weekly' | 'monthly'>('weekly')
  const [weekOffset, setWeekOffset] = useState(0)
  const [monthOffset, setMonthOffset] = useState(0)

  const now       = new Date()
  const weekStart = startOfWeek(addWeeks(now, weekOffset), { weekStartsOn: 1 })
  const weekEnd   = endOfWeek(addWeeks(now, weekOffset),   { weekStartsOn: 1 })
  const weekKey   = dfFormat(weekStart, 'yyyy-MM-dd')

  const monthDate   = new Date(now.getFullYear(), now.getMonth() + monthOffset, 1)
  const monthKey    = dfFormat(monthDate, 'yyyy-MM')

  const { data: weeklyData, isLoading: weekLoading } = useQuery<WeeklyReport>({
    queryKey: ['analytics', 'weekly', weekKey],
    queryFn:  () => analyticsService.getWeeklyReport(weekKey).then(r => r.data),
  })

  const { data: monthlyData, isLoading: monthLoading } = useQuery<MonthlyReport>({
    queryKey: ['analytics', 'monthly', monthKey],
    queryFn:  () => analyticsService.getMonthlyReport(monthKey).then(r => r.data),
    enabled:  subTab === 'monthly',
  })

  function handleDownload() {
    const w        = weeklyData
    const bp       = w?.bestPost
    const period   = `${dfFormat(weekStart, 'd MMM')} – ${dfFormat(weekEnd, 'd MMM yyyy')}`
    const generated = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Kolkata' })

    const metric = (label: string, value: string, icon: string) => `
      <div class="metric-card">
        <div class="metric-icon">${icon}</div>
        <div class="metric-value">${value}</div>
        <div class="metric-label">${label}</div>
      </div>`

    const row = (label: string, value: string) => `
      <tr>
        <td class="row-label">${label}</td>
        <td class="row-value">${value}</td>
      </tr>`

    const bestPostSection = bp ? `
      <div class="section">
        <div class="section-title">🏆 Best Performing Post</div>
        <div class="best-post">
          ${(bp.mediaUrls?.[0] ?? bp.imageUrl) ? `<img class="post-thumb" src="${bp.mediaUrls?.[0] ?? bp.imageUrl}" alt="Post thumbnail" />` : '<div class="post-thumb-placeholder">📷</div>'}
          <div class="post-meta">
            <div class="post-caption">${(bp.captionInstagram ?? bp.captionFacebook ?? '').slice(0, 140)}${((bp.captionInstagram ?? bp.captionFacebook ?? '').length > 140) ? '…' : ''}</div>
            <div class="post-stats">
              <span>👁 ${bp.analytics.reach.toLocaleString('en-IN')} reach</span>
              <span>❤️ ${bp.analytics.likes} likes</span>
              <span>💬 ${bp.analytics.comments} comments</span>
              <span>🔁 ${bp.analytics.shares} shares</span>
            </div>
          </div>
        </div>
      </div>` : ''

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>VisualFlow AI — Weekly Report (${period})</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');

    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
      background: #f8f7ff;
      color: #18181b;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    .page {
      max-width: 780px;
      margin: 0 auto;
      background: #ffffff;
      min-height: 100vh;
    }

    /* ── Header ── */
    .header {
      background: linear-gradient(135deg, #7c3aed 0%, #5b21b6 100%);
      padding: 40px 48px 36px;
      color: #ffffff;
      position: relative;
      overflow: hidden;
    }
    .header::after {
      content: '';
      position: absolute;
      top: -60px; right: -60px;
      width: 200px; height: 200px;
      border-radius: 50%;
      background: rgba(255,255,255,0.07);
    }
    .header-brand {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 24px;
    }
    .brand-icon {
      width: 36px; height: 36px;
      background: rgba(255,255,255,0.2);
      border-radius: 10px;
      display: flex; align-items: center; justify-content: center;
      font-size: 18px;
    }
    .brand-name {
      font-size: 15px;
      font-weight: 700;
      letter-spacing: 0.3px;
      opacity: 0.95;
    }
    .header-title {
      font-size: 28px;
      font-weight: 800;
      line-height: 1.2;
      margin-bottom: 8px;
    }
    .header-period {
      font-size: 14px;
      opacity: 0.8;
      font-weight: 500;
    }
    .header-badge {
      display: inline-block;
      margin-top: 14px;
      padding: 4px 12px;
      background: rgba(255,255,255,0.15);
      border: 1px solid rgba(255,255,255,0.25);
      border-radius: 20px;
      font-size: 12px;
      font-weight: 600;
      letter-spacing: 0.5px;
      text-transform: uppercase;
    }

    /* ── Body ── */
    .body { padding: 40px 48px 48px; }

    /* ── Metrics grid ── */
    .metrics-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 16px;
      margin-bottom: 36px;
    }
    .metric-card {
      background: #faf9ff;
      border: 1px solid #ede9fe;
      border-radius: 14px;
      padding: 18px 16px 16px;
      text-align: center;
    }
    .metric-icon { font-size: 22px; margin-bottom: 8px; }
    .metric-value {
      font-size: 22px;
      font-weight: 800;
      color: #5b21b6;
      line-height: 1;
      margin-bottom: 5px;
    }
    .metric-label {
      font-size: 11px;
      color: #71717a;
      font-weight: 500;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    /* ── Section ── */
    .section { margin-bottom: 32px; }
    .section-title {
      font-size: 13px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.8px;
      color: #7c3aed;
      margin-bottom: 14px;
      padding-bottom: 10px;
      border-bottom: 2px solid #ede9fe;
    }

    /* ── Detail table ── */
    .detail-table { width: 100%; border-collapse: collapse; }
    .detail-table tr { border-bottom: 1px solid #f4f4f5; }
    .detail-table tr:last-child { border-bottom: none; }
    .row-label {
      padding: 11px 0;
      font-size: 13.5px;
      color: #52525b;
      font-weight: 500;
    }
    .row-value {
      padding: 11px 0;
      font-size: 13.5px;
      font-weight: 700;
      color: #18181b;
      text-align: right;
    }

    /* ── Best post ── */
    .best-post {
      display: flex;
      gap: 18px;
      align-items: flex-start;
      background: #faf9ff;
      border: 1px solid #ede9fe;
      border-radius: 14px;
      padding: 20px;
    }
    .post-thumb {
      width: 80px; height: 80px;
      border-radius: 10px;
      object-fit: cover;
      flex-shrink: 0;
      border: 1px solid #ede9fe;
    }
    .post-thumb-placeholder {
      width: 80px; height: 80px;
      border-radius: 10px;
      background: #ede9fe;
      display: flex; align-items: center; justify-content: center;
      font-size: 28px;
      flex-shrink: 0;
    }
    .post-caption {
      font-size: 13px;
      color: #3f3f46;
      line-height: 1.6;
      margin-bottom: 12px;
    }
    .post-stats {
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
      font-size: 12px;
      font-weight: 600;
      color: #7c3aed;
    }

    /* ── Divider ── */
    .divider {
      height: 1px;
      background: #f4f4f5;
      margin: 32px 0;
    }

    /* ── Footer ── */
    .footer {
      border-top: 2px solid #ede9fe;
      padding: 24px 48px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      background: #faf9ff;
    }
    .footer-brand {
      font-size: 13px;
      font-weight: 700;
      color: #7c3aed;
    }
    .footer-note {
      font-size: 11px;
      color: #a1a1aa;
    }
    .footer-generated {
      font-size: 11px;
      color: #a1a1aa;
      text-align: right;
    }

    /* ── Watermark strip ── */
    .watermark {
      background: linear-gradient(135deg, #7c3aed 0%, #5b21b6 100%);
      height: 4px;
    }

    @media print {
      body { background: #fff; }
      .page { max-width: 100%; }
      .no-print { display: none !important; }
    }
  </style>
</head>
<body>
  <div class="page">
    <div class="watermark"></div>

    <div class="header">
      <div class="header-brand">
        <div class="brand-icon">✦</div>
        <div class="brand-name">VisualFlow AI</div>
      </div>
      <div class="header-title">Weekly Performance Report</div>
      <div class="header-period">${period}</div>
      <div class="header-badge">Instagram &amp; Facebook Analytics</div>
    </div>

    <div class="body">

      <!-- Metric cards -->
      <div class="metrics-grid">
        ${metric('Posts', String(w?.postsPublished ?? 0), '📤')}
        ${metric('Reach', (w?.totalReach ?? 0).toLocaleString('en-IN'), '📡')}
        ${metric('Likes', (w?.totalLikes ?? 0).toLocaleString('en-IN'), '❤️')}
        ${metric('Comments', (w?.totalComments ?? 0).toLocaleString('en-IN'), '💬')}
      </div>

      <!-- Detail breakdown -->
      <div class="section">
        <div class="section-title">📊 Full Breakdown</div>
        <table class="detail-table">
          ${row('Posts Published', String(w?.postsPublished ?? 0))}
          ${row('Total Reach', (w?.totalReach ?? 0).toLocaleString('en-IN'))}
          ${row('Total Impressions', (w?.totalImpressions ?? 0).toLocaleString('en-IN'))}
          ${row('Likes', (w?.totalLikes ?? 0).toLocaleString('en-IN'))}
          ${row('Comments', (w?.totalComments ?? 0).toLocaleString('en-IN'))}
          ${row('Shares', (w?.totalShares ?? 0).toLocaleString('en-IN'))}
          ${row('Saves', (w?.totalSaves ?? 0).toLocaleString('en-IN'))}
          ${row('Total Engagement', (w?.totalEngagement ?? 0).toLocaleString('en-IN'))}
          ${row('Revenue Attributed', w?.totalRevenue ? '₹' + (w.totalRevenue).toLocaleString('en-IN') : '₹0')}
        </table>
      </div>

      ${bestPostSection}

      <div class="divider"></div>

      <div style="background:#faf9ff;border:1px solid #ede9fe;border-radius:14px;padding:20px;">
        <div style="font-size:12px;font-weight:700;color:#7c3aed;text-transform:uppercase;letter-spacing:0.8px;margin-bottom:10px;">💡 Key Insight</div>
        <div style="font-size:13px;color:#3f3f46;line-height:1.6;">
          ${(w?.totalEngagement ?? 0) > 0
            ? `You generated <strong>${(w?.totalEngagement ?? 0).toLocaleString('en-IN')} total engagements</strong> across ${w?.postsPublished ?? 0} posts this week. ${(w?.totalReach ?? 0) > 0 ? `Your content reached <strong>${(w?.totalReach ?? 0).toLocaleString('en-IN')} unique accounts</strong>.` : ''}`
            : 'No engagement data yet for this week. Publish more posts and sync analytics to unlock insights.'}
        </div>
      </div>

    </div>

    <div class="footer">
      <div>
        <div class="footer-brand">✦ VisualFlow AI</div>
        <div class="footer-note">Automated Social Media Intelligence</div>
      </div>
      <div class="footer-generated">
        Generated on ${generated}<br/>
        Data sourced from Instagram &amp; Facebook Graph API
      </div>
    </div>

    <div class="watermark"></div>
  </div>

  <script>
    window.onload = function() { window.print(); }
  </script>
</body>
</html>`

    const blob = new Blob([html], { type: 'text/html' })
    const url  = URL.createObjectURL(blob)
    window.open(url, '_blank')
    setTimeout(() => URL.revokeObjectURL(url), 60000)
  }

  function pct(curr: number, prev: number) {
    if (!prev) return null
    const p = Math.round(((curr - prev) / prev) * 100)
    return p
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-1 bg-surface-100 rounded-lg p-1 w-fit">
        {(['weekly', 'monthly'] as const).map(st => (
          <button key={st} onClick={() => setSubTab(st)}
            className={`px-4 py-1.5 text-xs font-medium rounded-md transition-colors min-h-9 capitalize cursor-pointer ${
              subTab === st ? 'bg-white text-brand-600 shadow-sm' : 'text-zinc-500 hover:text-zinc-700'
            }`}
          >{st}</button>
        ))}
      </div>

      {/* ── Weekly ── */}
      {subTab === 'weekly' && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <button onClick={() => setWeekOffset(o => o - 1)}
              className="p-2 rounded-lg border border-surface-200 bg-white hover:bg-surface-50 transition-colors min-h-9 min-w-9 flex items-center justify-center cursor-pointer">
              <ChevronLeft className="h-4 w-4 text-zinc-600" />
            </button>
            <span className="text-sm font-medium text-zinc-800">
              {dfFormat(weekStart, 'd MMM')}–{dfFormat(weekEnd, 'd MMM yyyy')}
            </span>
            <button onClick={() => setWeekOffset(o => Math.min(0, o + 1))} disabled={weekOffset === 0}
              className="p-2 rounded-lg border border-surface-200 bg-white hover:bg-surface-50 transition-colors min-h-9 min-w-9 flex items-center justify-center disabled:opacity-40 cursor-pointer">
              <ChevronRight className="h-4 w-4 text-zinc-600" />
            </button>
          </div>

          <Card padding="md">
            <div className="border-b border-surface-100 pb-3 mb-4">
              <p className="text-xs text-zinc-400">{dfFormat(weekStart, 'd MMM')}–{dfFormat(weekEnd, 'd MMM yyyy')}</p>
              <h3 className="text-base font-bold text-zinc-900">VisualFlow AI Weekly Report</h3>
            </div>

            {weekLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex justify-between py-2 border-b border-surface-50">
                    <div className="h-3 w-28 bg-surface-100 rounded animate-pulse" />
                    <div className="h-3 w-16 bg-surface-100 rounded animate-pulse" />
                  </div>
                ))}
              </div>
            ) : (
              <>
                <div className="space-y-0.5 mb-5">
                  {([
                    { emoji: '📤', label: 'Posts Published',    value: String(weeklyData?.postsPublished ?? 0) },
                    { emoji: '📡', label: 'Total Reach',        value: (weeklyData?.totalReach ?? 0).toLocaleString('en-IN') },
                    { emoji: '👁️', label: 'Impressions',        value: (weeklyData?.totalImpressions ?? 0).toLocaleString('en-IN') },
                    { emoji: '❤️', label: 'Likes',              value: (weeklyData?.totalLikes ?? 0).toLocaleString('en-IN') },
                    { emoji: '💬', label: 'Comments',           value: (weeklyData?.totalComments ?? 0).toLocaleString('en-IN') },
                    { emoji: '🔁', label: 'Shares',             value: (weeklyData?.totalShares ?? 0).toLocaleString('en-IN') },
                    { emoji: '🔖', label: 'Saves',              value: (weeklyData?.totalSaves ?? 0).toLocaleString('en-IN') },
                    { emoji: '💰', label: 'Revenue Attributed', value: formatINR(weeklyData?.totalRevenue ?? 0) },
                  ] as const).map(row => (
                    <div key={row.label} className="flex items-center justify-between py-2 border-b border-surface-50 last:border-0">
                      <span className="text-sm text-zinc-600 flex items-center gap-2"><span>{row.emoji}</span>{row.label}</span>
                      <span className="text-sm font-semibold text-zinc-800">{row.value}</span>
                    </div>
                  ))}
                </div>

                {weeklyData?.bestPost && (
                  <div className="border-t border-surface-100 pt-4 mb-4">
                    <p className="text-xs font-semibold text-zinc-700 mb-2">🏆 Best Post</p>
                    <div className="flex items-center gap-3">
                      <div className="h-12 w-12 rounded-lg bg-surface-100 overflow-hidden shrink-0 flex items-center justify-center">
                        {(weeklyData.bestPost.mediaUrls?.[0] ?? weeklyData.bestPost.imageUrl) ? (
                          <img src={(weeklyData.bestPost.mediaUrls?.[0] ?? weeklyData.bestPost.imageUrl) as string} alt="" className="h-full w-full object-cover" />
                        ) : <Image className="h-5 w-5 text-zinc-300" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-zinc-700 line-clamp-1">{postCaption(weeklyData.bestPost) || '—'}</p>
                        <p className="text-xs text-zinc-400 mt-0.5">
                          Reach {weeklyData.bestPost.analytics.reach.toLocaleString('en-IN')} · {weeklyData.bestPost.analytics.likes + weeklyData.bestPost.analytics.comments + weeklyData.bestPost.analytics.shares} eng
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </Card>

          <button onClick={handleDownload}
            className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-brand-600 border border-brand-200 bg-brand-50 rounded-xl hover:bg-brand-100 transition-colors min-h-11 cursor-pointer">
            <Download className="h-4 w-4" />
            Download Report
          </button>
        </div>
      )}

      {/* ── Monthly ── */}
      {subTab === 'monthly' && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <button onClick={() => setMonthOffset(o => o - 1)}
              className="p-2 rounded-lg border border-surface-200 bg-white hover:bg-surface-50 transition-colors min-h-9 min-w-9 flex items-center justify-center cursor-pointer">
              <ChevronLeft className="h-4 w-4 text-zinc-600" />
            </button>
            <span className="text-sm font-medium text-zinc-800">{dfFormat(monthDate, 'MMMM yyyy')}</span>
            <button onClick={() => setMonthOffset(o => Math.min(0, o + 1))} disabled={monthOffset === 0}
              className="p-2 rounded-lg border border-surface-200 bg-white hover:bg-surface-50 transition-colors min-h-9 min-w-9 flex items-center justify-center disabled:opacity-40 cursor-pointer">
              <ChevronRight className="h-4 w-4 text-zinc-600" />
            </button>
          </div>

          <Card padding="md">
            <h3 className="text-sm font-bold text-zinc-900 mb-1">{dfFormat(monthDate, 'MMMM yyyy')} Overview</h3>

            {monthLoading ? (
              <div className="grid grid-cols-2 gap-3 mt-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="h-16 bg-surface-100 rounded-lg animate-pulse" />
                ))}
              </div>
            ) : monthlyData ? (
              <>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4 mb-5">
                  <StatCard label="Total Reach"  value={monthlyData.totalReach.toLocaleString('en-IN')}  icon={<Eye          className="h-4 w-4" />} />
                  <StatCard label="Engagement"   value={monthlyData.totalEngagement.toLocaleString('en-IN')} icon={<Heart className="h-4 w-4" />} />
                  <StatCard label="Impressions"  value={monthlyData.totalImpressions.toLocaleString('en-IN')} icon={<BarChart2 className="h-4 w-4" />} />
                  <StatCard label="Posts"        value={String(monthlyData.postsPublished)}  icon={<Image className="h-4 w-4" />} />
                </div>

                <h4 className="text-xs font-semibold text-zinc-700 mb-2">Month-over-Month</h4>
                <div className="space-y-0.5">
                  {([
                    { label: 'Reach',           curr: monthlyData.totalReach,       prev: monthlyData.prev.totalReach },
                    { label: 'Engagement',      curr: monthlyData.totalEngagement,  prev: monthlyData.prev.totalEngagement },
                    { label: 'Posts Published', curr: monthlyData.postsPublished,   prev: monthlyData.prev.postsPublished },
                    { label: 'Revenue',         curr: monthlyData.totalRevenue,     prev: monthlyData.prev.totalRevenue, currency: true },
                  ]).map(row => {
                    const delta = pct(row.curr, row.prev)
                    return (
                      <div key={row.label} className="flex items-center justify-between py-2 border-b border-surface-50 last:border-0">
                        <span className="text-sm text-zinc-600">{row.label}</span>
                        <div className="flex items-center gap-3">
                          {delta !== null && (
                            <span className={cn('text-xs font-medium', delta >= 0 ? 'text-green-600' : 'text-red-500')}>
                              {delta >= 0 ? '+' : ''}{delta}%
                            </span>
                          )}
                          <span className="text-sm font-semibold text-zinc-800">
                            {row.currency ? formatINR(row.curr) : row.curr.toLocaleString('en-IN')}
                          </span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </>
            ) : null}
          </Card>

          {monthlyData && monthlyData.topPosts.length > 0 && (
            <Card padding="md">
              <h3 className="text-sm font-semibold text-zinc-800 mb-3">Top Posts</h3>
              <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
                <div className="flex gap-3 pb-2">
                  {monthlyData.topPosts.slice(0, 5).map(post => {
                    const thumb = post.mediaUrls?.[0] ?? post.imageUrl
                    return (
                      <div key={post.id} className="shrink-0 w-36 space-y-1.5">
                        <div className="h-28 rounded-lg bg-surface-100 overflow-hidden flex items-center justify-center">
                          {thumb ? <img src={thumb} alt="" className="h-full w-full object-cover" /> : <Image className="h-6 w-6 text-zinc-300" />}
                        </div>
                        <p className="text-xs text-zinc-600 line-clamp-2">{postCaption(post) || '—'}</p>
                        <div className="flex items-center gap-2 text-xs text-zinc-400">
                          <span className="flex items-center gap-0.5"><Eye className="h-3 w-3" />{post.analytics.reach.toLocaleString('en-IN')}</span>
                          <span className="flex items-center gap-0.5"><Heart className="h-3 w-3" />{post.analytics.likes}</span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </Card>
          )}

          {monthlyData && (
            <div className="bg-brand-50 border-l-4 border-brand-600 rounded-r-xl p-4">
              <p className="text-sm font-semibold text-brand-900 mb-2">💡 AI Insights</p>
              <ul className="space-y-1.5">
                {[
                  monthlyData.totalEngagement > 0
                    ? `${monthlyData.postsPublished} posts generated ${monthlyData.totalEngagement.toLocaleString('en-IN')} total engagements this month.`
                    : 'Publish and sync posts to unlock AI recommendations.',
                  monthlyData.prev.totalReach > 0 && monthlyData.totalReach > monthlyData.prev.totalReach
                    ? `Reach grew ${pct(monthlyData.totalReach, monthlyData.prev.totalReach)}% vs last month — keep up the momentum.`
                    : 'Consistent daily posting can increase organic reach by up to 40%.',
                  'Carousel posts typically get 3× more engagement than single images.',
                ].map((insight, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-brand-800">
                    <span className="mt-0.5 shrink-0">•</span><span>{insight}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function Analytics() {
  useEffect(() => {
    document.title = 'Analytics & Reports — VisualFlow AI'
  }, [])

  const [searchParams, setSearchParams] = useSearchParams()
  const tab        = (searchParams.get('tab')   ?? 'overview') as TabId
  const rangeParam = (searchParams.get('range') ?? '7d')       as RangeValue

  const queryClient = useQueryClient()
  const { showToast } = useToast()
  const apiRange    = toApiRange(rangeParam)

  const {
    data: overview,
    isLoading: overviewLoading,
    isFetching: overviewFetching,
    isError: overviewError,
    error: overviewErr,
    refetch: refetchOverview,
  } = useQuery({
    queryKey: ['analytics', 'overview', apiRange],
    queryFn: async () => {
      const res = await analyticsService.getOverview(apiRange)
      return res.data
    },
  })

  const {
    data: series,
    isLoading: seriesLoading,
    refetch: refetchSeries,
  } = useQuery({
    queryKey: ['analytics', 'series', apiRange],
    queryFn: async () => {
      const res = await analyticsService.getDailySeries(apiRange)
      return res.data
    },
  })

  const refreshMutation = useMutation({
    mutationFn: () => analyticsService.refreshAnalytics(),
    onSuccess: (res) => {
      void queryClient.invalidateQueries({ queryKey: ['analytics'] })
      const d = res.data as typeof res.data & { totalReach?: number; totalEngagement?: number }
      const hasRealData = (d.totalReach ?? 0) > 0 || (d.totalEngagement ?? 0) > 0
      if (hasRealData) {
        showToast('Analytics synced with latest data from Instagram & Facebook', 'success')
      } else {
        showToast(
          'Sync complete — all metrics show 0. Make sure your Facebook app has instagram_manage_insights and pages_read_engagement permissions, then reconnect in Settings.',
          'error'
        )
      }
    },
    onError: () => showToast('Sync failed — try again or check your Facebook connection in Settings', 'error'),
  })

  function setTab(t: TabId) {
    setSearchParams(prev => { prev.set('tab', t); return prev })
  }

  function setRange(r: RangeValue) {
    setSearchParams(prev => { prev.set('range', r); return prev })
  }

  // Only show full-page skeleton on initial load (no data yet). Range changes refetch in background.
  if ((overviewLoading && !overview) || (seriesLoading && !series)) return <AnalyticsSkeleton />

  if (overviewError) return (
    <PageWrapper title="Analytics & Reports" showBack>
      <ErrorState
        title="Could not load analytics"
        message={overviewErr instanceof Error ? overviewErr.message : 'Something went wrong'}
        onRetry={() => { void refetchOverview(); void refetchSeries() }}
      />
    </PageWrapper>
  )

  const data       = overview!
  const seriesData = series ?? []
  const lastFetchedAt = data.lastFetchedAt

  // Reports tab has its own internal range UI; hide global range selector
  const showRangeSelector = tab !== 'reports'

  return (
    <PageWrapper
      title="Analytics & Reports"
      showBack
      action={
        <div className="flex items-center gap-2">
          <div className="hidden sm:flex flex-col items-end gap-0.5">
            {lastFetchedAt && (
              <span className="text-xs text-zinc-400">Updated {minsAgo(lastFetchedAt)}</span>
            )}
            <span className="text-[10px] text-zinc-300">Auto-syncs every 6 hours</span>
          </div>
          <button
            onClick={() => refreshMutation.mutate()}
            disabled={refreshMutation.isPending}
            title="Force sync now — analytics auto-sync every 6 hours"
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50 transition-colors disabled:opacity-50 min-h-9 cursor-pointer"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${refreshMutation.isPending ? 'animate-spin' : ''}`} />
            {refreshMutation.isPending ? 'Syncing…' : 'Sync Now'}
          </button>
        </div>
      }
    >
      <div className="space-y-5">
        {/* Tab bar + date range selector */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          {/* Tabs — horizontal scroll on mobile */}
          <div className="overflow-x-auto">
            <div className="flex gap-1 bg-surface-100 rounded-lg p-1 w-fit">
              {TABS.map(t => (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap min-h-9 cursor-pointer ${
                    tab === t.id
                      ? 'bg-white text-brand-600 shadow-sm'
                      : 'text-zinc-500 hover:text-zinc-700'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Date range */}
          {showRangeSelector && (
            <div className="flex gap-1 bg-surface-100 rounded-lg p-1 w-fit sm:ml-auto">
              {RANGES.map(r => (
                <button
                  key={r.value}
                  onClick={() => setRange(r.value)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap min-h-9 cursor-pointer relative ${
                    rangeParam === r.value
                      ? 'bg-white text-brand-600 shadow-sm'
                      : 'text-zinc-500 hover:text-zinc-700'
                  }`}
                >
                  {r.label}
                  {rangeParam === r.value && overviewFetching && (
                    <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-brand-400 animate-pulse" />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Active tab content */}
        {tab === 'overview'    && <OverviewTab   overview={data} series={seriesData} />}
        {tab === 'by-content'  && <ByContentTab range={rangeParam} />}
        {tab === 'by-product'  && <ByProductTab  range={rangeParam} />}
        {tab === 'by-time'     && <ByTimeTab     range={rangeParam} />}
        {tab === 'reports'     && <ReportsTab    overview={data} series={seriesData} />}
      </div>
    </PageWrapper>
  )
}
