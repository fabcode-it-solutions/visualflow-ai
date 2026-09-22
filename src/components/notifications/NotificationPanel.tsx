import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { cn } from '@utils/cn'
import { notificationService } from '@/services/notificationService'
import { useQueryClient } from '@tanstack/react-query'
import { CheckCheck } from 'lucide-react'
import type { Notification } from '@/types/post.types'

interface Props {
  notifications: Notification[]
  isLoading?: boolean
  onClose: () => void
}

type IconConfig = { emoji: string; bg: string }

const TYPE_ICON: Record<string, IconConfig> = {
  post_published:        { emoji: '✅', bg: 'bg-emerald-100' },
  post_held_inventory:   { emoji: '⚠️', bg: 'bg-amber-100' },
  ad_paused_high_cpc:    { emoji: '🚨', bg: 'bg-red-100' },
  morning_approval:      { emoji: '📋', bg: 'bg-brand-100' },
  ad_budget_increased:   { emoji: '📈', bg: 'bg-emerald-100' },
  ad_launched:           { emoji: '🚀', bg: 'bg-brand-100' },
  post_failed:           { emoji: '❌', bg: 'bg-red-100' },
  weekly_report:         { emoji: '📊', bg: 'bg-zinc-100' },
  smart_timing_updated:  { emoji: '🕐', bg: 'bg-zinc-100' },
  product_synced:        { emoji: '🔄', bg: 'bg-zinc-100' },
  instagram_connected:   { emoji: '📸', bg: 'bg-zinc-100' },
  low_inventory_warning: { emoji: '📦', bg: 'bg-amber-100' },
}

const DEFAULT_ICON: IconConfig = { emoji: '🔔', bg: 'bg-zinc-100' }

const TYPE_PATH: Record<string, string> = {
  post_published:        '/approval?tab=published',
  post_failed:           '/approval?tab=published',
  post_held_inventory:   '/approval?tab=held',
  morning_approval:      '/approval',
  ad_paused_high_cpc:    '/ads',
  ad_budget_increased:   '/ads',
  ad_launched:           '/ads',
  weekly_report:         '/analytics?tab=reports',
  smart_timing_updated:  '/settings',
  product_synced:        '/products',
  instagram_connected:   '/',
  low_inventory_warning: '/products',
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

export function NotificationPanel({ notifications, isLoading, onClose }: Props) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [markingAll, setMarkingAll] = useState(false)
  const [justMarked, setJustMarked] = useState(false)

  const unreadCount = notifications.filter(n => !n.isRead).length
  const hasUnread = unreadCount > 0

  async function handleMarkAll() {
    if (markingAll || !hasUnread) return
    setMarkingAll(true)
    try {
      await notificationService.markAllRead()
      void queryClient.invalidateQueries({ queryKey: ['notifications'] })
      setJustMarked(true)
      setTimeout(() => setJustMarked(false), 2500)
    } finally {
      setMarkingAll(false)
    }
  }

  async function handleClick(n: Notification) {
    onClose()
    try {
      await notificationService.markOneRead(n.id)
      void queryClient.invalidateQueries({ queryKey: ['notifications'] })
    } catch {
      // non-fatal
    }
    const path = TYPE_PATH[n.type] ?? '/'
    if (n.type === 'smart_timing_updated') {
      // navigate then open settings — handled by path '/settings' which triggers modal
      navigate(path)
    } else {
      navigate(path)
    }
  }

  return (
    <div className="absolute top-12 right-0 z-50 w-80 sm:w-96 max-w-[calc(100vw-12px)] bg-white rounded-2xl shadow-xl border border-surface-100 overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-surface-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <p className="text-sm font-semibold text-zinc-900">Notifications</p>
          {hasUnread && (
            <span className="text-[10px] font-bold bg-brand-100 text-brand-700 px-1.5 py-0.5 rounded-full">
              {unreadCount} new
            </span>
          )}
        </div>

        {hasUnread && (
          <button
            onClick={() => void handleMarkAll()}
            disabled={markingAll}
            className={cn(
              'flex items-center gap-1.5 text-xs font-medium transition-all cursor-pointer min-h-7 px-2 py-1 rounded-lg',
              justMarked
                ? 'text-green-600 bg-green-50'
                : 'text-brand-600 hover:text-brand-700 hover:bg-brand-50',
              markingAll && 'opacity-60 cursor-not-allowed',
            )}
          >
            <CheckCheck className={cn('w-3.5 h-3.5', markingAll && 'animate-pulse')} />
            {justMarked ? 'All caught up!' : markingAll ? 'Marking…' : 'Mark all read'}
          </button>
        )}

        {!hasUnread && !isLoading && notifications.length > 0 && (
          <span className="flex items-center gap-1 text-xs text-zinc-400">
            <CheckCheck className="w-3.5 h-3.5 text-green-500" />
            All read
          </span>
        )}
      </div>

      {/* Body */}
      <div className="max-h-96 overflow-y-auto">
        {isLoading ? (
          // Skeleton — matches notification row layout exactly
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="px-4 py-3 flex items-start gap-3 border-b border-surface-100 last:border-0">
              <div className="w-8 h-8 rounded-full bg-surface-100 animate-pulse shrink-0" />
              <div className="flex-1 space-y-2 pt-0.5">
                <div className="h-3.5 bg-surface-100 rounded animate-pulse w-3/4" />
                <div className="h-3 bg-surface-100 rounded animate-pulse w-full" />
                <div className="h-2.5 bg-surface-100 rounded animate-pulse w-1/4" />
              </div>
            </div>
          ))
        ) : notifications.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-2xl mb-2">🔔</p>
            <p className="text-sm text-zinc-400">No notifications yet</p>
          </div>
        ) : (
          notifications.map((n) => {
            const icon = TYPE_ICON[n.type] ?? DEFAULT_ICON
            return (
              <button
                key={n.id}
                onClick={() => void handleClick(n)}
                className={cn(
                  'w-full text-left px-4 py-3 flex items-start gap-3 cursor-pointer',
                  'hover:bg-surface-50 transition-colors',
                  'border-b border-surface-100 last:border-0',
                  !n.isRead && 'bg-brand-50/30 border-l-2 border-l-brand-400',
                )}
              >
                <div className={cn('w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-sm', icon.bg)}>
                  {icon.emoji}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-zinc-900 line-clamp-1">{n.title}</p>
                  <p className="text-xs text-zinc-500 line-clamp-2 mt-0.5">{n.body}</p>
                  <p className="text-xs text-zinc-400 mt-1">{timeAgo(n.createdAt)}</p>
                </div>
              </button>
            )
          })
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-surface-100 text-center">
        <button
          onClick={() => { onClose(); navigate('/activity') }}
          className="text-xs text-brand-600 hover:text-brand-700 transition-colors cursor-pointer"
        >
          View all activity →
        </button>
      </div>
    </div>
  )
}
