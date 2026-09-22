import { z } from 'zod'

// ─── Brand Settings Schema ──────────────────────────────────────

export const brandSettingsSchema = z.object({
  logoUrl: z.string().url('Please upload a valid logo').or(z.literal('')).optional(),
  primaryColor: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, 'Must be a valid hex color (e.g. #7C3AED)'),
  secondaryColor: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, 'Must be a valid hex color')
    .optional()
    .or(z.literal('')),
  personality: z.enum([
    'professional',
    'casual',
    'luxurious',
    'playful',
    'minimalist',
    'bold',
    'traditional',
    'modern',
  ]),
  tagline: z.string().max(120, 'Tagline must be 120 characters or less').optional().or(z.literal('')),
  description: z
    .string()
    .min(10, 'Description must be at least 10 characters')
    .max(500, 'Description must be 500 characters or less'),
  targetAudience: z
    .string()
    .min(5, 'Describe your target audience')
    .max(300, 'Keep it under 300 characters'),
  toneOfVoice: z.string().min(3, 'Describe your tone of voice').max(200),
  avoidTopics: z.array(z.string()).optional().default([]),
  trustSignals: z.array(z.string()).optional().default([]),
})

export type BrandSettingsFormData = z.infer<typeof brandSettingsSchema>

// ─── Posting Preferences Schema ─────────────────────────────────

const postingPreferencesBaseSchema = z.object({
  postsPerDay: z
    .number({ error: 'Required' })
    .int()
    .min(1, 'Minimum 1 post per day')
    .max(10, 'Maximum 10 posts per day'),
  defaultLanguage: z.enum(['english', 'hindi', 'bilingual']),
  autoApprove: z.boolean().default(false),
  budgetMin: z
    .number({ error: 'Required' })
    .min(0, 'Budget cannot be negative'),
  budgetMax: z
    .number({ error: 'Required' })
    .min(0, 'Budget cannot be negative'),
})

export const postingPreferencesSchema = postingPreferencesBaseSchema.refine(
  (data) => data.budgetMax >= data.budgetMin,
  {
    message: 'Maximum budget must be greater than or equal to minimum',
    path: ['budgetMax'],
  },
)

export type PostingPreferencesFormData = z.infer<typeof postingPreferencesSchema>

// ─── Onboarding Schema (multi-step combined) ────────────────────

export const onboardingStep1Schema = z.object({
  logoUrl: z.string().optional().or(z.literal('')),
  primaryColor: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, 'Pick a valid brand color'),
  personality: z.enum([
    'professional',
    'casual',
    'luxurious',
    'playful',
    'minimalist',
    'bold',
    'traditional',
    'modern',
  ]),
  description: z
    .string()
    .min(10, 'Tell us about your brand (at least 10 characters)')
    .max(500),
  targetAudience: z.string().min(5, 'Describe your target audience').max(300),
  toneOfVoice: z.string().min(3).max(200),
})

export const onboardingStep2Schema = z.object({
  connectedPlatforms: z
    .array(z.enum(['instagram', 'facebook', 'whatsapp', 'pinterest']))
    .min(1, 'Connect at least one platform'),
})

export const onboardingStep3Schema = z.object({
  postsPerDay: z.number().int().min(1).max(10),
  defaultLanguage: z.enum(['english', 'hindi', 'bilingual']),
  budgetMin: z.number().min(0),
  budgetMax: z.number().min(0),
})

export const onboardingStep4Schema = z.object({
  selectedFestivals: z.array(z.string()).default([]),
})

export const onboardingSchema = onboardingStep1Schema
  .merge(onboardingStep2Schema)
  .merge(onboardingStep3Schema)
  .merge(onboardingStep4Schema)

export type OnboardingFormData = z.infer<typeof onboardingSchema>
export type OnboardingStep1Data = z.infer<typeof onboardingStep1Schema>
export type OnboardingStep2Data = z.infer<typeof onboardingStep2Schema>
export type OnboardingStep3Data = z.infer<typeof onboardingStep3Schema>
export type OnboardingStep4Data = z.infer<typeof onboardingStep4Schema>

// ─── Post Edit Schema ───────────────────────────────────────────

export const postEditSchema = z.object({
  caption: z
    .string()
    .min(10, 'Caption must be at least 10 characters')
    .max(2200, 'Caption must be 2200 characters or less'),
  hashtags: z
    .array(z.string())
    .max(30, 'Maximum 30 hashtags'),
  scheduledAt: z.string().optional().or(z.literal('')),
  language: z.enum(['english', 'hindi', 'bilingual']),
})

export type PostEditFormData = z.infer<typeof postEditSchema>

// ─── Settings Schema ────────────────────────────────────────────

export const settingsSchema = brandSettingsSchema.merge(
  postingPreferencesBaseSchema,
)

export type SettingsFormData = z.infer<typeof settingsSchema>
