import { Skeleton } from "@/components/ui/Skeleton";
import { PageWrapper } from "@/components/layout/PageWrapper";

export function DashboardSkeleton() {
  return (
    <PageWrapper title="Loading Dashboard">
      <div className="space-y-6">
        {/* Header area */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <Skeleton className="h-8 w-48" /> {/* Title */}
          <Skeleton className="h-10 w-32" /> {/* Action Button */}
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-28 w-full" /> // StatCard skeleton
          ))}
        </div>

        {/* Section Title */}
        <Skeleton className="h-7 w-56" />

        {/* Post cards grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="flex flex-col rounded-lg overflow-hidden border border-surface-200"
            >
              <Skeleton className="h-32 w-full rounded-t-lg" /> {/* Image */}
              <div className="p-4 space-y-2">
                <Skeleton className="h-4 w-3/4" /> {/* Title */}
                <Skeleton className="h-3 w-1/2" /> {/* Subtitle */}
              </div>
              <div className="border-t border-surface-100 p-4 flex justify-end gap-2">
                <Skeleton className="h-8 w-20" /> {/* Button */}
                <Skeleton className="h-8 w-24" /> {/* Button */}
              </div>
            </div>
          ))}
        </div>
      </div>
    </PageWrapper>
  );
}
