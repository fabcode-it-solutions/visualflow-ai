import { Skeleton } from "@/components/ui/Skeleton";
import { PageWrapper } from "@/components/layout/PageWrapper";

export function CalendarSkeleton() {
  return (
    <PageWrapper title="Loading Calendar">
      <div className="space-y-6">
        {/* Header with Month/Year and navigation */}
        <div className="flex items-center justify-between gap-4">
          <Skeleton className="h-8 w-32" /> {/* Month/Year */}
          <div className="flex gap-2">
            <Skeleton className="h-10 w-10 rounded-full" /> {/* Prev button */}
            <Skeleton className="h-10 w-10 rounded-full" /> {/* Next button */}
          </div>
        </div>

        {/* Weekday headers */}
        <div className="grid grid-cols-7 gap-2">
          {[1, 2, 3, 4, 5, 6, 7].map((i) => (
            <Skeleton key={i} className="h-6 w-full" /> // Day of week
          ))}
        </div>

        {/* Calendar grid (5 rows of 7 days) */}
        <div className="grid grid-cols-7 gap-2">
          {Array.from({ length: 35 }).map((_, i) => (
            <div
              key={i}
              className="h-28 w-full rounded-lg border border-surface-200 p-2 space-y-2"
            >
              <Skeleton className="h-4 w-8" /> {/* Day number */}
              <Skeleton className="h-4 w-3/4" /> {/* Event 1 */}
              <Skeleton className="h-4 w-1/2" /> {/* Event 2 */}
            </div>
          ))}
        </div>
      </div>
    </PageWrapper>
  );
}
