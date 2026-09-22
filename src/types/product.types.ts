/** Shopify product synced from Admin API */
export interface Product {
  id: string
  shopifyProductId: string
  shopDomain: string
  title: string
  description: string | null
  tags: string[]
  price: string
  compareAtPrice: string | null
  images: string[]
  inventoryQuantity: number
  category: string | null
  isActive: boolean
  lastFeaturedAt: string | null
  syncedAt: string
  createdAt: string
  updatedAt: string
}

/** Lightweight product reference for dropdowns and selectors */
export interface ProductSummary {
  id: string
  title: string
  imageUrl: string | null
  price: number
}
