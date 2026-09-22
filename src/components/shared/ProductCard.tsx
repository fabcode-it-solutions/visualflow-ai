import { formatINR } from "@utils/indianFormat"
import type { Product } from "@/types/product.types"
import { Package } from "lucide-react"
import { cn } from "@utils/cn"

interface ProductCardProps {
  product: Product
  onClick?: (id: string) => void
  onCreatePost?: (id: string) => void
}

export function ProductCard({ product, onClick }: ProductCardProps) {
  const imageUrl = product.images?.[0]
  const displayPrice = product.price ? formatINR(Number(product.price)) : 'Price TBD'
  const stock = product.inventoryQuantity

  const stockDot =
    stock === undefined || stock === null ? null :
    stock >= 20  ? { dot: 'bg-emerald-500', label: `${stock} in stock` } :
    stock >= 5   ? { dot: 'bg-amber-500',   label: `${stock} in stock` } :
    stock > 0    ? { dot: 'bg-red-500',     label: `${stock} in stock` } :
                   { dot: 'bg-red-500',     label: 'Out of stock' }

  const category = product.category

  return (
    <div
      className={cn(
        "min-w-44 shrink-0 bg-white rounded-2xl border border-surface-100 shadow-card overflow-hidden",
        "hover:border-brand-300 hover:shadow-elevated transition-all duration-150",
        "active:scale-[0.98]",
        onClick && "cursor-pointer",
      )}
      onClick={onClick ? () => onClick(product.id) : undefined}
    >
      {/* Image — fixed height, not square */}
      <div className="h-28 w-full bg-surface-100 flex items-center justify-center overflow-hidden">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={product.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <Package className="h-7 w-7 text-zinc-400" />
        )}
      </div>

      {/* Content */}
      <div className="p-3">
        {/* Category badge */}
        {category && (
          <span className="inline-block bg-surface-100 text-zinc-500 text-[10px] font-medium px-1.5 py-0.5 rounded-md mb-1.5 truncate max-w-full">
            {category}
          </span>
        )}

        {/* Name */}
        <p className="font-semibold text-xs text-zinc-900 line-clamp-2 mb-1.5 leading-snug">
          {product.title}
        </p>

        {/* Price */}
        <p className="text-brand-600 font-bold text-sm">{displayPrice}</p>

        {/* Inventory */}
        {stockDot && (
          <div className="flex items-center gap-1 mt-1">
            <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', stockDot.dot)} />
            <span className="text-[11px] text-zinc-500">{stockDot.label}</span>
          </div>
        )}
      </div>
    </div>
  )
}
