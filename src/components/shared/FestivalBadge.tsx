import { Badge } from "@/components/ui/Badge";
import { formatDistanceToNow, parseISO } from "date-fns";
import { CalendarDays } from "lucide-react";

interface FestivalBadgeProps {
  festivalName: string;
  festivalDate: string; // ISO date string
  className?: string;
}

export function FestivalBadge({
  festivalName,
  festivalDate,
  className,
}: FestivalBadgeProps) {
  const date = parseISO(festivalDate);
  const daysRemaining = formatDistanceToNow(date, { addSuffix: true });

  return (
    <Badge variant="default" className={className}>
      <CalendarDays className="h-3 w-3 mr-1" />
      {festivalName} ({daysRemaining})
    </Badge>
  );
}
