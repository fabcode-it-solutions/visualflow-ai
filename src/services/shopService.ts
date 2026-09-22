import api from './api';

export interface Shop {
  id: string;
  shopDomain: string;
  shopName?: string;
  isOnboarded?: boolean;
  onboardingStep?: number;
  isGlobalPaused?: boolean;
  currency?: string;
  timezone?: string;
  facebookConnected?: boolean;
  facebookPageName?: string | null;
  instagramConnected?: boolean;
  instagramUsername?: string | null;
}

export interface OnboardingDataResponse {
  onboardingStep: number;
  brand: {
    brandName: string;
    logoUrl?: string;
    websiteUrl?: string;
    primaryColor: string;
    secondaryColor: string;
    accentColor: string;
    backgroundColor: string;
    headingFont: string;
    bodyFont: string;
    brandPersonality: string;
    photoStyle: string;
    referenceImages: string[];
    trustSignals?: string[];
  } | null;
  preferences: {
    postsPerDay: number;
    postingTimes: string[];
    language: string;
    budgetMin: number;
    budgetMax: number;
    autoApprove: boolean;
    inventoryThreshold: number;
    smartTiming: boolean;
    smartTimingLastCalibrated: string | null;
    smartTimingPostingTimes: string[] | null;
    selectedFestivalIds: string[];
    contentGenerationTime: string;
    notificationTime: string;
    hashtagBlacklist: string[] | null;
    bannedWords: string[] | null;
    maxEmojiCount: number | null;
    requiredDisclaimers: Record<string, string> | null;
    quietHoursStart: string;
    quietHoursEnd: string;
    monthlyAdBudgetCap: number | null;
    perProductAdLimit: number | null;
    notifyOnPublish: boolean;
    notifyOnHold: boolean;
    notifyOnAdPause: boolean;
    notifyOnWeeklyReport: boolean;
    notifyOnContentGenerated: boolean;
    emailDigest: boolean;
  } | null;
  social: {
    facebookConnected: boolean;
    facebookPageName: string | null;
    instagramConnected: boolean;
    instagramUsername: string | null;
    facebookAdAccountId: string | null;
    facebookAdAccountName: string | null;
  };
}

export const shopService = {
  getShop: async (): Promise<Shop> => {
    const response = await api.get<Shop>('/shop/status');
    return response.data;
  },

  getOnboardingData: async (): Promise<OnboardingDataResponse> => {
    const response = await api.get<OnboardingDataResponse>('/shop/onboarding-data');
    return response.data;
  },

  saveOnboardingStep: async (step: number): Promise<void> => {
    await api.patch('/shop/onboarding-step', { step });
  },

  saveBrandSettings: async (data: {
    brandName?: string;
    logoUrl?: string;
    websiteUrl?: string;
    primaryColor: string;
    secondaryColor: string;
    accentColor: string;
    backgroundColor: string;
    headingFont: string;
    bodyFont: string;
    brandPersonality: string;
    photoStyle: string;
    referenceImages: string[];
    trustSignals?: string[];
  }) => {
    const response = await api.post<unknown>('/brand', data);
    return response.data;
  },

  savePreferences: async (data: {
    postsPerDay: number;
    postingTimes: string[];
    language: string;
    budgetMin: number;
    budgetMax: number;
    autoApprove: boolean;
    inventoryThreshold: number;
    smartTiming: boolean;
    contentGenerationTime?: string;
    notificationTime?: string;
    hashtagBlacklist?: string[];
    bannedWords?: string[];
    maxEmojiCount?: number;
    requiredDisclaimers?: Record<string, string>;
    quietHoursStart?: string;
    quietHoursEnd?: string;
    monthlyAdBudgetCap?: number | null;
    perProductAdLimit?: number | null;
    notifyOnPublish?: boolean;
    notifyOnHold?: boolean;
    notifyOnAdPause?: boolean;
    notifyOnWeeklyReport?: boolean;
    notifyOnContentGenerated?: boolean;
    emailDigest?: boolean;
  }) => {
    const response = await api.post<unknown>('/preferences', data);
    return response.data;
  },

  saveFestivals: async (data: { selectedFestivals: string[] }) => {
    const response = await api.post<unknown>('/festivals/select', {
      selectedIds: data.selectedFestivals,
    });
    return response.data;
  },

  completeOnboarding: async () => {
    const response = await api.patch<unknown>('/shop/complete-onboarding', {});
    return response.data;
  },

  pauseShop: async (isPaused: boolean): Promise<void> => {
    await api.patch('/shop/pause', { isPaused });
  },

  resetOnboarding: async (): Promise<void> => {
    await api.patch('/shop/reset-onboarding', {});
  },

  disconnectSocial: async (): Promise<void> => {
    await api.delete('/shop/social/disconnect');
  },
};
