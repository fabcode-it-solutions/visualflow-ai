import { analyticsService } from "../services/analyticsService";

/**
 * Custom hook for tracking analytics events.
 * Provides a `trackEvent` function to send analytics data.
 */
export function useAnalytics() {
  const trackEvent = (eventName: string, payload?: Record<string, unknown>) => {
    analyticsService.trackEvent({ eventName, payload });
  };

  return { trackEvent };
}
