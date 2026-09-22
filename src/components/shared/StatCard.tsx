import { cn } from "@utils/cn"
import { motion } from "framer-motion"

interface StatCardProps {
  label: string
  value: string | number
  icon: React.ReactNode
  iconBg?: string
  trend?: "up" | "down" | "none"
  trendValue?: string | number
  className?: string
  onClick?: () => void
  clickable?: boolean
  pulsingDot?: boolean
  accentBorder?: boolean
}

export function StatCard({
  label,
  value,
  icon,
  iconBg = "bg-brand-50",
  trend = "none",
  trendValue,
  className,
  onClick,
  clickable = false,
  pulsingDot = false,
  accentBorder = false,
}: StatCardProps) {
  return (
    <button
      onClick={onClick}
      disabled={!clickable}
      className={cn(
        "relative w-full text-left bg-white border border-surface-100 rounded-2xl p-5 shadow-card transition-all duration-150",
        clickable && "hover:border-brand-300 hover:shadow-elevated cursor-pointer active:scale-[0.98]",
        accentBorder && "border-l-4 border-l-amber-400",
        className,
      )}
    >
      {/* Top row: label + icon */}
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-medium text-zinc-500 uppercase tracking-wide leading-tight">
          {label}
        </p>
        <div className={cn(
          "flex items-center justify-center w-10 h-10 rounded-full shrink-0",
          iconBg,
        )}>
          {icon}
        </div>
      </div>

      {/* Value */}
      <div className="flex items-center gap-2 mt-3">
        <p className="font-display font-bold text-3xl text-zinc-900 leading-none">
          {value}
        </p>
        {pulsingDot && (
          <motion.span
            className="inline-block w-2 h-2 bg-amber-500 rounded-full"
            animate={{ scale: [1, 1.3, 1], opacity: [1, 0.6, 1] }}
            transition={{ repeat: Infinity, duration: 1.8 }}
          />
        )}
      </div>

      {/* Trend */}
      {trendValue !== undefined && (
        <div className={cn(
          "mt-2 flex items-center gap-1.5 text-xs",
          trend === "up"   && "text-emerald-600",
          trend === "down" && "text-red-500",
          trend === "none" && "text-zinc-400",
        )}>
          <span>
            {trend === "up" ? "↑" : trend === "down" ? "↓" : "—"}
          </span>
          <span>{trendValue}</span>
        </div>
      )}
    </button>
  )
}
