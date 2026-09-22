import { Button } from '@/components/ui/Button'
import { formatINR } from '@utils/indianFormat'
import type { Product } from '@/types/product.types'
import { Package } from 'lucide-react'

interface CompactProductCardProps {
  product: Product
  onCreatePost?: (productId: string) => void
}

export function CompactProductCard({ product, onCreatePost }: CompactProductCardProps) {
  const imageUrl = product.images?.[0]

  const displayPrice = product.price ? formatINR(Number(product.price)) : 'Price TBD'

  const stock = product.inventoryQuantity ?? 0

  const getInventoryDot = () => {
    if (stock === 0) return '🔴'
    if (stock < 10) return '🟡'
    return '🟢'
  }

  return (
    <div className="shrink-0 w-full group flex flex-col bg-white border border-surface-200 rounded-xl overflow-hidden hover:shadow-md transition-shadow">
      {/* Image */}
      <div className="relative aspect-square w-full bg-surface-100 flex items-center justify-center overflow-hidden">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={product.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
          />
        ) : (
          <Package className="h-8 w-8 text-surface-400" />
        )}
      </div>

      {/* Content */}
      <div className="p-3 space-y-2 flex flex-col flex-1">
        {/* Title */}
        <h3 className="text-xs font-medium text-zinc-900 line-clamp-1">{product.title}</h3>

        {/* Price */}
        <p className="text-sm font-semibold text-brand-700">{displayPrice}</p>

        {/* Inventory */}
        <div className="flex items-center gap-1">
          <span>{getInventoryDot()}</span>
          <p className="text-xs text-zinc-500">{stock} in stock</p>
        </div>

        {/* Button */}
        <div className="mt-auto pt-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => onCreatePost?.(product.id)}
            className="w-full text-xs h-8"
          >
            Create Post
          </Button>
        </div>
      </div>
    </div>
  )
}
