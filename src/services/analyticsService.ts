import api from './api'
import type { Post } from '@/types/post.types'

export interface PostAnalyticsData {
  reach: number
  likes: number
  comments: number
  shares: number
  saves: number
  impressions: number
  revenueAttributed: number
  ordersAttributed: number
}

export interface PostWithEngagement extends Post {
  analytics: PostAnalyticsData
}

export interface AnalyticsOverview {
  totalReach: number
  totalImpressions: number
  totalLikes: number
  totalComments: number
  totalShares: number
  totalSaves: number
  totalEngagement: number
  totalClicks: number
  totalRevenue: number
  totalOrdersAttributed: number
  roas: number
  postsPublished: number
  topPosts: PostWithEngagement[]
  lastFetchedAt: string | null
}

export interface DailyPoint {
  date: string
  reach: number
  clicks: number
  engagement: number
}

export interface YesterdayData {
  reach: number
  engagement: number
  clicks: number
  revenue: number
}

export interface ProductAnalyticsRow {
  productId: string
  productTitle: string
  productImage: string | null
  postCount: number
  totalReach: number
  totalLikes: number
  totalComments: number
  totalShares: number
  totalEngagement: number
  totalRevenue: number
  igLikes: number
  igComments: number
  igShares: number
  igReach: number
  fbLikes: number
  fbComments: number
  fbShares: number
  fbReach: number
}

export interface ContentTypeRow {
  postType: string
  postCount: number
  avgReach: number
  avgEngagement: number
  avgClicks: number
}

export interface HourPoint  { hour: number; avgReach: number; avgEngagement: number; postCount: number }
export interface DayPoint2  { dayOfWeek: number; dayName: string; avgReach: number; avgEngagement: number; postCount: number }
export interface TimeOfDayData { byHour: HourPoint[]; byDay: DayPoint2[] }

export interface WeeklyReport {
  weekStart: string
  weekEnd: string
  totalReach: number
  totalImpressions: number
  totalLikes: number
  totalComments: number
  totalShares: number
  totalSaves: number
  totalEngagement: number
  totalClicks: number
  totalRevenue: number
  postsPublished: number
  bestPost: PostWithEngagement | null
  worstPost: PostWithEngagement | null
}

export interface MonthlyReport {
  year: number
  month: number
  totalReach: number
  totalImpressions: number
  totalLikes: number
  totalComments: number
  totalShares: number
  totalSaves: number
  totalEngagement: number
  totalClicks: number
  totalRevenue: number
  postsPublished: number
  topPosts: PostWithEngagement[]
  prev: {
    totalReach: number; totalEngagement: number; totalClicks: number
    totalRevenue: number; postsPublished: number
  }
}

export const analyticsService = {
  getOverview: (range: string) =>
    api.get<AnalyticsOverview>('/analytics/overview', { params: { range } }),

  getByProduct: (range: string) =>
    api.get<ProductAnalyticsRow[]>('/analytics/by-product', { params: { range } }),

  getByContentType: (range: string) =>
    api.get<ContentTypeRow[]>('/analytics/by-type', { params: { range } }),

  getByTime: (range: string) =>
    api.get<TimeOfDayData>('/analytics/by-time', { params: { range } }),

  getWeeklyReport: (weekStart: string) =>
    api.get<WeeklyReport>('/analytics/reports/weekly', { params: { week: weekStart } }),

  getMonthlyReport: (month: string) =>
    api.get<MonthlyReport>('/analytics/reports/monthly', { params: { month } }),

  getDailySeries: (range: string) =>
    api.get<DailyPoint[]>('/analytics/posts', { params: { range } }),

  refreshAnalytics: () =>
    api.post<AnalyticsOverview>('/analytics/refresh'),

  getYesterday: () =>
    api.get<YesterdayData>('/analytics/yesterday'),

  getRecommendations: (month: string) =>
    api.get<{ recommendations: string[]; year: number; month: number }>(
      '/analytics/reports/recommendations',
      { params: { month } },
    ),

  trackEvent: (event: { eventName: string; payload?: Record<string, unknown> }): Promise<void> =>
    api.post('/analytics/track', event).then(() => undefined).catch(() => undefined),
}
