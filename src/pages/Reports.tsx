import { useQuery } from '@tanstack/react-query'
import { PageWrapper } from '@/components/layout/PageWrapper'
import { ErrorState } from '@/components/ui/ErrorState'
import { Skeleton } from '@/components/ui/Skeleton'
import { Card } from '@/components/ui/Card'
import { StatCard } from '@/components/shared/StatCard'
import { PlatformBadge } from '@/components/shared/PlatformBadge'
import { analyticsService } from '@/services/analyticsService'
import { formatINR } from '@/utils/indianFormat'
import { formatIST } from '@/utils/dateUtils'
import { Eye, MousePointer, ShoppingBag, TrendingUp, Image } from 'lucide-react'
import type { Post } from '@/types/post.types'

export default function Reports() {
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['reports', 'overview-30d'],
    queryFn: async () => {
      const res = await analyticsService.getOverview('30d')
      return res.data
    },
  })

  if (isLoading) return (
    <PageWrapper title="Reports" showBack>
      <div className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-28" />)}
        </div>
        <Skeleton className="h-48" />
        <Skeleton className="h-64" />
      </div>
    </PageWrapper>
  )

  if (isError) return (
    <ErrorState
      title="Could not load reports"
      message={error instanceof Error ? error.message : 'Something went wrong'}
      onRetry={() => refetch()}
    />
  )

  const overview = data ?? {
    totalReach: 0,
    totalImpressions: 0,
    totalClicks: 0,
    totalRevenue: 0,
    roas: 0,
    postsPublished: 0,
    topPosts: [] as Post[],
  }

  const topPosts: Post[] = overview.topPosts ?? []

  return (
    <PageWrapper title="Reports" showBack>
      <div className="space-y-5">
        <p className="text-xs text-zinc-400">Last 30 days</p>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard
            label="Total Reach"
            value={overview.totalReach.toLocaleString('en-IN')}
            icon={<Eye className="h-4 w-4" />}
          />
          <StatCard
            label="Total Clicks"
            value={overview.totalClicks.toLocaleString('en-IN')}
            icon={<MousePointer className="h-4 w-4" />}
          />
          <StatCard
            label="Revenue Attributed"
            value={formatINR(overview.totalRevenue)}
            icon={<ShoppingBag className="h-4 w-4" />}
          />
          <StatCard
            label="ROAS"
            value={overview.roas > 0 ? `${overview.roas.toFixed(1)}x` : '—'}
            icon={<TrendingUp className="h-4 w-4" />}
          />
        </div>

        <Card padding="md">
          <h2 className="font-semibold text-zinc-800 text-sm mb-3">Month-over-Month</h2>
          <div className="space-y-3">
            {[
              { label: 'Reach', current: overview.totalReach.toLocaleString('en-IN'), prev: '—' },
              { label: 'Clicks', current: overview.totalClicks.toLocaleString('en-IN'), prev: '—' },
              { label: 'Revenue', current: formatINR(overview.totalRevenue), prev: '—' },
              { label: 'Posts Published', current: String(overview.postsPublished), prev: '—' },
            ].map(row => (
              <div key={row.label} className="flex items-center justify-between py-1 border-b border-surface-100 last:border-0">
                <span className="text-sm text-zinc-600">{row.label}</span>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-zinc-400">{row.prev}</span>
                  <span className="text-sm font-semibold text-zinc-800">{row.current}</span>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card padding="md">
          <h2 className="font-semibold text-zinc-800 text-sm mb-3">Top Posts by Reach</h2>
          {topPosts.length === 0 ? (
            <p className="text-sm text-zinc-400 text-center py-6">No published posts yet</p>
          ) : (
            <div className="space-y-3">
              {topPosts.slice(0, 5).map(post => {
                const thumbnail = post.mediaUrls?.[0] ?? post.imageUrl
                const caption = post.captionInstagram ?? post.captionFacebook ?? post.caption ?? ''
                const platform = post.platform ?? 'instagram'
                return (
                  <div key={post.id} className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-lg bg-surface-100 flex items-center justify-center overflow-hidden shrink-0">
                      {thumbnail
                        ? <img src={thumbnail} alt="" className="w-full h-full object-cover" />
                        : <Image className="h-5 w-5 text-zinc-300" />
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-zinc-800 line-clamp-1">{caption || '—'}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <PlatformBadge platform={platform} />
                        {post.publishedAt && (
                          <p className="text-xs text-zinc-400">{formatIST(post.publishedAt, 'dd MMM')}</p>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </Card>
      </div>
    </PageWrapper>
  )
}
