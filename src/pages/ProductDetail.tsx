import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { PageWrapper } from '@/components/layout/PageWrapper'
import { ErrorState } from '@/components/ui/ErrorState'
import { productService } from '@/services/productService'
import { postService } from '@/services/postService'
import { formatINR } from '@/utils/indianFormat'
import { cn } from '@/utils/cn'
import {
  ArrowLeft,
  Tag,
  Package,
  Calendar,
  RefreshCw,
  ImageOff,
  TrendingUp,
  CheckCircle,
  XCircle,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import type { Post } from '@/types/post.types'

function ProductDetailSkeleton() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="h-5 w-28 bg-violet-100 rounded" />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-3">
          <div className="aspect-square rounded-2xl bg-violet-100" />
          <div className="grid grid-cols-4 gap-2">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="aspect-square rounded-lg bg-violet-100" />
            ))}
          </div>
        </div>
        <div className="space-y-5">
          <div className="h-8 w-3/4 bg-violet-100 rounded" />
          <div className="h-6 w-1/3 bg-violet-100 rounded" />
          <div className="h-4 w-full bg-violet-100 rounded" />
          <div className="h-4 w-5/6 bg-violet-100 rounded" />
          <div className="h-4 w-4/6 bg-violet-100 rounded" />
          <div className="flex gap-2 mt-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-6 w-16 bg-violet-100 rounded-full" />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function PostHistoryCard({ post }: { post: Post }) {
  const statusColor: Record<string, string> = {
    published: 'text-green-700 bg-green-50 border-green-200',
    pending_approval: 'text-amber-700 bg-amber-50 border-amber-200',
    skipped: 'text-slate-600 bg-slate-50 border-slate-200',
    failed: 'text-red-700 bg-red-50 border-red-200',
    scheduled: 'text-blue-700 bg-blue-50 border-blue-200',
  }

  const image = post.imageUrl
  const date = post.publishedAt ?? post.scheduledAt ?? post.createdAt

  return (
    <div className="flex gap-3 p-3 rounded-xl border border-slate-100 bg-white hover:border-violet-200 hover:shadow-sm transition-all">
      <div className="w-14 h-14 shrink-0 rounded-lg overflow-hidden bg-slate-100 flex items-center justify-center">
        {image ? (
          <img src={image} alt="post" className="w-full h-full object-cover" />
        ) : (
          <ImageOff className="w-5 h-5 text-slate-400" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
          {post.captionInstagram ?? post.captionFacebook ?? 'No caption'}
        </p>
        <div className="flex items-center gap-2 mt-1.5">
          <span
            className={cn(
              'text-[10px] font-medium px-1.5 py-0.5 rounded border',
              statusColor[post.status] ?? 'text-slate-600 bg-slate-50 border-slate-200'
            )}
          >
            {post.status.replace('_', ' ')}
          </span>
          {date && (
            <span className="text-[10px] text-slate-400">
              {new Date(date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

export default function ProductDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [activeImage, setActiveImage] = useState(0)

  const { data: product, isLoading, isError } = useQuery({
    queryKey: ['product', id],
    queryFn: async () => {
      const r = await productService.getById(id!)
      // Backend wraps the product: { product: {...} }
      const payload = r.data as unknown as { product: import('@/types/product.types').Product }
      return payload.product
    },
    enabled: !!id,
  })

  const { data: postsData } = useQuery({
    queryKey: ['posts', 'product', id],
    queryFn: () =>
      postService.getAll({ product_id: id, page: 1, limit: 20 }).then(r => r.data),
    enabled: !!id,
  })

  const posts: Post[] = postsData?.data ?? []

  if (isLoading) {
    return (
      <PageWrapper title="Product">
        <ProductDetailSkeleton />
      </PageWrapper>
    )
  }

  if (isError || !product) {
    return (
      <PageWrapper title="Product">
        <ErrorState title="Product not found" message="This product may have been removed or synced." />
      </PageWrapper>
    )
  }

  const images = product.images ?? []
  const price = parseFloat(product.price ?? '0') || 0
  const compareAt = product.compareAtPrice ? parseFloat(product.compareAtPrice) : null
  const hasDiscount = compareAt !== null && compareAt > price
  const discountPct = hasDiscount
    ? Math.round(((compareAt! - price) / compareAt!) * 100)
    : 0

  const publishedPosts = posts.filter(p => p.status === 'published')
  const pendingPosts = posts.filter(p => p.status === 'pending_approval')

  document.title = `${product.title} — VisualFlow AI`

  return (
    <PageWrapper title={product.title}>
      {/* Back nav */}
      <button
        onClick={() => navigate(-1)}
        className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-violet-600 transition-colors mb-6 group"
      >
        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
        Back
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 xl:gap-12">
        {/* ── Left: Image gallery ── */}
        <div className="space-y-3">
          <div className="relative aspect-square rounded-2xl overflow-hidden bg-linear-to-br from-slate-50 to-slate-100 border border-slate-100 shadow-sm">
            {images.length > 0 ? (
              <img
                src={images[activeImage]}
                alt={product.title}
                className="w-full h-full object-contain p-4"
              />
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-slate-300">
                <ImageOff className="w-16 h-16" />
                <span className="text-sm">No image</span>
              </div>
            )}

            {/* Active badge */}
            <div className="absolute top-3 left-3">
              {product.isActive ? (
                <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700 bg-green-50 border border-green-200 px-2 py-0.5 rounded-full">
                  <CheckCircle className="w-3 h-3" />
                  Active
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-600 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-full">
                  <XCircle className="w-3 h-3" />
                  Inactive
                </span>
              )}
            </div>

            {/* Discount badge */}
            {hasDiscount && (
              <div className="absolute top-3 right-3">
                <span className="text-xs font-bold text-white bg-red-500 px-2 py-0.5 rounded-full">
                  -{discountPct}%
                </span>
              </div>
            )}

            {/* Prev/Next arrows for multi-image */}
            {images.length > 1 && (
              <>
                <button
                  onClick={() => setActiveImage(i => (i - 1 + images.length) % images.length)}
                  className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/80 backdrop-blur shadow flex items-center justify-center hover:bg-white transition-colors"
                >
                  <ChevronLeft className="w-4 h-4 text-slate-600" />
                </button>
                <button
                  onClick={() => setActiveImage(i => (i + 1) % images.length)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/80 backdrop-blur shadow flex items-center justify-center hover:bg-white transition-colors"
                >
                  <ChevronRight className="w-4 h-4 text-slate-600" />
                </button>
              </>
            )}
          </div>

          {/* Thumbnails */}
          {images.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-1">
              {images.map((img, idx) => (
                <button
                  key={idx}
                  onClick={() => setActiveImage(idx)}
                  className={cn(
                    'w-16 h-16 shrink-0 rounded-xl border-2 overflow-hidden bg-slate-50 transition-all',
                    idx === activeImage
                      ? 'border-violet-500 shadow-md shadow-violet-100'
                      : 'border-transparent hover:border-violet-200'
                  )}
                >
                  <img src={img} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ── Right: Product details ── */}
        <div className="space-y-6">
          {/* Title + category */}
          <div>
            {product.category && (
              <span className="text-xs font-semibold tracking-widest uppercase text-violet-500 mb-1 block">
                {product.category}
              </span>
            )}
            <h1 className="font-display text-2xl sm:text-3xl font-bold text-slate-900 leading-tight">
              {product.title}
            </h1>
          </div>

          {/* Price */}
          <div className="flex items-end gap-3">
            <span className="text-3xl font-bold text-slate-900">
              {price > 0 ? formatINR(price) : 'Price TBD'}
            </span>
            {hasDiscount && compareAt && (
              <span className="text-lg text-slate-400 line-through mb-0.5">
                {formatINR(compareAt)}
              </span>
            )}
            {hasDiscount && compareAt && (
              <span className="text-sm font-semibold text-green-600 mb-0.5">
                Save {formatINR(compareAt - price)}
              </span>
            )}
          </div>

          {/* Inventory */}
          <div className="flex items-center gap-2">
            <Package className="w-4 h-4 text-slate-400" />
            {(() => {
              const qty = product.inventoryQuantity ?? null
              if (qty === null) return <span className="text-sm text-slate-400">Stock unknown</span>
              return (
                <>
                  <span
                    className={cn(
                      'text-sm font-medium',
                      qty > 10 ? 'text-green-600' : qty > 0 ? 'text-amber-600' : 'text-red-600'
                    )}
                  >
                    {qty > 0 ? `${qty} in stock` : 'Out of stock'}
                  </span>
                  {qty > 0 && qty <= 10 && (
                    <span className="text-xs text-amber-500 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                      Low stock
                    </span>
                  )}
                </>
              )
            })()}
          </div>

          {/* Divider */}
          <div className="h-px bg-slate-100" />

          {/* Description */}
          {product.description && (
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-2">
                Description
              </h3>
              <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-line">
                {product.description}
              </p>
            </div>
          )}

          {/* Tags */}
          {product.tags && product.tags.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-2 flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5" />
                Tags
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {product.tags.map(tag => (
                  <span
                    key={tag}
                    className="text-xs text-violet-700 bg-violet-50 border border-violet-200 px-2.5 py-1 rounded-full font-medium"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Dates */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-slate-100 bg-slate-50 p-3 space-y-1">
              <div className="flex items-center gap-1.5 text-slate-400">
                <RefreshCw className="w-3.5 h-3.5" />
                <span className="text-[10px] font-semibold uppercase tracking-widest">Last Synced</span>
              </div>
              <p className="text-sm font-medium text-slate-700">
                {product.syncedAt
                  ? new Date(product.syncedAt).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })
                  : '—'}
              </p>
            </div>

            <div className="rounded-xl border border-slate-100 bg-slate-50 p-3 space-y-1">
              <div className="flex items-center gap-1.5 text-slate-400">
                <Calendar className="w-3.5 h-3.5" />
                <span className="text-[10px] font-semibold uppercase tracking-widest">Last Featured</span>
              </div>
              <p className="text-sm font-medium text-slate-700">
                {product.lastFeaturedAt
                  ? new Date(product.lastFeaturedAt).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })
                  : '—'}
              </p>
            </div>
          </div>

          {/* Post stats */}
          {posts.length > 0 && (
            <div className="rounded-xl border border-violet-100 bg-linear-to-br from-violet-50 to-purple-50 p-4">
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp className="w-4 h-4 text-violet-600" />
                <h3 className="text-sm font-semibold text-violet-800">Content Performance</h3>
              </div>
              <div className="grid grid-cols-3 gap-3 text-center">
                <div>
                  <p className="text-2xl font-bold text-violet-700">{posts.length}</p>
                  <p className="text-[10px] uppercase tracking-widest text-violet-500 font-medium mt-0.5">Total Posts</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-green-600">{publishedPosts.length}</p>
                  <p className="text-[10px] uppercase tracking-widest text-green-500 font-medium mt-0.5">Published</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-amber-600">{pendingPosts.length}</p>
                  <p className="text-[10px] uppercase tracking-widest text-amber-500 font-medium mt-0.5">Pending</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Post history ── */}
      {posts.length > 0 && (
        <div className="mt-10">
          <h2 className="font-display text-lg font-bold text-slate-800 mb-4">Post History</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {posts.map(post => (
              <PostHistoryCard key={post.id} post={post} />
            ))}
          </div>
        </div>
      )}
    </PageWrapper>
  )
}
