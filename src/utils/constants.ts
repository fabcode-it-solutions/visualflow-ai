/** Application name */
export const APP_NAME = 'VisualFlow AI' as const

/** API base URL from environment */
export const API_BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3001'

/** Shopify API key from environment */
export const SHOPIFY_API_KEY = import.meta.env.VITE_SHOPIFY_API_KEY ?? ''

/** Default pagination limit */
export const DEFAULT_PAGE_SIZE = 20

/** Maximum file upload size in bytes (5MB) */
export const MAX_UPLOAD_SIZE = 5 * 1024 * 1024

/** Accepted image MIME types */
export const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const

/** Session token refresh interval in ms (50s — refresh before 60s expiry) */
export const TOKEN_REFRESH_INTERVAL = 50_000

/** React Query stale time (5 minutes) */
export const QUERY_STALE_TIME = 5 * 60 * 1000

/** React Query cache time (10 minutes) */
export const QUERY_CACHE_TIME = 10 * 60 * 1000

/** Toast duration in ms */
export const TOAST_DURATION = 4000

/** Debounce delay for search inputs in ms */
export const SEARCH_DEBOUNCE_MS = 300

/** Brand personality options for UI selectors */
export const BRAND_PERSONALITIES = [
  { value: 'professional', label: 'Professional', emoji: '💼' },
  { value: 'casual', label: 'Casual', emoji: '😊' },
  { value: 'luxurious', label: 'Luxurious', emoji: '✨' },
  { value: 'playful', label: 'Playful', emoji: '🎉' },
  { value: 'minimalist', label: 'Minimalist', emoji: '🔲' },
  { value: 'bold', label: 'Bold', emoji: '🔥' },
  { value: 'traditional', label: 'Traditional', emoji: '🪔' },
  { value: 'modern', label: 'Modern', emoji: '🚀' },
] as const

/** Content language options */
export const LANGUAGE_OPTIONS = [
  { value: 'english', label: 'English' },
  { value: 'hindi', label: 'Hindi' },
  { value: 'bilingual', label: 'Bilingual (English + Hindi)' },
] as const

/** Social platform metadata */
export const PLATFORM_META = {
  instagram: { label: 'Instagram', color: '#E4405F', icon: 'instagram' },
  facebook: { label: 'Facebook', color: '#1877F2', icon: 'facebook' },
  whatsapp: { label: 'WhatsApp', color: '#25D366', icon: 'message-circle' },
  pinterest: { label: 'Pinterest', color: '#BD081C', icon: 'pin' },
} as const

/** Post status display metadata */
export const POST_STATUS_META = {
  draft: { label: 'Draft', color: 'zinc' },
  pending_approval: { label: 'Pending', color: 'amber' },
  approved: { label: 'Approved', color: 'blue' },
  scheduled: { label: 'Scheduled', color: 'violet' },
  published: { label: 'Published', color: 'green' },
  failed: { label: 'Failed', color: 'red' },
  skipped: { label: 'Skipped', color: 'zinc' },
} as const

/** Trust signals available for Indian D2C brands */
export const TRUST_SIGNALS = [
  {
    key: 'cod' as const,
    label: 'COD Available',
    labelHindi: 'कैश ऑन डिलीवरी उपलब्ध',
    short: 'COD',
    icon: '💳',
  },
  {
    key: 'free_delivery' as const,
    label: 'Free Delivery Across India',
    labelHindi: 'पूरे भारत में मुफ्त डिलीवरी',
    short: 'Free Delivery',
    icon: '🚚',
  },
  {
    key: 'easy_returns' as const,
    label: 'Easy 7-Day Returns',
    labelHindi: '7 दिन में आसान वापसी',
    short: 'Returns',
    icon: '↩️',
  },
  {
    key: 'authentic' as const,
    label: '100% Authentic Product',
    labelHindi: '100% असली उत्पाद',
    short: 'Authentic',
    icon: '✅',
  },
  {
    key: 'made_in_india' as const,
    label: 'Made in India',
    labelHindi: 'मेड इन इंडिया',
    short: 'Made in India',
    icon: '🇮🇳',
  },
  {
    key: 'premium_quality' as const,
    label: 'Premium Quality Guaranteed',
    labelHindi: 'प्रीमियम गुणवत्ता की गारंटी',
    short: 'Premium Quality',
    icon: '⭐',
  },
] as const

/** Subscription plan details */
export const PLAN_LIMITS = {
  free: { postsPerMonth: 10, platforms: 1, label: 'Free' },
  starter: { postsPerMonth: 100, platforms: 2, label: 'Starter' },
  growth: { postsPerMonth: 500, platforms: 4, label: 'Growth' },
  enterprise: { postsPerMonth: Infinity, platforms: 4, label: 'Enterprise' },
} as const

/** Valid posting time slots (AM/PM format — single source of truth) */
export const VALID_TIME_SLOTS = [
  '8:00 AM', '9:00 AM', '10:00 AM', '11:00 AM',
  '12:00 PM', '1:00 PM', '2:00 PM', '3:00 PM',
  '4:00 PM', '5:00 PM', '6:00 PM', '7:00 PM',
  '7:30 PM', '8:00 PM', '9:00 PM',
] as const

export type TimeSlot = typeof VALID_TIME_SLOTS[number]

/** Route paths (single source of truth for navigation) */
export const ROUTES = {
  DASHBOARD: '/',
  PRODUCTS: '/products',
  APPROVAL_QUEUE: '/approval',
  CONTENT_CALENDAR: '/calendar',
  ANALYTICS: '/analytics',
  AD_MANAGER: '/ads',
  COMPETITOR_MONITOR: '/competitors',
  REPORTS: '/reports',
  SETTINGS: '/settings',
  WHATSAPP_EXPORT: '/whatsapp',
  ACTIVITY_LOG: '/activity',
  ONBOARDING: '/onboarding',
} as const
