import api from './api';
import { Post, CreatePostDto } from '../types/post.types';
import { PaginatedResponse } from '../types/api.types';

export const postService = {
  getAll: (params?: { page?: number; limit?: number; status?: string; product_id?: string }) =>
    api.get<PaginatedResponse<Post>>('/posts', { params }),

  getById: (id: string) =>
    api.get<Post>(`/posts/${id}`),

  create: (data: CreatePostDto) =>
    api.post<Post>('/posts', data),

  approve: (id: string) =>
    api.patch<Post>(`/posts/${id}/approve`),

  skip: (id: string) =>
    api.patch<Post>(`/posts/${id}/skip`),

  delete: (id: string) =>
    api.delete<void>(`/posts/${id}`),

  restore: (id: string) =>
    api.patch<Post>(`/posts/${id}/restore`),

  update: (id: string, data: { captionInstagram?: string; captionFacebook?: string; hashtags?: string[] }) =>
    api.patch<Post>(`/posts/${id}`, data),

  getCalendar: (month: string) =>
    api.get<Record<string, Post[]>>('/posts/calendar', { params: { month } }),

  getDashboardPosts: async (): Promise<Post[]> => {
    const response = await api.get<Post[]>('/posts/dashboard');
    return response.data;
  },

  generatePosts: (data: {
    productId: string
    postTypes: string[]
    platform: string
    language?: string
    scriptOverride?: {
      captionInstagram?: string
      captionFacebook?: string
      hashtags?: string[]
      hook?: string
      angle?: string
      brandEmotionalGoal?: string
      imagePromptSuggestion?: string
      imageScript?: string
      carouselImageScripts?: string[]
      referenceImages?: string[]
      previewImageUrl?: string
      carouselPreviewUrls?: string[]
      slideCount?: number
      carouselSlides?: Array<{ headline: string; subtext: string; visual: string; cta?: string }>
    }
  }) =>
    api.post<{
      posts: Post[]
      message: string
      errors?: Array<{ postType: string; error: string }>
    }>('/posts/generate', data),

  generateScript: (data: {
    productId: string
    postType: string
    platform: string
    language?: string
    userAngle?: string
    referenceImages?: string[]
    slideCount?: number
  }, signal?: AbortSignal) =>
    api.post<{ variant: GeneratedScriptVariant; base: ScriptBase }>('/posts/generate-script', data, { signal }),

  generateVariant: (data: {
    base: ScriptBase
    variantIndex: 1 | 2
    postType: string
    platform: string
    language?: string
    userAngle?: string
  }, signal?: AbortSignal) =>
    api.post<{ variant: GeneratedScriptVariant }>('/posts/generate-variant', data, { signal }),

  retryReel: (id: string) =>
    api.post<{ post: Post; success: boolean; message: string }>(`/posts/${id}/retry-reel`),

  previewCollection: (data: {
    productIds: string[]
    collectionTitle?: string
    platform: string
    language?: string
    coverMode?: 'hero' | 'showcase'
  }, signal?: AbortSignal) =>
    api.post<{
      slides: string[]
      manifest: Array<{ index: number; role: 'cover' | 'product' | 'cta'; productId: string | null }>
      coverMode: 'hero' | 'showcase'
      captions: { instagram: string; facebook: string; hashtags: string[] }
      collectionTitle: string
      collectionHook: string
      collectionCTA: string
    }>('/posts/preview-collection', data, { signal }),

  generateCollectionPost: (data: {
    productIds: string[]
    collectionTitle?: string
    platform: string
    language?: string
    coverMode?: 'hero' | 'showcase'
    previewSlideUrls?: string[]
    captionInstagram?: string
    captionFacebook?: string
    hashtags?: string[]
    collectionHook?: string
    collectionCTA?: string
  }, signal?: AbortSignal) =>
    api.post<{ post: Post; message: string }>('/posts/generate-collection', data, { signal }),

  previewTestimonial: (data: {
    reviewText: string
    reviewerName?: string
    productId: string
    rating?: number
    platform: string
    language?: string
  }, signal?: AbortSignal) =>
    api.post<{
      imageUrl: string | null
      captions: { instagram: string; facebook: string; hashtags: string[] }
    }>('/posts/preview-testimonial', data, { signal }),

  generateTestimonialPost: (data: {
    reviewText: string
    reviewerName?: string
    productId: string
    rating?: number
    platform: string
    language?: string
    previewImageUrl?: string
    captionInstagram?: string
    captionFacebook?: string
    hashtags?: string[]
  }, signal?: AbortSignal) =>
    api.post<{ post: Post; message: string }>('/posts/generate-testimonial', data, { signal }),

  publish: (id: string, signal?: AbortSignal) =>
    api.post<Post>(`/posts/${id}/publish`, undefined, { signal }),

  regenerate: (id: string) =>
    api.post<Post>(`/posts/${id}/regenerate`),

  boost: (id: string, data: { budget?: number; durationHours?: number }) =>
    api.post<{ post: Post; campaign: unknown; message: string }>(`/posts/${id}/boost`, data),

  getWhatsappReady: () =>
    api.get<{ posts: Array<{
      id: string
      caption: string
      hashtags: string[]
      imageUrl: string
      publishedAt: string
      platform: string
      productId: string | null
      productTitle: string | null
      productUrl: string | null
    }> }>('/posts/whatsapp-ready'),

  generateWhatsappCaption: (id: string, data: { shortCaption: string }) =>
    api.post<{ whatsappCaption: string; length: number; message: string }>(
      `/posts/${id}/whatsapp-caption`,
      data
    ),

  approveAll: () =>
    api.post<{ approved: number }>('/posts/approve-all'),

  regenerateWithNote: (id: string, data: { note?: string }) =>
    api.post<{ post: Post }>(`/posts/${id}/regenerate`, data),

  swapProduct: (id: string, data: { newProductId: string }) =>
    api.patch<{ post: Post }>(`/posts/${id}/swap-product`, data),

  overrideHold: (id: string) =>
    api.patch<{ post: Post }>(`/posts/${id}/override-hold`),

  replaceHeldProduct: (id: string, data: { newProductId: string }) =>
    api.patch<{ post: Post }>(`/posts/${id}/replace-product`, data),

  retryPost: (id: string) =>
    api.patch<{ post: Post }>(`/posts/${id}/retry`),

  schedulePost: (id: string, data: { scheduledAt: string }) =>
    api.patch<Post>(`/posts/${id}/schedule`, data),

  previewImage: (data: {
    imagePromptSuggestion?: string
    hook?: string
    brandPersonality: string
    primaryColor?: string | null
    secondaryColor?: string | null
    accentColor?: string | null
    photoStyle?: string | null
    postType: string
    productImageUrl?: string | null
    productName?: string
    productCategory?: string | null
  }) =>
    api.post<{ previewUrl: string | null }>('/posts/preview-image', data),

  previewCarousel: (data: {
    productId: string
    slideCount?: number
    hook?: string | null
    angle?: string | null
    language?: string
    carouselImageScripts?: string[]
    slideTexts?: string[]
    slideSubtexts?: string[]
  }) =>
    api.post<{ slides: string[]; slideCount: number }>('/posts/preview-carousel', data),

  getBrandAlignedAngles: (productCategory: string) =>
    api.post<{ angles: string[] }>('/posts/brand-aligned-angles', { productCategory }),

  validateAngle: (angle: string) =>
    api.post<{ isValid: boolean; warning?: string }>('/posts/validate-angle', { angle }),

  improveImageScript: (data: {
    script: string
    postType: string
    brandPersonality: string
    slideIndex?: number
  }) =>
    api.post<{ improved: string }>('/posts/improve-image-script', data),
}

// Base context returned by generate-script — passed back for lazy variant calls
export interface ScriptBase {
  brandValueThread:     string
  trendContext:         string
  imagePromptSuggestion: string
  instagramHashtags:    string[]
  facebookHashtags:     string[]
  suggestedAngles:      string[]
  category:             string
  reelScript?:          unknown
  carouselSlides?:      unknown
  storyScript?:         unknown
}

export interface GeneratedScriptVariant {
  brandEmotionalGoal: string
  hook: string
  hookExplanation: string
  angle: string
  brandValueThread: string
  trendContext: string
  script: string
  captionInstagram: string
  captionFacebook: string
  instagramHashtags: string[]
  facebookHashtags: string[]
  suggestedAngles: string[]
  imagePromptSuggestion: string
  selectedHook?: string
  hooks?: string[]
  whyThisWorks?: string[]
  hashtags?: { trending: string[]; niche: string[]; brand: string[] }
  captionDraft?: string
  performanceIntent?: { primaryGoal: string; reason: string }
  reelScript?: {
    hook_visual: string
    hook_text: string
    scene2_visual: string
    scene2_text: string
    scene3_visual: string
    scene3_text: string
    cta_visual: string
    cta_text: string
    audioMood: string
    totalDuration: string
  }
  carouselSlides?: Array<{ headline: string; subtext: string; visual: string; cta?: string }>
  storyScript?: {
    format: 'new_drop' | 'scarcity' | 'fact_card' | 'social_proof' | 'cta'
    overlayLine1: string
    overlayLine2: string
    ctaSticker: string
    visualDirection: string
  }
}

