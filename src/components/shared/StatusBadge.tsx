import { Badge } from "@/components/ui/Badge";
import type { BadgeProps } from "@/components/ui/Badge";
import type { PostStatus } from "@/types/post.types";

interface StatusBadgeProps {
  status: PostStatus;
  className?: string;
}

const statusConfig: Record<
  PostStatus,
  { label: string; variant: BadgeProps["variant"] }
> = {
  draft: { label: "Draft", variant: "default" },
  pending_approval: { label: "Pending", variant: "info" },
  approved: { label: "Approved", variant: "success" },
  scheduled: { label: "Scheduled", variant: "brand" },
  published: { label: "Published", variant: "success" },
  failed: { label: "Failed", variant: "error" },
  skipped: { label: "Skipped", variant: "warning" },
  held: { label: "Held", variant: "warning" },
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = statusConfig[status] ?? { label: status, variant: "default" as const };

  return (
    <Badge variant={config.variant} className={className}>
      {config.label}
    </Badge>
  );
}
