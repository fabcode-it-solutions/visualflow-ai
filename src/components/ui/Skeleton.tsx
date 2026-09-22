import { cn } from "@utils/cn";

export interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      className={cn(
        "animate-shimmer bg-gradient-to-r from-brand-100 via-brand-50 to-brand-100 bg-[length:200%_100%] rounded-lg",
        className,
      )}
    />
  );
}
