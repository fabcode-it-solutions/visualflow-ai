import api from './api'
import type { Notification } from '../types/post.types'

interface NotificationsResponse {
  notifications: Notification[]
  unreadCount: number
}

interface CountResponse {
  count: number
}

interface MarkedResponse {
  marked: boolean
}

export const notificationService = {
  getAll: async (): Promise<NotificationsResponse> => {
    const res = await api.get<NotificationsResponse>('/notifications')
    return res.data
  },
  getCount: async (): Promise<CountResponse> => {
    const res = await api.get<CountResponse>('/notifications/count')
    return res.data
  },
  markAllRead: async (): Promise<void> => {
    await api.patch<MarkedResponse>('/notifications/mark-all-read')
  },
  markOneRead: async (id: string): Promise<void> => {
    await api.patch<MarkedResponse>(`/notifications/${id}/read`)
  },
}
