import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import { AppLayout } from "@/components/layout/AppLayout";
import { useShopStore } from "@/store/shopStore";
import { useShop } from "@/hooks/useShop";

import Dashboard from "@pages/Dashboard";
import Onboarding from "@pages/onboarding/Onboarding";
import Products from "@pages/Products";
import ApprovalQueue from "@pages/ApprovalQueue";
import ContentCalendar from "@pages/ContentCalendar";
import Analytics from "@pages/Analytics";
import PublishedPosts from "@pages/PublishedPosts";
import AdManager from "@pages/AdManager";
import CompetitorMonitor from "@pages/CompetitorMonitor";
;
import WhatsappExport from "@pages/WhatsappExport";
import ActivityLog from "@pages/ActivityLog";
import NotFound from "@pages/NotFound";
import ProductDetail from "@pages/ProductDetail";

function OnboardingGuard({ children }: { children: React.ReactNode }) {
  const shop = useShopStore((s) => s.shop);
  const isOnboarded = useShopStore((s) => s.isShopOnboarded);
  const location = useLocation();
  const onOnboarding = location.pathname === "/onboarding";

  // Wait for shop data to load before deciding — avoids false redirect
  // caused by isShopOnboarded defaulting to false in Zustand before API responds
  if (!shop) return null;

  if (!isOnboarded && !onOnboarding)
    return <Navigate to="/onboarding" replace />;
  if (isOnboarded && onOnboarding) return <Navigate to="/" replace />;
  return <>{children}</>;
}

function AppContent() {
  const { isLoading } = useShop();
  const shopDomain = useShopStore((s) => s.shop?.shopDomain);
  const location = useLocation();

  // Show loading only on first load before shop data is available
  if (isLoading && !shopDomain) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <img
            src="/logo.jpeg"
            alt="VisualFlow AI"
            className="w-12 h-12 object-contain rounded-xl"
          />
          <div className="w-5 h-5 border-2 border-brand-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-zinc-400">Loading VisualFlow AI...</p>
        </div>
      </div>
    );
  }

  return (
    <AnimatePresence mode="wait" initial={false}>
      <Routes location={location} key={location.pathname}>
        <Route
          path="/"
          element={
            <OnboardingGuard>
              <Dashboard />
            </OnboardingGuard>
          }
        />
        <Route
          path="/onboarding"
          element={
            <OnboardingGuard>
              <Onboarding />
            </OnboardingGuard>
          }
        />
        <Route
          path="/products"
          element={
            <OnboardingGuard>
              <Products />
            </OnboardingGuard>
          }
        />
        <Route
          path="/products/:id"
          element={
            <OnboardingGuard>
              <ProductDetail />
            </OnboardingGuard>
          }
        />
        <Route
          path="/approval"
          element={
            <OnboardingGuard>
              <ApprovalQueue />
            </OnboardingGuard>
          }
        />
        <Route
          path="/calendar"
          element={
            <OnboardingGuard>
              <ContentCalendar />
            </OnboardingGuard>
          }
        />
        <Route
          path="/analytics"
          element={
            <OnboardingGuard>
              <Analytics />
            </OnboardingGuard>
          }
        />
        <Route
          path="/published"
          element={
            <OnboardingGuard>
              <PublishedPosts />
            </OnboardingGuard>
          }
        />
        <Route
          path="/ads"
          element={
            <OnboardingGuard>
              <AdManager />
            </OnboardingGuard>
          }
        />
        <Route
          path="/competitors"
          element={
            <OnboardingGuard>
              <CompetitorMonitor />
            </OnboardingGuard>
          }
        />
        <Route path="/reports" element={<Navigate to="/analytics" replace />} />
        <Route
          path="/whatsapp"
          element={
            <OnboardingGuard>
              <WhatsappExport />
            </OnboardingGuard>
          }
        />
        <Route
          path="/activity"
          element={
            <OnboardingGuard>
              <ActivityLog />
            </OnboardingGuard>
          }
        />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </AnimatePresence>
  );
}

export default function App() {
  return (
    <AppLayout>
      <AppContent />
    </AppLayout>
  );
}
