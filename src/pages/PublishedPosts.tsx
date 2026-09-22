import { useEffect, useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { PageWrapper } from '@/components/layout/PageWrapper'
import { PublishedPostsSkeleton } from '@/components/skeletons/PublishedPostsSkeleton'
import { ErrorState } from '@/components/ui/ErrorState'
import { EmptyState } from '@/components/ui/EmptyState'
import { Badge } from '@/components/ui/Badge'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { PostCard } from '@/components/shared/PostCard'
import { PostViewModal } from '@/components/shared/PostViewModal'
import { BoostConfirmDialog } from '@/components/shared/BoostConfirmDialog'
import { postService } from '@/services/postService'
import { productService } from '@/services/productService'
import { useToast } from '@/hooks/useToast'
import { Calendar, ThumbsUp, Image as ImageIcon, Zap, Eye, ArrowUpRight } from 'lucide-react'
import { smartDate, formatIST } from '@utils/dateUtils'
import type { Post } from '@/types/post.types'

const POST_TYPE_LABELS: Record<string, string> = {
  feed_image: 'Feed',
  carousel: 'Carousel',
  story: 'Story',
  reel: 'Reel',
  ad: 'Ad',
}

export default function PublishedPosts() {
  useEffect(() => {
    document.title = 'Published Posts — VisualFlow AI'
  }, [])

  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { showToast } = useToast()
  const [productNames, setProductNames] = useState<Record<string, string>>({})
  const [productImages, setProductImages] = useState<Record<string, string>>({})
  const [boostingPostId, setBoostingPostId] = useState<string | null>(null)
  const [loadingPostIds, setLoadingPostIds] = useState<Record<string, boolean>>({})
  const [viewingPost, setViewingPost] = useState<Post | null>(null)

  const { data: postsData, isLoading, isError, error, refetch } = useQuery<Post[]>({
    queryKey: ['posts', 'published'],
    queryFn: async () => {
      const res = await postService.getAll()
      return (res.data.data || [])
        .filter(p => p.status === 'published')
        .sort((a, b) => {
          const dateA = new Date(a.publishedAt || 0).getTime()
          const dateB = new Date(b.publishedAt || 0).getTime()
          return dateB - dateA
        })
    },
  })

  // Fetch product names and images
  useQuery({
    queryKey: ['product-names-published', postsData],
    queryFn: async () => {
      if (!postsData || postsData.length === 0) return
      const productIds = [...new Set(postsData.map(p => p.productId).filter(Boolean) as string[])]
      const names: Record<string, string> = {}
      const images: Record<string, string> = {}
      await Promise.all(
        productIds.map(async (id: string) => {
          try {
            const product = await productService.getById(id)
            names[id] = product.data.title
            const imgs = product.data.images as string[]
            if (imgs?.[0]) images[id] = imgs[0]
          } catch {
            names[id] = 'Product'
          }
        })
      )
      setProductNames(names)
      setProductImages(images)
    },
    enabled: !!postsData && postsData.length > 0,
  })

  const { mutate: boost } = useMutation({
    mutationFn: ({
      id,
      budget,
      durationHours,
    }: {
      id: string
      budget: number
      durationHours: number
    }) => postService.boost(id, { budget, durationHours }),
    onMutate: (id) => {
      setLoadingPostIds((prev) => ({ ...prev, [id.id]: true }))
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['posts'] })
      showToast('Post boosted! Ad campaign created ⚡', 'success')
      setBoostingPostId(null)
    },
    onError: () => showToast('Failed to boost post', 'error'),
    onSettled: (_, __, id) => {
      setLoadingPostIds((prev) => ({ ...prev, [id.id]: false }))
    },
  })


  const posts = postsData || []

  // Find the post with the highest engagement score
  const bestPost = useMemo(() => {
    if (posts.length === 0) return null
    const sorted = [...posts]
      .filter(p => p.engagementScore !== null && p.engagementScore !== undefined)
      .sort((a, b) => (b.engagementScore ?? 0) - (a.engagementScore ?? 0))
    return sorted[0] ?? null
  }, [posts])

  if (isLoading) {
    return <PublishedPostsSkeleton />
  }

  if (isError) {
    return (
      <PageWrapper title="Published Posts" showBack>
        <ErrorState
          title="Could not load published posts"
          message={error instanceof Error ? error.message : 'Something went wrong'}
          onRetry={() => refetch()}
        />
      </PageWrapper>
    )
  }

  return (
    <PageWrapper title="Published Posts" showBack>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="font-display font-bold text-2xl sm:text-3xl text-zinc-900">
            Published Posts
          </h1>
          <p className="text-sm text-zinc-500 mt-2">
            {posts.length} post{posts.length !== 1 ? 's' : ''} published
          </p>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Card className="p-4">
            <p className="text-xs text-zinc-500 mb-1">Total Published</p>
            <p className="text-2xl font-bold text-zinc-900">{posts.length}</p>
          </Card>
          <Card className="p-4">
            <p className="text-xs text-zinc-500 mb-1">This Month</p>
            <p className="text-2xl font-bold text-zinc-900">
              {posts.filter(p => {
                const pDate = new Date(p.publishedAt || 0)
                const now = new Date()
                return pDate.getMonth() === now.getMonth() && pDate.getFullYear() === now.getFullYear()
              }).length}
            </p>
          </Card>
          <Card className="p-4">
            <p className="text-xs text-zinc-500 mb-1">Products Used</p>
            <p className="text-2xl font-bold text-zinc-900">
              {new Set(posts.map(p => p.productId)).size}
            </p>
          </Card>
          <Card className="p-4">
            <p className="text-xs text-zinc-500 mb-1">Avg. Per Product</p>
            <p className="text-2xl font-bold text-zinc-900">
              {new Set(posts.map(p => p.productId)).size > 0
                ? Math.round(posts.length / new Set(posts.map(p => p.productId)).size)
                : 0}
            </p>
          </Card>
        </div>
  
        {/* Best Post This Period */}
        {bestPost && (
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-zinc-800">🏆 Best Post This Period</h3>
            <div className="sm:max-w-md">
              <PostCard
                post={bestPost}
                productName={bestPost.productId ? productNames[bestPost.productId] || 'Product' : 'Product'}
                productImageUrl={bestPost.productId ? productImages[bestPost.productId] : undefined}
                readOnly
              />
            </div>
          </div>
        )}

        {/* Posts List */}
        {posts.length > 0 ? (
          <div className="space-y-3">
            {posts.map((post) => {
              const thumbnail = post.mediaUrls?.[0] ?? post.imageUrl
              const caption = post.captionInstagram ?? post.captionFacebook ?? post.caption ?? ''
              const postType = post.postType ? POST_TYPE_LABELS[post.postType] : 'Unknown'
              const productName = post.productId ? productNames[post.productId] || 'Product' : 'Product'
              const publishDate = post.publishedAt ? smartDate(post.publishedAt) : 'Not published'
              const publishTime = post.publishedAt ? formatIST(post.publishedAt) : ''
              const canBoost = ['feed_image', 'carousel', 'ad'].includes((post as any).postType ?? '')

              return (
                <Card key={post.id} className="p-4 hover:shadow-md transition-shadow">

                  {/* ── Mobile layout ── */}
                  <div className="sm:hidden">
                    <div className="flex gap-3">
                      <button
                        onClick={() => setViewingPost(post)}
                        aria-label="Preview post"
                        className="group shrink-0 w-16 h-16 bg-surface-100 rounded-xl overflow-hidden flex items-center justify-center relative cursor-pointer"
                      >
                        {thumbnail
                          ? <img src={thumbnail} alt={caption} className="w-full h-full object-cover group-active:scale-95 transition-transform duration-150" />
                          : <ImageIcon className="h-6 w-6 text-surface-400" />}
                        <div className="absolute inset-0 bg-black/0 group-active:bg-black/40 transition-colors duration-150 rounded-xl flex items-center justify-center">
                          <Eye className="h-5 w-5 text-white opacity-0 group-active:opacity-100 transition-opacity" />
                        </div>
                      </button>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <button
                            onClick={() => post.productId && navigate(`/products/${post.productId}`)}
                            className="group/name flex items-center gap-1 font-semibold text-zinc-900 text-sm truncate leading-tight text-left hover:text-brand-600 transition-colors cursor-pointer"
                          >
                            {productName}
                            <ArrowUpRight className="h-3 w-3 shrink-0 opacity-0 group-hover/name:opacity-100 transition-opacity text-brand-500" />
                          </button>
                          <Badge variant="brand" size="sm" className="shrink-0">
                            {post.platform === 'instagram' ? '📷' : post.platform === 'facebook' ? '👍' : '📱'}
                          </Badge>
                        </div>
                        <div className="flex flex-wrap items-center gap-1 mb-1.5">
                          <span className="text-xs text-zinc-500">{postType}</span>
                          {post.metadata?.collectionType === 'collection' && (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-100">✨ Collection</span>
                          )}
                          {post.metadata?.testimonialType === 'testimonial' && (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-100">⭐ Testimonial</span>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-zinc-500">
                          <Calendar className="h-3 w-3 shrink-0" />
                          <span>{publishDate}</span>
                          {post.engagementScore != null && (
                            <span className="flex items-center gap-0.5 text-brand-600 font-medium ml-1">
                              <ThumbsUp className="h-3 w-3" />{Math.round(post.engagementScore)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    {caption && (
                      <p className="text-xs text-zinc-600 line-clamp-2 mt-2.5 leading-relaxed">{caption}</p>
                    )}
                    <div className="flex gap-2 mt-3 pt-3 border-t border-zinc-100">
                      <button
                        onClick={() => post.productId && navigate(`/products/${post.productId}`)}
                        aria-label="View product page"
                        className="flex-1 flex items-center justify-center gap-1.5 text-xs font-semibold text-zinc-600 hover:text-brand-600 py-2.5 rounded-xl hover:bg-brand-50 border border-zinc-200 transition-all cursor-pointer min-h-11"
                      >
                        <ArrowUpRight className="w-3.5 h-3.5" /> View
                      </button>
                      {canBoost && (
                        <Button
                          variant="secondary" size="sm"
                          onClick={() => setBoostingPostId(post.id)}
                          disabled={loadingPostIds[post.id] || (post as any).boosted}
                          loading={loadingPostIds[post.id]}
                          leftIcon={<Zap className="h-4 w-4" />}
                          className="flex-1 text-xs font-semibold min-h-11"
                        >
                          {(post as any).boosted ? '✓ Boosted' : '⚡ Boost'}
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* ── Desktop layout ── */}
                  <div className="hidden sm:flex gap-4 items-center">
                    <button
                      onClick={() => setViewingPost(post)}
                      aria-label="Preview post"
                      className="group shrink-0 w-20 h-20 bg-surface-100 rounded-xl overflow-hidden flex items-center justify-center relative cursor-pointer"
                    >
                      {thumbnail
                        ? <img src={thumbnail} alt={caption} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200" />
                        : <ImageIcon className="h-8 w-8 text-surface-400" />}
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors duration-200 rounded-xl flex items-center justify-center">
                        <Eye className="h-5 w-5 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
                      </div>
                    </button>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <button
                          onClick={() => post.productId && navigate(`/products/${post.productId}`)}
                          className="group/name flex items-center gap-1 font-semibold text-zinc-900 truncate hover:text-brand-600 transition-colors cursor-pointer text-left"
                        >
                          {productName}
                          <ArrowUpRight className="h-3.5 w-3.5 shrink-0 opacity-0 group-hover/name:opacity-100 transition-opacity text-brand-500" />
                        </button>
                        <Badge variant="brand" size="sm">
                          {post.platform === 'instagram' ? '📷' : post.platform === 'facebook' ? '👍' : '📱'}
                        </Badge>
                        <span className="text-xs text-zinc-400">{postType}</span>
                        {post.metadata?.collectionType === 'collection' && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-100">✨ Collection</span>
                        )}
                        {post.metadata?.testimonialType === 'testimonial' && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-100">⭐ Testimonial</span>
                        )}
                      </div>
                      <p className="text-sm text-zinc-600 line-clamp-1 mb-2">{caption || '(no caption)'}</p>
                      <div className="flex items-center gap-3 text-xs text-zinc-500">
                        <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" />{publishDate}</span>
                        {publishTime && <span className="text-zinc-400">{publishTime}</span>}
                        {post.engagementScore != null && (
                          <span className="flex items-center gap-1 text-brand-600 font-medium">
                            <ThumbsUp className="h-3.5 w-3.5" />{Math.round(post.engagementScore)}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="shrink-0 flex items-center gap-2">
                      <button
                        onClick={() => post.productId && navigate(`/products/${post.productId}`)}
                        aria-label="View product page"
                        className="flex items-center gap-1.5 text-xs font-semibold text-zinc-500 hover:text-brand-600 px-3 py-2 rounded-xl hover:bg-brand-50 border border-zinc-200 transition-all cursor-pointer"
                      >
                        <ArrowUpRight className="w-3.5 h-3.5" /> View
                      </button>
                      {canBoost && (
                        <Button
                          variant="secondary" size="sm"
                          onClick={() => setBoostingPostId(post.id)}
                          disabled={loadingPostIds[post.id] || (post as any).boosted}
                          loading={loadingPostIds[post.id]}
                          leftIcon={<Zap className="h-4 w-4" />}
                          className="text-xs font-semibold"
                        >
                          {(post as any).boosted ? '✓ Boosted' : '⚡ Boost'}
                        </Button>
                      )}
                    </div>
                  </div>

                </Card>
              )
            })}
          </div>
        ) : (
          <EmptyState
            icon="📤"
            title="No published posts yet"
            description="Posts published to Instagram and Facebook will appear here with dates and performance metrics."
            action={{
              label: 'Go to Approval Queue',
              onClick: () => navigate('/approval'),
            }}
          />
        )}
      </div>

      {/* Boost Dialog */}
      <BoostConfirmDialog
        open={boostingPostId !== null}
        onClose={() => setBoostingPostId(null)}
        onConfirm={(budget, durationHours) => {
          if (boostingPostId) {
            boost({ id: boostingPostId, budget, durationHours })
          }
        }}
        isConfirming={boostingPostId ? loadingPostIds[boostingPostId] : false}
      />

      {/* View Modal */}
      {viewingPost && (
        <PostViewModal
          post={viewingPost}
          productName={viewingPost.productId ? productNames[viewingPost.productId] || 'Product' : 'Product'}
          open={!!viewingPost}
          onClose={() => setViewingPost(null)}
        />
      )}
    </PageWrapper>
  )
}
