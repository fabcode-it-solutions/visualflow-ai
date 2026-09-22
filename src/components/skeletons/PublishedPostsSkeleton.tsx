import { Skeleton } from "@/components/ui/Skeleton";
import { PageWrapper } from "@/components/layout/PageWrapper";

export function PublishedPostsSkeleton() {
  return (
    <PageWrapper title="Published Posts" showBack>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <Skeleton className="h-8 w-64 mb-2" /> {/* Title */}
          <Skeleton className="h-4 w-40" /> {/* Subtitle */}
        </div>

        {/* Stats Cards - 4 columns grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="p-4 border border-surface-100 rounded-lg">
              <Skeleton className="h-3 w-24 mb-2" /> {/* Label */}
              <Skeleton className="h-7 w-12" /> {/* Number */}
            </div>
          ))}
        </div>

        {/* Posts List */}
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="p-4 border border-surface-100 rounded-lg">
              <div className="flex gap-4">
                {/* Image */}
                <div className="shrink-0 w-20 h-20 bg-surface-100 rounded-lg">
                  <Skeleton className="w-full h-full" />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 space-y-1.5">
                      <Skeleton className="h-4 w-32" /> {/* Product Name */}
                      <Skeleton className="h-3 w-20" /> {/* Post Type */}
                    </div>
                    <Skeleton className="h-5 w-12 rounded-full shrink-0" /> {/* Badge */}
                  </div>

                  {/* Caption Preview */}
                  <Skeleton className="h-8 w-full" /> {/* Caption */}

                  {/* Date and Metrics */}
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-3 w-32" /> {/* Date */}
                    <Skeleton className="h-3 w-24" /> {/* Time */}
                  </div>
                </div>

                {/* Action Button */}
                <div className="shrink-0">
                  <Skeleton className="h-8 w-24" /> {/* Button */}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </PageWrapper>
  );
}
