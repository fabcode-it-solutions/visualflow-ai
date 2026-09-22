import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { PageWrapper } from '@/components/layout/PageWrapper'
import { ErrorState } from '@/components/ui/ErrorState'
import { EmptyState } from '@/components/ui/EmptyState'
import { Skeleton } from '@/components/ui/Skeleton'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { useToast } from '@/hooks/useToast'
import { formatIST } from '@/utils/dateUtils'
import { Plus, Trash2, Users, Clock, TrendingUp, Hash } from 'lucide-react'
import api from '@/services/api'
import type { Competitor } from '@/types/analytics.types'

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatsRow({ competitor }: { competitor: Competitor }) {
  const hasData = competitor.postFrequency !== null || competitor.avgEngagement !== null

  if (!hasData) {
    return (
      <p className="text-xs text-zinc-400 mt-2 flex items-center gap-1.5">
        <Clock className="h-3.5 w-3.5 shrink-0" />
        {competitor.notes ?? 'Gathering data… checked automatically every 24 hours.'}
      </p>
    )
  }

  return (
    <div className="flex gap-4 mt-2">
      {competitor.postFrequency !== null && (
        <div>
          <p className="text-xs text-zinc-400">Posts/week</p>
          <p className="text-sm font-semibold text-zinc-800">{competitor.postFrequency.toFixed(1)}</p>
        </div>
      )}
      {competitor.avgEngagement !== null && (
        <div>
          <p className="text-xs text-zinc-400">Avg engagement</p>
          <p className="text-sm font-semibold text-zinc-800">
            {competitor.avgEngagement >= 1000
              ? `${(competitor.avgEngagement / 1000).toFixed(1)}k`
              : competitor.avgEngagement.toFixed(0)}
          </p>
        </div>
      )}
      {competitor.lastCheckedAt && (
        <div>
          <p className="text-xs text-zinc-400">Last checked</p>
          <p className="text-sm text-zinc-500">{formatIST(competitor.lastCheckedAt, 'dd MMM')}</p>
        </div>
      )}
    </div>
  )
}

function HashtagChips({ hashtags }: { hashtags: string[] }) {
  if (!hashtags.length) return null
  return (
    <div className="mt-3">
      <p className="text-xs font-medium text-zinc-500 mb-1.5 flex items-center gap-1">
        <Hash className="h-3.5 w-3.5" />
        Trending hashtags
      </p>
      <div className="flex flex-wrap gap-1.5">
        {hashtags.slice(0, 10).map(tag => (
          <span
            key={tag}
            className="text-xs px-2 py-0.5 rounded-full bg-violet-50 text-violet-700 border border-violet-100"
          >
            {tag}
          </span>
        ))}
      </div>
    </div>
  )
}

function FormatBar({ formats }: { formats: Record<string, number> }) {
  const entries = Object.entries(formats).filter(([, v]) => v > 0)
  if (!entries.length) return null

  const colors: Record<string, string> = {
    feed:     'bg-blue-400',
    carousel: 'bg-violet-400',
    reel:     'bg-pink-400',
  }
  const labels: Record<string, string> = {
    feed: 'Feed', carousel: 'Carousel', reel: 'Reel',
  }

  return (
    <div className="mt-3">
      <p className="text-xs font-medium text-zinc-500 mb-1.5 flex items-center gap-1">
        <TrendingUp className="h-3.5 w-3.5" />
        Content mix
      </p>
      <div className="flex rounded-full overflow-hidden h-2 w-full">
        {entries.map(([key, pct]) => (
          <div
            key={key}
            className={colors[key] ?? 'bg-zinc-300'}
            style={{ width: `${pct}%` }}
          />
        ))}
      </div>
      <div className="flex gap-3 mt-1.5">
        {entries.map(([key, pct]) => (
          <span key={key} className="text-xs text-zinc-500 flex items-center gap-1">
            <span className={`h-2 w-2 rounded-full inline-block ${colors[key] ?? 'bg-zinc-300'}`} />
            {labels[key] ?? key} {pct}%
          </span>
        ))}
      </div>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function CompetitorMonitor() {
  const queryClient = useQueryClient()
  const { showToast } = useToast()
  const [handle, setHandle] = useState('')

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['competitors'],
    queryFn: async () => {
      const res = await api.get<Competitor[]>('/competitors')
      return res.data as Competitor[]
    },
  })

  const { mutate: addCompetitor, isPending: isAdding } = useMutation({
    mutationFn: (h: string) => api.post<Competitor>('/competitors', { handle: h }),
    onSuccess: () => {
      showToast('Competitor added', 'success')
      setHandle('')
      queryClient.invalidateQueries({ queryKey: ['competitors'] })
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : 'Failed to add competitor'
      showToast(msg, 'error')
    },
  })

  const { mutate: removeCompetitor } = useMutation({
    mutationFn: (id: string) => api.delete(`/competitors/${id}`),
    onSuccess: () => {
      showToast('Competitor removed', 'success')
      queryClient.invalidateQueries({ queryKey: ['competitors'] })
    },
    onError: () => showToast('Failed to remove', 'error'),
  })

  const competitors: Competitor[] = data ?? []
  const canAdd = competitors.length < 5

  if (isLoading) return (
    <PageWrapper title="Competitor Monitor" showBack>
      <div className="space-y-3">
        {[1, 2].map(i => <Skeleton key={i} className="h-32 w-full" />)}
      </div>
    </PageWrapper>
  )

  if (isError) return (
    <ErrorState
      title="Could not load competitors"
      message={error instanceof Error ? error.message : 'Something went wrong'}
      onRetry={() => refetch()}
    />
  )

  return (
    <PageWrapper
      title="Competitor Monitor"
      showBack
      action={<Badge variant="default">{competitors.length}/5</Badge>}
    >
      <div className="space-y-5">
        {canAdd && (
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="@instagram_handle"
              value={handle}
              onChange={e => setHandle(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handle.trim() && addCompetitor(handle.trim())}
              className="flex-1 px-3 py-2.5 text-sm border border-surface-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 min-h-11"
            />
            <Button
              variant="primary"
              size="sm"
              loading={isAdding}
              disabled={!handle.trim()}
              leftIcon={<Plus className="h-4 w-4" />}
              onClick={() => addCompetitor(handle.trim())}
            >
              Add
            </Button>
          </div>
        )}

        {!canAdd && (
          <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
            Maximum 5 competitors reached. Remove one to add another.
          </p>
        )}

        {competitors.length === 0 ? (
          <EmptyState
            title="Add competitor Instagram handles to monitor"
            description="Track up to 5 accounts. VisualFlow checks them daily and uses their hashtags and content formats to improve your captions."
            icon={<Users className="h-6 w-6" />}
          />
        ) : (
          <div className="space-y-3">
            {competitors.map(c => (
              <Card key={c.id} padding="md">
                <div className="flex items-start gap-3">
                  <div className="h-10 w-10 rounded-full bg-surface-100 flex items-center justify-center shrink-0 mt-0.5">
                    <Users className="h-5 w-5 text-zinc-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-zinc-800">@{c.handle}</p>
                    <p className="text-xs text-zinc-400">
                      Added {formatIST(c.createdAt, 'dd MMM yyyy')}
                    </p>
                    <StatsRow competitor={c} />
                    {c.recentHashtags && c.recentHashtags.length > 0 && (
                      <HashtagChips hashtags={c.recentHashtags} />
                    )}
                    {c.recentFormats && Object.keys(c.recentFormats).length > 0 && (
                      <FormatBar formats={c.recentFormats} />
                    )}
                  </div>
                  <button
                    onClick={() => removeCompetitor(c.id)}
                    className="p-2 text-zinc-400 hover:text-red-500 transition-colors min-h-11 min-w-11 flex items-center justify-center cursor-pointer shrink-0"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </PageWrapper>
  )
}
