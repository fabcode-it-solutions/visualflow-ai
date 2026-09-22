/** Shopify shop info synced from Admin API */
export interface Shop {
  id: string
  domain: string
  name: string
  email: string
  currency: string
  timezone: string
  country: string
  plan: string
  createdAt: string
  updatedAt: string
}

/** Onboarding status tracked per-shop */
export interface OnboardingStatus {
  completed: boolean
  currentStep: number
  totalSteps: number
  completedSteps: number[]
}

/** Shop subscription / billing info */
export interface ShopSubscription {
  plan: 'free' | 'starter' | 'growth' | 'enterprise'
  status: 'active' | 'cancelled' | 'past_due' | 'trial'
  trialEndsAt: string | null
  currentPeriodEnd: string
  postsRemaining: number
  postsLimit: number
}

/** Connected social platform */
export interface SocialConnection {
  platform: SocialPlatform
  connected: boolean
  accountName: string | null
  accountId: string | null
  connectedAt: string | null
  expiresAt: string | null
  scopes: string[]
}

/** Supported social platforms */
export type SocialPlatform =
  | 'instagram'
  | 'facebook'
  | 'whatsapp'
  | 'pinterest'

/** Global pause state for all automated posting */
export interface GlobalPauseState {
  isPaused: boolean
  pausedAt: string | null
  pausedBy: string | null
  reason: string | null
  resumeAt: string | null
}

/** Shop feature flags / capabilities */
export interface ShopFeatures {
  aiGeneration: boolean
  scheduling: boolean
  analytics: boolean
  competitorMonitor: boolean
  adManager: boolean
  whatsappExport: boolean
  multiLanguage: boolean
}
