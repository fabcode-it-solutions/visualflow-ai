import { Badge } from "@/components/ui/Badge";
import type { BadgeProps } from "@/components/ui/Badge";
import type { SocialPlatform } from "@/types/shop.types";

interface PlatformBadgeProps {
  platform: SocialPlatform;
  className?: string;
}

const platformConfig: Record<
  SocialPlatform,
  { label: string; variant: BadgeProps["variant"] }
> = {
  instagram: { label: "Instagram", variant: "warning" },
  facebook: { label: "Facebook", variant: "info" },
  whatsapp: { label: "WhatsApp", variant: "success" },
  pinterest: { label: "Pinterest", variant: "error" },
};

export function PlatformBadge({ platform, className }: PlatformBadgeProps) {
  const config = platformConfig[platform] ?? { label: platform, variant: "default" as const };

  return (
    <Badge variant={config.variant} className={className}>
      {config.label}
    </Badge>
  );
}
