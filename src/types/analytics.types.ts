import type { SocialPlatform } from './shop.types'
import type { PostContentType } from './post.types'

/** Dashboard overview stats */
export interface DashboardStats {
  totalPosts: number
  postsThisWeek: number
  pendingApproval: number
  totalEngagement: number
  engagementRate: number
  topPlatform: SocialPlatform | null
  postsChange: number
  engagementChange: number
}

/** Single data point for time-series charts */
export interface TimeSeriesPoint {
  date: string
  value: number
}

/** Engagement metrics for a single post */
export interface PostEngagement {
  postId: string
  likes: number
  comments: number
  shares: number
  saves: number
  impressions: number
  reach: number
  engagementRate: number
  clicks: number
}

/** Platform-level analytics summary */
export interface PlatformAnalytics {
  platform: SocialPlatform
  totalPosts: number
  totalEngagement: number
  avgEngagementRate: number
  topPostId: string | null
  followers: number
  followersChange: number
}

/** Content type performance */
export interface ContentTypePerformance {
  contentType: PostContentType
  totalPosts: number
  avgEngagement: number
  avgReach: number
  bestPerformingPostId: string | null
}

/** Analytics date range presets */
export type AnalyticsDateRange =
  | '7d'
  | '30d'
  | '90d'
  | 'custom'

/** Full analytics dashboard response */
export interface AnalyticsDashboard {
  stats: DashboardStats
  engagementTimeSeries: TimeSeriesPoint[]
  reachTimeSeries: TimeSeriesPoint[]
  platformBreakdown: PlatformAnalytics[]
  contentTypeBreakdown: ContentTypePerformance[]
  topPosts: Array<{
    postId: string
    caption: string
    imageUrl: string
    platform: SocialPlatform
    engagement: number
    publishedAt: string
  }>
}

/** Competitor info for monitor page */
export interface Competitor {
  id: string
  handle: string
  lastCheckedAt: string | null
  postFrequency: number | null
  avgEngagement: number | null
  recentHashtags: string[] | null
  recentFormats: Record<string, number> | null
  notes: string | null
  createdAt: string
}

/** Report export request */
export interface ReportRequest {
  type: 'engagement' | 'content' | 'platform' | 'competitor'
  dateRange: { startDate: string; endDate: string }
  format: 'pdf' | 'csv'
  platforms?: SocialPlatform[]
}

/** Report export response */
export interface ReportResponse {
  id: string
  status: 'pending' | 'processing' | 'ready' | 'failed'
  downloadUrl: string | null
  createdAt: string
}

/** Ad campaign info */
export interface AdCampaign {
  id: string
  postId: string
  platform: SocialPlatform
  status: 'draft' | 'active' | 'paused' | 'completed'
  budgetINR: number
  spentINR: number
  impressions: number
  clicks: number
  conversions: number
  cpc: number
  startDate: string
  endDate: string | null
  createdAt: string
}

/** Activity log entry */
export interface ActivityLogEntry {
  id: string
  action: string
  description: string
  entityType: 'post' | 'product' | 'brand' | 'ad' | 'system'
  entityId: string | null
  createdAt: string
}
