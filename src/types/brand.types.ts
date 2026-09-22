import type { ContentLanguage } from './post.types'

/** Brand personality presets */
export type BrandPersonality =
  | 'professional'
  | 'casual'
  | 'luxurious'
  | 'playful'
  | 'minimalist'
  | 'bold'
  | 'traditional'
  | 'modern'

/** Brand guide / identity settings */
export interface BrandSettings {
  id: string
  shopId: string
  logoUrl: string | null
  primaryColor: string
  secondaryColor: string
  personality: BrandPersonality
  tagline: string
  description: string
  targetAudience: string
  toneOfVoice: string
  avoidTopics: string[]
  trustSignals: string[]
  createdAt: string
  updatedAt: string
}

/** Posting preferences (frequency, platforms, language) */
export interface PostingPreferences {
  id: string
  shopId: string
  postsPerDay: number
  preferredTimeSlots: TimeSlot[]
  defaultLanguage: ContentLanguage
  enabledPlatforms: EnabledPlatform[]
  autoApprove: boolean
  budgetMin: number
  budgetMax: number
  createdAt: string
  updatedAt: string
}

/** Time slot for scheduling */
export interface TimeSlot {
  hour: number
  minute: number
  label: string
}

/** Platform-specific posting settings */
export interface EnabledPlatform {
  platform: string
  enabled: boolean
  accountConnected: boolean
}

/** Festival / occasion for Indian calendar */
export interface Festival {
  id: string
  shopDomain: string
  name: string
  nameHindi: string | null
  date: string
  category: FestivalCategory
  description: string | null
  suggestedThemes: string[]
  isNational: boolean
  regions: string[]
  isEnabled: boolean
  preferredCategories: string[]
}

/** Festival categories */
export type FestivalCategory =
  | 'religious'
  | 'national'
  | 'shopping'
  | 'seasonal'
  | 'cultural'

/** DTO for updating brand settings */
export interface UpdateBrandSettingsDto {
  logoUrl?: string
  primaryColor?: string
  secondaryColor?: string
  personality?: BrandPersonality
  tagline?: string
  description?: string
  targetAudience?: string
  toneOfVoice?: string
  avoidTopics?: string[]
  trustSignals?: string[]
}

/** DTO for updating posting preferences */
export interface UpdatePostingPreferencesDto {
  postsPerDay?: number
  preferredTimeSlots?: TimeSlot[]
  defaultLanguage?: ContentLanguage
  enabledPlatforms?: EnabledPlatform[]
  autoApprove?: boolean
  budgetMin?: number
  budgetMax?: number
}

/** Complete onboarding payload sent after all steps */
export interface OnboardingPayload {
  brand: UpdateBrandSettingsDto
  preferences: UpdatePostingPreferencesDto
  selectedFestivals: string[]
  socialConnections: string[]
}
