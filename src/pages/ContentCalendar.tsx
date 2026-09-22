import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { PageWrapper } from '@/components/layout/PageWrapper'
import { CalendarSkeleton } from '@/components/skeletons/CalendarSkeleton'
import { ErrorState } from '@/components/ui/ErrorState'
import { EmptyState } from '@/components/ui/EmptyState'
import { Button } from '@/components/ui/Button'
import { PostViewModal } from '@/components/shared/PostViewModal'
import { postService } from '@/services/postService'
import { ChevronLeft, ChevronRight, CalendarDays, Clock } from 'lucide-react'
import {
  format, startOfMonth, endOfMonth, eachDayOfInterval,
  addMonths, subMonths, isToday, isBefore, startOfDay,
} from 'date-fns'
import { formatIST } from '@utils/dateUtils'
import type { Post } from '@/types/post.types'

const PLATFORM_DOT: Record<string, string> = {
  instagram: 'bg-gradient-to-br from-purple-500 to-pink-500',
  facebook:  'bg-blue-500',
  both:      'bg-gradient-to-br from-purple-500 to-blue-500',
}

const POST_TYPE_ICON: Record<string, string> = {
  feed_image: '🖼',
  carousel:   '🎠',
  story:      '📖',
  reel:       '🎬',
  ad:         '📢',
}

function postCaption(post: Post): string {
  return post.captionInstagram ?? post.captionFacebook ?? post.caption ?? ''
}

export default function ContentCalendar() {
  useEffect(() => { document.title = 'Content Calendar — VisualFlow AI' }, [])

  const [month, setMonth]           = useState(new Date())
  const [selectedPost, setSelected] = useState<Post | null>(null)
  const monthKey = format(month, 'yyyy-MM')

  const { data, isLoading, isError, error, refetch } = useQuery<Record<string, Post[]>>({
    queryKey: ['posts', 'calendar', monthKey],
    queryFn:  async () => (await postService.getCalendar(monthKey)).data,
  })

  if (isLoading) return <CalendarSkeleton />

  if (isError) return (
    <PageWrapper title="Content Calendar" showBack>
      <ErrorState
        title="Could not load calendar"
        message={error instanceof Error ? error.message : 'Something went wrong'}
        onRetry={() => refetch()}
      />
    </PageWrapper>
  )

  const calendarData = data ?? {}
  const allPosts     = Object.values(calendarData).flat()
  const days         = eachDayOfInterval({ start: startOfMonth(month), end: endOfMonth(month) })
  const postsForDay  = (day: Date): Post[] => calendarData[format(day, 'yyyy-MM-dd')] ?? []
  const today        = startOfDay(new Date())

  return (
    <PageWrapper title="Content Calendar" showBack>
      {/* Post detail modal — reuses the same premium modal from Approval Queue */}
      {selectedPost && (
        <PostViewModal
          post={selectedPost}
          open={!!selectedPost}
          onClose={() => setSelected(null)}
        />
      )}

      <div className="space-y-5">

        {/* ── Header ── */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-display font-bold text-zinc-900 text-xl">
              {format(month, 'MMMM yyyy')}
            </h2>
            <p className="text-xs text-zinc-400 mt-0.5">
              {allPosts.length === 0
                ? 'No approved posts scheduled'
                : `${allPosts.length} post${allPosts.length !== 1 ? 's' : ''} scheduled`}
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={() => setMonth(m => subMonths(m, 1))} className="min-h-11 w-11">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="secondary" size="sm" onClick={() => setMonth(new Date())} className="min-h-11 px-3 text-xs font-medium">
              Today
            </Button>
            <Button variant="secondary" size="sm" onClick={() => setMonth(m => addMonths(m, 1))} className="min-h-11 w-11">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {allPosts.length === 0 ? (
          <EmptyState
            icon={<CalendarDays className="h-10 w-10 text-zinc-300" />}
            title="No posts scheduled this month"
            description="Approve posts in the Approval Queue and they'll appear here once scheduled."
          />
        ) : (
          <>
            {/* ── Mobile: vertical list ── */}
            <div className="md:hidden space-y-3">
              {days.map(day => {
                const dayPosts = postsForDay(day)
                if (dayPosts.length === 0) return null
                const isPast = isBefore(day, today) && !isToday(day)
                return (
                  <div key={day.toISOString()}
                    className={`rounded-xl border overflow-hidden ${isToday(day) ? 'border-brand-300 shadow-sm' : 'border-surface-200'} bg-white`}
                  >
                    {/* Date header */}
                    <div className={`px-4 py-2.5 flex items-center justify-between ${isToday(day) ? 'bg-brand-50' : 'bg-surface-50'} border-b border-surface-100`}>
                      <span className={`text-sm font-semibold ${isToday(day) ? 'text-brand-600' : isPast ? 'text-zinc-400' : 'text-zinc-700'}`}>
                        {isToday(day) ? 'Today' : format(day, 'EEEE, d MMM')}
                      </span>
                      <span className="text-xs text-zinc-400 font-medium">
                        {dayPosts.length} post{dayPosts.length !== 1 ? 's' : ''}
                      </span>
                    </div>

                    {/* Post rows */}
                    <div className="divide-y divide-surface-100">
                      {dayPosts.map(post => {
                        const thumb = post.mediaUrls?.[0] ?? post.imageUrl
                        const caption = postCaption(post)
                        return (
                          <button
                            key={post.id}
                            onClick={() => setSelected(post)}
                            className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-surface-50 transition-colors min-h-15"
                          >
                            {/* Thumbnail */}
                            <div className="shrink-0 h-10 w-10 rounded-lg overflow-hidden bg-surface-100">
                              {thumb
                                ? <img src={thumb} alt="" className="h-full w-full object-cover" />
                                : <div className="h-full w-full flex items-center justify-center text-base">{POST_TYPE_ICON[post.postType ?? ''] ?? '📄'}</div>
                              }
                            </div>
                            {/* Info */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5 mb-0.5">
                                <div className={`h-2 w-2 rounded-full shrink-0 ${PLATFORM_DOT[post.platform] ?? 'bg-zinc-400'}`} />
                                <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">
                                  {post.platform} · {POST_TYPE_ICON[post.postType ?? ''] ?? ''} {post.postType?.replace('_', ' ')}
                                </span>
                              </div>
                              <p className="text-sm text-zinc-800 line-clamp-1">{caption || '(no caption)'}</p>
                            </div>
                            {/* Time */}
                            <div className="shrink-0 flex items-center gap-1 text-xs text-zinc-400">
                              <Clock className="h-3 w-3" />
                              {post.scheduledAt ? format(new Date(post.scheduledAt), 'h:mm a') : '—'}
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>

            {/* ── Desktop: 7-column grid ── */}
            <div className="hidden md:block">
              {/* Day headers */}
              <div className="grid grid-cols-7 gap-1.5 mb-1.5">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                  <div key={d} className="text-center text-xs font-semibold text-zinc-400 py-2 tracking-wide">{d}</div>
                ))}
              </div>

              {/* Calendar grid */}
              <div className="grid grid-cols-7 gap-1.5">
                {/* Leading empty cells */}
                {Array.from({ length: days[0].getDay() }).map((_, i) => (
                  <div key={`empty-${i}`} className="h-32 rounded-xl bg-surface-50/40" />
                ))}

                {days.map(day => {
                  const dayPosts = postsForDay(day)
                  const isNow    = isToday(day)
                  const isPast   = isBefore(day, today) && !isNow
                  const hasPost  = dayPosts.length > 0
                  return (
                    <div
                      key={day.toISOString()}
                      className={`h-32 rounded-xl border p-2 flex flex-col overflow-hidden transition-shadow ${
                        isNow
                          ? 'border-brand-400 bg-white shadow-sm shadow-brand-100'
                          : isPast
                            ? 'border-surface-100 bg-surface-50/60'
                            : 'border-surface-200 bg-white hover:border-surface-300'
                      }`}
                    >
                      {/* Date number */}
                      <div className="flex items-start justify-between mb-1.5">
                        <span className={`text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full ${
                          isNow ? 'bg-brand-600 text-white' : isPast ? 'text-zinc-300' : 'text-zinc-600'
                        }`}>
                          {format(day, 'd')}
                        </span>
                        {hasPost && (
                          <span className="text-[10px] font-medium text-zinc-400">
                            {dayPosts.length}
                          </span>
                        )}
                      </div>

                      {/* Post chips */}
                      <div className="flex-1 space-y-1 overflow-hidden">
                        {dayPosts.slice(0, 2).map(post => {
                          const thumb = post.mediaUrls?.[0] ?? post.imageUrl
                          return (
                            <button
                              key={post.id}
                              onClick={() => setSelected(post)}
                              className={`w-full flex items-center gap-1.5 rounded-lg px-1.5 py-1 text-left transition-colors cursor-pointer group ${
                                isPast
                                  ? 'bg-zinc-50 hover:bg-zinc-100'
                                  : 'bg-brand-50 hover:bg-brand-100'
                              }`}
                            >
                              {/* Tiny thumbnail */}
                              <div className="shrink-0 h-5 w-5 rounded overflow-hidden bg-surface-200">
                                {thumb
                                  ? <img src={thumb} alt="" className="h-full w-full object-cover" />
                                  : <span className="h-full w-full flex items-center justify-center text-[9px]">{POST_TYPE_ICON[post.postType ?? ''] ?? '📄'}</span>
                                }
                              </div>
                              <div className={`h-1.5 w-1.5 rounded-full shrink-0 ${PLATFORM_DOT[post.platform] ?? 'bg-zinc-400'}`} />
                              <span className={`text-[11px] font-medium truncate flex-1 ${isPast ? 'text-zinc-400' : 'text-brand-700'}`}>
                                {postCaption(post).slice(0, 18) || post.postType?.replace('_', ' ')}
                              </span>
                            </button>
                          )
                        })}
                        {dayPosts.length > 2 && (
                          <button
                            onClick={() => setSelected(dayPosts[2])}
                            className="w-full text-[10px] text-zinc-400 hover:text-zinc-600 px-1.5 transition-colors"
                          >
                            +{dayPosts.length - 2} more
                          </button>
                        )}
                      </div>

                      {/* Scheduled time — only if exactly 1 post */}
                      {dayPosts.length === 1 && dayPosts[0].scheduledAt && (
                        <div className="flex items-center gap-1 mt-1">
                          <Clock className={`h-2.5 w-2.5 ${isPast ? 'text-zinc-300' : 'text-zinc-400'}`} />
                          <span className={`text-[10px] ${isPast ? 'text-zinc-300' : 'text-zinc-400'}`}>
                            {formatIST(dayPosts[0].scheduledAt)}
                          </span>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>

            {/* ── Legend ── */}
            <div className="flex items-center gap-4 pt-1 flex-wrap">
              {[
                { label: 'Instagram', dot: PLATFORM_DOT.instagram },
                { label: 'Facebook',  dot: PLATFORM_DOT.facebook },
                { label: 'Both',      dot: PLATFORM_DOT.both },
              ].map(({ label, dot }) => (
                <div key={label} className="flex items-center gap-1.5">
                  <div className={`h-2.5 w-2.5 rounded-full ${dot}`} />
                  <span className="text-xs text-zinc-500">{label}</span>
                </div>
              ))}
              <span className="text-xs text-zinc-400 ml-auto">Showing approved, unpublished posts only</span>
            </div>
          </>
        )}
      </div>
    </PageWrapper>
  )
}
