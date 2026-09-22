import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { PageWrapper } from '@/components/layout/PageWrapper'
import { ErrorState } from '@/components/ui/ErrorState'
import { Badge } from '@/components/ui/Badge'
import api from '@/services/api'
import { formatIST } from '@/utils/dateUtils'
import { Activity } from 'lucide-react'
import type { ActivityLogEntry } from '@/types/analytics.types'
import type { BadgeProps } from '@/components/ui/Badge'

const FILTER_OPTIONS = [
  { label: 'All', value: '' },
  { label: 'Posts', value: 'post' },
  { label: 'Ads', value: 'ad' },
  { label: 'Products', value: 'product' },
  { label: 'System', value: 'system' },
]

const entityVariant: Record<ActivityLogEntry['entityType'], BadgeProps['variant']> = {
  post: 'brand',
  product: 'info',
  brand: 'warning',
  ad: 'success',
  system: 'default',
}

export default function ActivityLog() {
  const [filter, setFilter] = useState('')
  const [page, setPage] = useState(1)

  const { data, isLoading, isFetching, isError, error, refetch } = useQuery({
    queryKey: ['activity', { filter, page }],
    queryFn: async () => {
      const res = await api.get<{ data: ActivityLogEntry[]; meta: { lastPage: number } }>(
        '/activity-logs',
        { params: { filter: filter || undefined, page } }
      )
      return res.data
    },
  })

  const entries: ActivityLogEntry[] = data?.data ?? []
  const lastPage = data?.meta?.lastPage ?? 1
  // True only on first ever load — no data yet at all
  const initialLoad = isLoading && !data

  if (isError) return (
    <ErrorState
      title="Could not load activity log"
      message={error instanceof Error ? error.message : 'Something went wrong'}
      onRetry={() => refetch()}
    />
  )

  const activeLabel = FILTER_OPTIONS.find(o => o.value === filter)?.label ?? 'All'

  return (
    <PageWrapper title="Activity Log" showBack>
      <div className="space-y-4">

        {/* Filter pills — always visible */}
        <div className="flex gap-2 flex-wrap">
          {FILTER_OPTIONS.map(opt => (
            <button
              key={opt.value}
              onClick={() => { setFilter(opt.value); setPage(1) }}
              className={`px-3 py-1.5 text-xs font-medium rounded-full border transition-colors min-h-9 cursor-pointer ${
                filter === opt.value
                  ? 'bg-brand-600 text-white border-brand-600'
                  : 'bg-white text-zinc-600 border-surface-300 hover:border-brand-300'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* Skeleton — initial load only */}
        {initialLoad && (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-start gap-3 bg-white rounded-lg border border-surface-200 p-3">
                <div className="h-5 w-16 rounded-full bg-surface-100 animate-pulse shrink-0" />
                <div className="flex-1 space-y-2 pt-0.5">
                  <div className="h-3.5 bg-surface-100 rounded animate-pulse w-2/3" />
                  <div className="h-3 bg-surface-100 rounded animate-pulse w-5/6" />
                </div>
                <div className="h-3 w-20 bg-surface-100 rounded animate-pulse shrink-0" />
              </div>
            ))}
          </div>
        )}

        {/* Filter-change shimmer — fade existing content slightly */}
        {!initialLoad && (
          <div className={`space-y-2 transition-opacity duration-150 ${isFetching ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
            {entries.length === 0 ? (
              <div className="py-14 text-center">
                <Activity className="h-8 w-8 text-zinc-200 mx-auto mb-3" />
                {filter ? (
                  <>
                    <p className="text-sm font-medium text-zinc-400 mb-1">
                      No {activeLabel.toLowerCase()} activity found
                    </p>
                    <p className="text-xs text-zinc-300">
                      Try a different filter or check back after more actions are performed.
                    </p>
                    <button
                      onClick={() => setFilter('')}
                      className="mt-4 text-xs text-brand-600 hover:text-brand-700 font-medium cursor-pointer"
                    >
                      Clear filter
                    </button>
                  </>
                ) : (
                  <>
                    <p className="text-sm font-medium text-zinc-400 mb-1">No activity yet</p>
                    <p className="text-xs text-zinc-300">All app actions will be logged here.</p>
                  </>
                )}
              </div>
            ) : (
              entries.map(entry => (
                <div key={entry.id} className="flex items-start gap-3 bg-white rounded-lg border border-surface-200 p-3">
                  <Badge variant={entityVariant[entry.entityType]}>
                    {entry.entityType}
                  </Badge>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-zinc-800">{entry.action}</p>
                    {entry.description && (
                      <p className="text-xs text-zinc-500 mt-0.5">{entry.description}</p>
                    )}
                  </div>
                  <p className="text-xs text-zinc-400 shrink-0">
                    {formatIST(entry.createdAt, 'dd MMM, hh:mm a')}
                  </p>
                </div>
              ))
            )}
          </div>
        )}

        {/* Pagination — only when not loading and has multiple pages */}
        {!initialLoad && lastPage > 1 && (
          <div className="flex items-center justify-center gap-3 pt-2">
            <button
              disabled={page === 1 || isFetching}
              onClick={() => setPage(p => p - 1)}
              className="px-3 py-2 text-sm text-zinc-600 border border-surface-300 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer min-h-11"
            >
              Previous
            </button>
            <span className="text-sm text-zinc-500">Page {page} of {lastPage}</span>
            <button
              disabled={page === lastPage || isFetching}
              onClick={() => setPage(p => p + 1)}
              className="px-3 py-2 text-sm text-zinc-600 border border-surface-300 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer min-h-11"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </PageWrapper>
  )
}
