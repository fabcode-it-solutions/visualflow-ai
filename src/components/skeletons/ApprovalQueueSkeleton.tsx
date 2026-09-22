import { Skeleton } from "@/components/ui/Skeleton";
import { PageWrapper } from "@/components/layout/PageWrapper";

export function ApprovalQueueSkeleton() {
  return (
    <PageWrapper title="Approval Queue" showBack>
      <div className="space-y-6">
        {/* Top Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <Skeleton className="h-8 w-48" /> {/* Title */}
            <Skeleton className="h-6 w-20 rounded-full" /> {/* Badge */}
          </div>
          <Skeleton className="h-10 w-32" /> {/* Approve All Button */}
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-8 w-24" />
          ))}
        </div>

        {/* Posts Grid - Two Column */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex flex-col rounded-lg overflow-hidden border border-surface-200">
              {/* Header Section */}
              <div className="px-4 pt-4 pb-3 border-b border-surface-100 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <Skeleton className="h-5 w-16" /> {/* Type Badge */}
                  <Skeleton className="h-5 w-20" /> {/* Platform Badge */}
                </div>
                <Skeleton className="h-4 w-2/3" /> {/* Product Name */}
              </div>

              {/* Middle Section - Two Column */}
              <div className="flex flex-col md:flex-row p-4 gap-4 grow">
                {/* Left: Image */}
                <div className="md:w-2/5 shrink-0 bg-surface-100 rounded-lg overflow-hidden">
                  <Skeleton className="w-full aspect-square" /> {/* Image */}
                </div>

                {/* Right: Content */}
                <div className="md:w-3/5 space-y-3">
                  <Skeleton className="h-3 w-24" /> {/* Caption Label */}
                  <Skeleton className="h-16 w-full" /> {/* Caption Text */}
                  <Skeleton className="h-3 w-32" /> {/* Character Count */}
                  <div className="flex flex-wrap gap-1.5">
                    <Skeleton className="h-5 w-16 rounded-full" /> {/* Hashtag */}
                    <Skeleton className="h-5 w-16 rounded-full" /> {/* Hashtag */}
                  </div>
                  <Skeleton className="h-3 w-40" /> {/* Scheduled Time */}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="border-t border-surface-100 px-4 py-3 flex flex-col sm:flex-row gap-2 justify-end">
                <Skeleton className="h-8 w-16" /> {/* Skip Button */}
                <Skeleton className="h-8 w-32" /> {/* Edit Button */}
                <Skeleton className="h-8 w-20" /> {/* Approve Button */}
              </div>
            </div>
          ))}
        </div>
      </div>
    </PageWrapper>
  );
}
