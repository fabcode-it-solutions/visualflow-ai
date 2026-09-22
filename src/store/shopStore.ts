import { create } from "zustand";
import { type Shop } from "../services/shopService";

interface ShopState {
  shop: Shop | null;
  isShopOnboarded: boolean;
  onboardingStep: number;
  facebookConnected: boolean;
  facebookPageName: string | null;
  instagramConnected: boolean;
  instagramUsername: string | null;
  preferredLanguage: 'english' | 'hindi' | 'bilingual';
  setShop: (shop: Shop) => void;
  setIsShopOnboarded: (onboarded: boolean) => void;
  setOnboardingStep: (step: number) => void;
  setPreferredLanguage: (language: 'english' | 'hindi' | 'bilingual') => void;
}

export const useShopStore = create<ShopState>((set) => ({
  shop: null,
  isShopOnboarded: false,
  onboardingStep: 0,
  facebookConnected: false,
  facebookPageName: null,
  instagramConnected: false,
  instagramUsername: null,
  preferredLanguage: 'english',
  setShop: (shop) => set({
    shop,
    isShopOnboarded: shop.isOnboarded ?? false,
    onboardingStep: shop.onboardingStep ?? 0,
    facebookConnected: shop.facebookConnected ?? false,
    facebookPageName: shop.facebookPageName ?? null,
    instagramConnected: shop.instagramConnected ?? false,
    instagramUsername: shop.instagramUsername ?? null,
  }),
  setIsShopOnboarded: (onboarded) => set({ isShopOnboarded: onboarded }),
  setOnboardingStep: (step) => set({ onboardingStep: step }),
  setPreferredLanguage: (language) => set({ preferredLanguage: language }),
}));
