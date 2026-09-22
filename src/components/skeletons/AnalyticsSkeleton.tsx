import { Skeleton } from "@/components/ui/Skeleton";
import { PageWrapper } from "@/components/layout/PageWrapper";

export function AnalyticsSkeleton() {
  return (
    <PageWrapper title="Loading Analytics">
      <div className="space-y-6">
        {/* Header area */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <Skeleton className="h-8 w-48" /> {/* Title */}
          <Skeleton className="h-10 w-32" /> {/* Date Picker */}
        </div>
        {/* Stats grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-28 w-full" /> // StatCard skeleton
          ))}
        </div>
        {/* Chart area */}
        <Skeleton className="h-64 w-full" /> {/* Main Chart */}
        {/* Section Title */}
        <Skeleton className="h-7 w-56" />
        {/* Engagement metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-24 w-full" /> // Small metric cards
          ))}
        </div>
      </div>
    </PageWrapper>
  );
}
