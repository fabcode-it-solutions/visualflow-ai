import api from './api'
import type { Ad } from '@/types/ad.types'

export const adService = {
  getAll: () => api.get<Ad[]>('/ads'),

  togglePause: (id: string) => api.patch<Ad>(`/ads/${id}/pause`),

  create: (data: { postId?: string; dailyBudget: number }) =>
    api.post<Ad>('/ads', data),
}
