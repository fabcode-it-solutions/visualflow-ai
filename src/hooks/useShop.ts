import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { shopService } from "../services/shopService";
import { useShopStore } from "../store/shopStore";
import { isTokenGetterReady } from "@/services/api";

export function useShop() {
  const setShop = useShopStore((state) => state.setShop);
  const setPreferredLanguage = useShopStore((state) => state.setPreferredLanguage);

  const tokenReady = isTokenGetterReady();

  const { data, isLoading, error } = useQuery({
    queryKey: ["shop", "status"],
    queryFn: shopService.getShop,
    retry: 3,
    retryDelay: 1000,
    staleTime: 5 * 60 * 1000,
    enabled: tokenReady,
  });

  const { data: onboardingData } = useQuery({
    queryKey: ["shop", "onboarding-data"],
    queryFn: shopService.getOnboardingData,
    staleTime: 5 * 60 * 1000,
    enabled: tokenReady,
  });

  useEffect(() => {
    if (data) {
      setShop({
        id: data.id,
        shopDomain: data.shopDomain,
        shopName: data.shopName,
        isOnboarded: data.isOnboarded ?? false,
        onboardingStep: typeof data.onboardingStep === 'string' ? Number(data.onboardingStep) : (data.onboardingStep ?? 0),
        isGlobalPaused: data.isGlobalPaused ?? false,
        currency: data.currency,
        timezone: data.timezone,
        facebookConnected: data.facebookConnected ?? false,
        facebookPageName: data.facebookPageName ?? null,
        instagramConnected: data.instagramConnected ?? false,
        instagramUsername: data.instagramUsername ?? null,
      });
    }
  }, [data, setShop]);

  useEffect(() => {
    const lang = onboardingData?.preferences?.language;
    if (lang === 'hindi' || lang === 'bilingual') {
      setPreferredLanguage(lang);
    } else {
      setPreferredLanguage('english');
    }
  }, [onboardingData, setPreferredLanguage]);

  return { isLoading, error, shop: data };
}

