import { useEffect, useState, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import api from "@/services/api";
import { useShopStore } from "@/store/shopStore";
import { Button } from "@/components/ui/Button";
import { CheckCircle2, Info, AlertCircle, ExternalLink } from "lucide-react";
import { motion } from "framer-motion";
import { useToast } from "@/hooks/useToast";
import type { OnboardingData } from "../Onboarding";

interface SocialStatus {
  facebookConnected: boolean;
  facebookPageName?: string;
  instagramConnected: boolean;
  instagramUsername?: string;
  facebookAdAccountId?: string;
  facebookAdAccountName?: string;
  connectedAt?: string;
}

interface Props {
  data: OnboardingData;
  updateData: (updates: Partial<OnboardingData>) => void;
  errors?: {
    facebookError?: string | null;
  };
}

export default function Step2SocialConnect({
  data,
  updateData,
  errors = {},
}: Props) {
  const [searchParams] = useSearchParams();
  const { showToast } = useToast();
  const shopDomain = useShopStore((state) => state.shop?.shopDomain);
  const [initError, setInitError] = useState<string | null>(null);
  const toastShownRef = useRef(false);

  const { data: socialStatus, refetch: refetchStatus } = useQuery({
    queryKey: ["socialStatus"],
    queryFn: async () => {
      const response = await api.get<{ success: boolean; data: SocialStatus }>(
        "/auth/social/status",
      );
      return response.data.data;
    },
  });

  useEffect(() => {
    const socialParam = searchParams.get("social");
    if (socialParam === "connected" && !toastShownRef.current) {
      toastShownRef.current = true;
      showToast("Facebook account connected successfully!", "success");
      void refetchStatus().then((result) => {
        updateData({
          facebookConnected: result.data?.facebookConnected ?? true,
          instagramConnected: result.data?.instagramConnected ?? false,
        });
      });
      window.history.replaceState({}, "", window.location.pathname + "?step=2");
    } else if (socialParam === "error" && !toastShownRef.current) {
      toastShownRef.current = true;
      showToast("Failed to connect Facebook account", "error");
      window.history.replaceState({}, "", window.location.pathname + "?step=2");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const isFacebookConnected = data.facebookConnected || !!socialStatus?.facebookConnected;
  const isInstagramConnected = data.instagramConnected || !!socialStatus?.instagramConnected;
  const hasAdAccount = !!socialStatus?.facebookAdAccountId;

  const connectFacebook = () => {
    if (!shopDomain) {
      setInitError(
        "Unable to connect: Shop information not loaded. Please refresh the page.",
      );
      return;
    }
    setInitError(null);
    const appUrl =
      import.meta.env.VITE_APP_URL ||
      "https://skipping-subsystem-unfunded.ngrok-free.dev";
    const url = `${appUrl}/api/auth/facebook?shop=${encodeURIComponent(shopDomain)}`;
    window.open(url, "_blank");
  };

  return (
    <div className="space-y-8 md:space-y-10">
      {/* Header */}
      <div>
        <div className="text-4xl mb-3">📱</div>
        <h2 className="font-display font-bold text-2xl md:text-3xl text-zinc-900 mb-2">
          Connect your social accounts
        </h2>
        <p className="text-base text-zinc-600">
          Required to publish content automatically
        </p>
      </div>

      {/* Facebook Card */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className={`rounded-2xl p-6 md:p-8 border-2 transition-colors ${
          isFacebookConnected
            ? "bg-linear-to-br from-emerald-50 to-emerald-50/50 border-emerald-100"
            : "bg-linear-to-br from-blue-50 to-blue-50/50 border-blue-100"
        }`}
      >
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div
              className={`w-14 h-14 rounded-xl flex items-center justify-center shadow-sm border ${
                isFacebookConnected
                  ? "bg-emerald-100 border-emerald-200"
                  : "bg-white border-blue-100"
              }`}
            >
              {isFacebookConnected ? (
                <CheckCircle2 className="w-6 h-6 text-emerald-600" />
              ) : (
                <span className="text-2xl font-bold text-blue-600">f</span>
              )}
            </div>
            <div>
              <h3 className="font-semibold text-zinc-900">Facebook Pages</h3>
              {isFacebookConnected ? (
                <p className="text-sm text-emerald-600 mt-1 font-medium">
                  {socialStatus?.facebookPageName
                    ? `✓ ${socialStatus.facebookPageName}`
                    : "Connected"}
                </p>
              ) : (
                <p className="text-sm text-zinc-600 mt-1">
                  Post to your business pages
                </p>
              )}
            </div>
          </div>
          <motion.div whileTap={{ scale: 0.97 }}>
            <Button
              variant={isFacebookConnected ? "secondary" : "primary"}
              size="lg"
              onClick={connectFacebook}
            >
              {isFacebookConnected ? "Reconnect" : "Connect"}
            </Button>
          </motion.div>
        </div>
      </motion.div>

      {/* Facebook Error */}
      {(initError || errors?.facebookError) && (
        <p className="text-xs text-red-600 flex items-center gap-1">
          <AlertCircle className="w-3 h-3 shrink-0" />
          {initError || errors?.facebookError}
        </p>
      )}

      {/* Instagram Card */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className={`rounded-2xl p-6 md:p-8 border-2 transition-colors ${
          isInstagramConnected
            ? "bg-linear-to-br from-emerald-50 to-emerald-50/50 border-emerald-100"
            : isFacebookConnected
              ? "bg-linear-to-br from-pink-50 to-pink-50/50 border-pink-100"
              : "bg-linear-to-br from-zinc-50 to-zinc-50/50 border-zinc-100"
        }`}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <div
              className={`w-14 h-14 rounded-xl flex items-center justify-center shadow-sm border shrink-0 ${
                isInstagramConnected
                  ? "bg-emerald-100 border-emerald-200"
                  : isFacebookConnected
                    ? "bg-white border-pink-100"
                    : "bg-white border-zinc-100"
              }`}
            >
              {isInstagramConnected ? (
                <CheckCircle2 className="w-6 h-6 text-emerald-600" />
              ) : (
                <span className="text-2xl">📷</span>
              )}
            </div>
            <div>
              <h3 className="font-semibold text-zinc-900">
                Instagram Business
              </h3>
              {isInstagramConnected ? (
                <p className="text-sm text-emerald-600 mt-1 font-medium">
                  {socialStatus?.instagramUsername
                    ? `✓ @${socialStatus.instagramUsername}`
                    : "Connected"}
                </p>
              ) : isFacebookConnected ? (
                <div className="mt-1">
                  <p className="text-sm text-zinc-600">
                    No Instagram Business Account found.
                  </p>
                  <a
                    href="https://business.facebook.com/settings/instagram-accounts"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-pink-600 hover:text-pink-700 font-medium mt-1"
                  >
                    Link Instagram to your Facebook Page
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              ) : (
                <p className="text-sm text-zinc-500 mt-1">
                  Connect Facebook first
                </p>
              )}
            </div>
          </div>
          <span className={`text-xs font-semibold px-2 py-1 rounded-full shrink-0 mt-1 ${
            isInstagramConnected
              ? "bg-emerald-100 text-emerald-700"
              : isFacebookConnected
                ? "bg-pink-100 text-pink-700"
                : "bg-zinc-100 text-zinc-500"
          }`}>
            {isInstagramConnected ? "Linked" : isFacebookConnected ? "Via Facebook" : "Locked"}
          </span>
        </div>
      </motion.div>

      {/* Ads Account Card */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className={`rounded-2xl p-6 md:p-8 border-2 transition-colors ${
          hasAdAccount
            ? "bg-linear-to-br from-emerald-50 to-emerald-50/50 border-emerald-100"
            : isFacebookConnected
              ? "bg-linear-to-br from-amber-50 to-amber-50/50 border-amber-100"
              : "bg-linear-to-br from-zinc-50 to-zinc-50/50 border-zinc-100"
        }`}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <div
              className={`w-14 h-14 rounded-xl flex items-center justify-center shadow-sm border shrink-0 ${
                hasAdAccount
                  ? "bg-emerald-100 border-emerald-200"
                  : isFacebookConnected
                    ? "bg-white border-amber-100"
                    : "bg-white border-zinc-100"
              }`}
            >
              {hasAdAccount ? (
                <CheckCircle2 className="w-6 h-6 text-emerald-600" />
              ) : (
                <span className="text-2xl">💰</span>
              )}
            </div>
            <div>
              <h3 className="font-semibold text-zinc-900">Facebook Ads</h3>
              {hasAdAccount ? (
                <p className="text-sm text-emerald-600 mt-1 font-medium">
                  {socialStatus?.facebookAdAccountName
                    ? `✓ ${socialStatus.facebookAdAccountName}`
                    : "Ad account connected"}
                </p>
              ) : isFacebookConnected ? (
                <div className="mt-1">
                  <p className="text-sm text-zinc-600">
                    No ad account found on this Facebook profile.
                  </p>
                  <a
                    href="https://business.facebook.com/adsmanager"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-amber-600 hover:text-amber-700 font-medium mt-1"
                  >
                    Create an ad account in Facebook Business Manager
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              ) : (
                <p className="text-sm text-zinc-500 mt-1">
                  Connect Facebook first
                </p>
              )}
            </div>
          </div>
          <span className={`text-xs font-semibold px-2 py-1 rounded-full shrink-0 mt-1 ${
            hasAdAccount
              ? "bg-emerald-100 text-emerald-700"
              : isFacebookConnected
                ? "bg-amber-100 text-amber-700"
                : "bg-zinc-100 text-zinc-500"
          }`}>
            {hasAdAccount ? "Connected" : isFacebookConnected ? "Optional" : "Locked"}
          </span>
        </div>
      </motion.div>

      {/* Info Box */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-blue-50 border border-blue-200 rounded-2xl p-4 md:p-6 flex gap-4"
      >
        <Info className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-blue-900 mb-1">
            We only publish content
          </p>
          <p className="text-sm text-blue-700">
            We never read your messages or access personal data. We only get
            permissions to publish posts and run ads on your behalf.
          </p>
        </div>
      </motion.div>

      {/* Permission Details */}
      <div className="bg-zinc-50 rounded-2xl p-6 md:p-8 border border-zinc-100">
        <h3 className="font-semibold text-zinc-900 mb-4">What we need</h3>
        <div className="space-y-3">
          {[
            "Publish posts on Facebook Pages",
            "Access Instagram Business account",
            "Schedule posts for future dates",
            "Create and manage Facebook ad campaigns",
          ].map((item, i) => (
            <div key={i} className="flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              <p className="text-sm text-zinc-700">{item}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
