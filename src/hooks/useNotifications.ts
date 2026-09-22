import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { notificationService } from '@/services/notificationService'

export function useNotifications() {
  const queryClient = useQueryClient()

  const { data: countData } = useQuery({
    queryKey: ['notifications', 'count'],
    queryFn: notificationService.getCount,
    refetchInterval: 60 * 1000,
    refetchIntervalInBackground: false,
  })

  const { data: notificationsData, refetch } = useQuery({
    queryKey: ['notifications', 'list'],
    queryFn: notificationService.getAll,
    enabled: false,
  })

  const markAllRead = useMutation({
    mutationFn: notificationService.markAllRead,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['notifications'] })
    },
  })

  const markOneRead = useMutation({
    mutationFn: notificationService.markOneRead,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['notifications'] })
    },
  })

  return {
    count: countData?.count ?? 0,
    notifications: notificationsData?.notifications ?? [],
    refetch,
    markAllRead,
    markOneRead,
  }
}
