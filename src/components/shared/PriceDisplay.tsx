import { cn } from "@utils/cn";
import { formatINR } from "@utils/indianFormat";
import { Badge } from "@/components/ui/Badge";

interface PriceDisplayProps {
  price: number;
  compareAtPrice?: number;
  showEMI?: boolean;
  isStartingPrice?: boolean;
  size?: "sm" | "md" | "lg";
}

export function PriceDisplay({
  price,
  compareAtPrice,
  showEMI = false,
  isStartingPrice = false,
  size = "md",
}: PriceDisplayProps) {
  const isOnSale = compareAtPrice && compareAtPrice > price;

  // Calculate EMI: price / 6 months, rounded to nearest 10
  const emiAmount = Math.round(price / 6 / 10) * 10;
  const showEMIOption = showEMI && price > 5000;

  return (
    <div className={cn("space-y-1.5")}>
      <div
        className={cn(
          "flex items-center gap-2 flex-wrap",
          size === "sm" && "text-sm",
          size === "md" && "text-base",
          size === "lg" && "text-xl",
        )}
      >
        {isStartingPrice && (
          <span className="text-xs font-medium text-zinc-500">Starting from</span>
        )}
        <span
          className={cn(
            "font-semibold text-zinc-900",
            isOnSale && "text-red-600"
          )}
        >
          {formatINR(price)}
        </span>
        {isOnSale && (
          <span className="text-xs text-zinc-400 line-through">
            {formatINR(compareAtPrice)}
          </span>
        )}
        {isOnSale && (
          <Badge variant="success" size="sm">
            {Math.round((1 - price / compareAtPrice) * 100)}% off
          </Badge>
        )}
      </div>

      {showEMIOption && (
        <p className="text-xs text-zinc-500">
          EMI from <span className="font-medium text-zinc-700">{formatINR(emiAmount)}</span>/month
        </p>
      )}
    </div>
  );
}
