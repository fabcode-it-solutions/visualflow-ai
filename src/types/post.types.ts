import type { SocialPlatform } from './shop.types'

/** Post status through the approval pipeline */
export type PostStatus =
  | 'draft'
  | 'pending_approval'
  | 'approved'
  | 'scheduled'
  | 'published'
  | 'failed'
  | 'skipped'
  | 'held'

/** Content type of the generated post */
export type PostContentType =
  | 'product_showcase'
  | 'festival'
  | 'offer'
  | 'testimonial'
  | 'behind_the_scenes'
  | 'educational'
  | 'trending'

/** Language mode for post captions */
export type ContentLanguage = 'english' | 'hindi' | 'bilingual'

/** A single generated social media post */
export interface Post {
  id: string
  shopId: string
  productId: string | null
  status: PostStatus
  contentType: PostContentType
  platform: SocialPlatform
  // Frontend-shaped fields (may be absent on backend responses)
  caption?: string
  hashtags?: string[]
  imageUrl?: string
  imageAltText?: string
  // Backend DB field names
  captionInstagram?: string | null
  captionFacebook?: string | null
  mediaUrls?: string[]
  postType?: string
  scheduledAt: string | null
  publishedAt: string | null
  language?: ContentLanguage
  festivalTag?: string | null
  aiPromptUsed?: string
  engagementScore?: number | null
  generationError?: string | null
  metadata?: Record<string, unknown> | null
  utmSource?: string | null
  utmMedium?: string | null
  utmCampaign?: string | null
  utmContent?: string | null
  shopifyProductUrl?: string | null
  createdAt: string
  updatedAt: string
}

/** DTO for creating a new post (manual or AI-triggered) */
export interface CreatePostDto {
  productId?: string
  contentType: PostContentType
  platform: SocialPlatform
  caption: string
  hashtags: string[]
  imageUrl: string
  imageAltText?: string
  scheduledAt?: string
  language: ContentLanguage
  festivalTag?: string
}

/** DTO for editing an existing post before approval */
export interface UpdatePostDto {
  caption?: string
  hashtags?: string[]
  imageUrl?: string
  imageAltText?: string
  scheduledAt?: string
  language?: ContentLanguage
}

/** Filters for querying posts */
export interface PostFilters {
  status?: PostStatus
  platform?: SocialPlatform
  contentType?: PostContentType
  productId?: string
  startDate?: string
  endDate?: string
  language?: ContentLanguage
}

/** AI generation request */
export interface GeneratePostRequest {
  productId: string
  platform: SocialPlatform
  contentType: PostContentType
  language: ContentLanguage
  festivalTag?: string
  customInstructions?: string
}

/** AI generation response */
export interface GeneratePostResponse {
  caption: string
  hashtags: string[]
  imageUrl: string
  imageAltText: string
  aiPromptUsed: string
}

export interface Notification {
  id: string
  shopDomain: string
  type:
    | 'post_published'
    | 'post_failed'
    | 'post_held_inventory'
    | 'ad_launched'
    | 'ad_budget_increased'
    | 'ad_paused_high_cpc'
    | 'morning_approval'
    | 'weekly_report'
    | 'smart_timing_updated'
    | 'product_synced'
    | 'instagram_connected'
    | 'low_inventory_warning'
  title: string
  body: string
  metadata: Record<string, unknown>
  isRead: boolean
  emailSent: boolean
  createdAt: string
}

/** Calendar view event */
export interface CalendarEvent {
  id: string
  title: string
  date: string
  platform: SocialPlatform
  status: PostStatus
  contentType: PostContentType
  imageUrl: string
}
