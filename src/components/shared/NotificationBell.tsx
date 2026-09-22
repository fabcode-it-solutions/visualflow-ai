import { useState, useRef, useEffect, useCallback } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Bell } from 'lucide-react'
import { notificationService } from '@/services/notificationService'
import { NotificationPanel } from '@/components/notifications/NotificationPanel'
import { toast } from '@/store/notificationStore'
import type { Notification } from '@/types/post.types'

export function NotificationBell() {
  const [open, setOpen] = useState(false)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const queryClient = useQueryClient()
  const prevCountRef = useRef<number | null>(null)

  // Poll count every 60s
  const { data: countData } = useQuery({
    queryKey: ['notifications', 'count'],
    queryFn: notificationService.getCount,
    refetchInterval: 60 * 1000,
    refetchIntervalInBackground: false,
  })

  // List — only fetched when panel is open
  const { data: listData, isFetching: listFetching, refetch: fetchList } = useQuery({
    queryKey: ['notifications', 'list'],
    queryFn: notificationService.getAll,
    enabled: false,
  })

  const count = countData?.count ?? 0
  const notifications: Notification[] = listData?.notifications ?? []
  const isLoading = listFetching && !listData

  // Toast when count grows between polls
  useEffect(() => {
    if (prevCountRef.current === null) {
      prevCountRef.current = count
      return
    }
    if (count > prevCountRef.current) {
      toast.info('🔔 You have new notifications')
    }
    prevCountRef.current = count
  }, [count])

  // Close on outside click
  useEffect(() => {
    if (!open) return
    function handleOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleOutside)
    return () => document.removeEventListener('mousedown', handleOutside)
  }, [open])

  const handleBellClick = useCallback(() => {
    const next = !open
    setOpen(next)
    if (next) {
      void fetchList()
    }
  }, [open, fetchList])

  function handleClose() {
    setOpen(false)
    void queryClient.invalidateQueries({ queryKey: ['notifications'] })
  }

  return (
    <div ref={wrapperRef} className="relative">
      <button
        onClick={handleBellClick}
        aria-label="Notifications"
        className="relative inline-flex items-center justify-center w-10 h-10 rounded-xl hover:bg-surface-100 transition-colors cursor-pointer"
      >
        <Bell size={20} className="text-zinc-600" />
        {count > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-red-500 text-white rounded-full text-[10px] font-bold flex items-center justify-center">
            {count > 99 ? '99+' : count}
          </span>
        )}
      </button>

      {open && (
        <NotificationPanel notifications={notifications} isLoading={isLoading} onClose={handleClose} />
      )}
    </div>
  )
}
