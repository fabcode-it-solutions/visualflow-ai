import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { PageWrapper } from '@/components/layout/PageWrapper'
import { ErrorState } from '@/components/ui/ErrorState'
import { EmptyState } from '@/components/ui/EmptyState'
import { Skeleton } from '@/components/ui/Skeleton'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { adService } from '@/services/adService'
import { useToast } from '@/hooks/useToast'
import { formatINR } from '@/utils/indianFormat'
import { formatIST } from '@/utils/dateUtils'
import { Pause, Play, Megaphone } from 'lucide-react'
import type { Ad } from '@/types/ad.types'

function statusVariant(status: string): 'success' | 'warning' | 'default' {
  if (status === 'active') return 'success'
  if (status === 'paused') return 'warning'
  return 'default'
}

export default function AdManager() {
  const queryClient = useQueryClient()
  const { showToast } = useToast()

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['ads'],
    queryFn: async () => {
      const res = await adService.getAll()
      return res.data as Ad[]
    },
  })

  const { mutate: togglePause } = useMutation({
    mutationFn: (id: string) => adService.togglePause(id),
    onSuccess: () => {
      showToast('Campaign updated', 'success')
      queryClient.invalidateQueries({ queryKey: ['ads'] })
    },
    onError: () => showToast('Failed to update campaign', 'error'),
  })

  if (isLoading) return (
    <PageWrapper title="Ad Manager" showBack>
      <div className="space-y-3">
        {[1, 2, 3].map(i => <Skeleton key={i} className="h-24 w-full" />)}
      </div>
    </PageWrapper>
  )

  if (isError) return (
    <ErrorState
      title="Could not load ad campaigns"
      message={error instanceof Error ? error.message : 'Something went wrong'}
      onRetry={() => refetch()}
    />
  )

  const ads: Ad[] = data ?? []

  if (ads.length === 0) return (
    <PageWrapper title="Ad Manager" showBack>
      <EmptyState
        title="No active ad campaigns"
        description="Create an ad campaign from an approved post to start running Facebook & Instagram ads."
        icon={<Megaphone className="h-6 w-6" />}
      />
    </PageWrapper>
  )

  return (
    <PageWrapper title="Ad Manager" showBack>
      <div className="space-y-3">
        {ads.map(ad => (
          <Card key={ad.id} padding="md">
            <div className="flex items-start gap-3">
              <div className="flex-1 min-w-0 space-y-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-semibold text-zinc-800">
                    Campaign {ad.id.slice(0, 8).toUpperCase()}
                  </p>
                  <Badge variant={statusVariant(ad.status)}>
                    {ad.status.charAt(0).toUpperCase() + ad.status.slice(1)}
                  </Badge>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-1">
                  <div>
                    <p className="text-xs text-zinc-400">Daily Budget</p>
                    <p className="text-sm font-medium text-zinc-800">
                      {ad.dailyBudget ? formatINR(parseFloat(ad.dailyBudget)) : '—'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-zinc-400">Total Spend</p>
                    <p className="text-sm font-medium text-zinc-800">
                      {formatINR(parseFloat(ad.totalSpend || '0'))}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-zinc-400">CPC</p>
                    <p className="text-sm font-medium text-zinc-800">
                      {ad.cpc ? formatINR(parseFloat(ad.cpc)) : '—'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-zinc-400">ROAS</p>
                    <p className="text-sm font-medium text-zinc-800">
                      {ad.roas ? `${parseFloat(ad.roas).toFixed(1)}x` : '—'}
                    </p>
                  </div>
                </div>

                <p className="text-xs text-zinc-400">
                  Started {formatIST(ad.createdAt, 'dd MMM yyyy')}
                </p>
              </div>

              <Button
                variant={ad.status === 'active' ? 'secondary' : 'primary'}
                size="sm"
                onClick={() => togglePause(ad.id)}
                className="shrink-0 min-h-11"
              >
                {ad.status === 'active'
                  ? <><Pause className="h-4 w-4 mr-1" />Pause</>
                  : <><Play className="h-4 w-4 mr-1" />Resume</>
                }
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </PageWrapper>
  )
}
