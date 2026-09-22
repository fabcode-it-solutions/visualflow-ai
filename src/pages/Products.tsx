import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, keepPreviousData } from "@tanstack/react-query";
import { PageWrapper } from "@/components/layout/PageWrapper";
import { ProductListSkeleton } from "@/components/skeletons/ProductListSkeleton";
import { ErrorState } from "@/components/ui/ErrorState";
import { EmptyState } from "@/components/ui/EmptyState";
import { ProductCard } from "@/components/shared/ProductCard";
import { CollectionPostModal } from "@/components/shared/CollectionPostModal";
import { CreatePostModal } from "@/components/shared/CreatePostModal";
import { TestimonialPostModal } from "@/components/shared/TestimonialPostModal";
import { productService } from "@/services/productService";
import { useDebounce } from "@/hooks/useDebounce";
import { useToast } from "@/hooks/useToast";
import { Search, RefreshCw, Sparkles, ShoppingBag, Star } from "lucide-react";
import { Button } from "@/components/ui/Button";
import type { Product } from "@/types/product.types";
import type { PaginatedResponse } from "@/types/api.types";

export default function Products() {
  const navigate = useNavigate();

  useEffect(() => {
    document.title = "Products — VisualFlow AI";
  }, []);

  const { showToast } = useToast();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [showCollectionModal, setShowCollectionModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showTestimonialModal, setShowTestimonialModal] = useState(false);
  const debouncedSearch = useDebounce(search, 300);

  // Accumulate products across pages — reset when search changes
  const accumulatedProducts = useRef<Product[]>([]);
  const lastSearch = useRef(debouncedSearch);

  const { data, isLoading, isFetching, isError, error, refetch } = useQuery<
    PaginatedResponse<Product>
  >({
    queryKey: ["products", { search: debouncedSearch, page }],
    queryFn: async () => {
      const res = await productService.getAll({
        search: debouncedSearch,
        page,
        limit: 20,
      });
      return res.data;
    },
    placeholderData: keepPreviousData,
  });


  const { mutate: syncProducts, isPending: isSyncing } = useMutation({
    mutationFn: () => productService.sync(),
    onSuccess: (res) => {
      const { synced } = res.data;
      showToast(
        `${synced} product${synced !== 1 ? "s" : ""} synced successfully`,
        "success",
      );
      void refetch();
    },
    onError: () => showToast("Failed to start sync", "error"),
  });

  if (isLoading && !data) return <ProductListSkeleton />;

  if (isError)
    return (
      <PageWrapper title="Products" showBack>
        <ErrorState
          title="Could not load products"
          message={
            error instanceof Error ? error.message : "Something went wrong"
          }
          onRetry={() => refetch()}
        />
      </PageWrapper>
    );

  // When search changes, reset accumulated list; otherwise append new page's results
  if (lastSearch.current !== debouncedSearch) {
    accumulatedProducts.current = []
    lastSearch.current = debouncedSearch
  }
  if (data?.data) {
    const incoming = data.data
    const existingIds = new Set(accumulatedProducts.current.map(p => p.id))
    const fresh = incoming.filter(p => !existingIds.has(p.id))
    if (fresh.length > 0) accumulatedProducts.current = [...accumulatedProducts.current, ...fresh]
  }

  const products: Product[] = accumulatedProducts.current
  const total = data?.meta?.total ?? 0;
  const hasMore = products.length < total;

  return (
    <PageWrapper title="Products" showBack>
      <div className="space-y-5">
        {/* Search + actions */}
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">

          {/* Search */}
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
            <input
              type="text"
              placeholder="Search products…"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1) }}
              className="w-full pl-9 pr-4 py-2.5 text-sm border border-surface-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 min-h-11"
            />
          </div>

          {/* Create actions — grouped */}
          <div className="flex items-center gap-1.5 bg-zinc-100 rounded-xl p-1 shrink-0">
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-brand-600 text-white text-xs font-bold shadow-sm hover:bg-brand-700 active:scale-95 transition-all cursor-pointer min-h-9"
            >
              <Sparkles className="h-3.5 w-3.5" />
              Single Post
            </button>
            <button
              onClick={() => setShowCollectionModal(true)}
              disabled={!data || data.data.filter(p => p.price && p.inventoryQuantity > 0).length < 3}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-zinc-700 text-xs font-semibold hover:bg-white hover:shadow-sm active:scale-95 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed min-h-9"
            >
              <ShoppingBag className="h-3.5 w-3.5" />
              Collection
            </button>
            <button
              onClick={() => setShowTestimonialModal(true)}
              disabled={!data || data.data.length === 0}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-zinc-700 text-xs font-semibold hover:bg-white hover:shadow-sm active:scale-95 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed min-h-9"
            >
              <Star className="h-3.5 w-3.5" />
              Testimonial
            </button>
          </div>

          {/* Sync — utility, visually separate */}
          <button
            onClick={() => syncProducts()}
            disabled={isSyncing}
            className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl border border-zinc-200 bg-white text-zinc-500 text-xs font-medium hover:border-zinc-300 hover:text-zinc-700 active:scale-95 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shrink-0 min-h-11"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
            {isSyncing ? 'Syncing…' : 'Sync'}
          </button>

        </div>

        {products.length === 0 && !isFetching ? (
          <EmptyState
            title="No products found"
            description={
              debouncedSearch
                ? "Try a different search term."
                : "Sync your Shopify products to get started."
            }
            action={
              !debouncedSearch
                ? { label: "Sync Products", onClick: () => syncProducts() }
                : undefined
            }
          />
        ) : (
          <>
            <p className="text-xs text-zinc-500">
              {total} product{total !== 1 ? "s" : ""}
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {products.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  onClick={(id) => navigate(`/products/${id}`)}
                />
              ))}
            </div>
            {hasMore && (
              <div className="flex justify-center pt-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setPage((p) => p + 1)}
                  disabled={isFetching}
                  className="min-h-11 flex items-center gap-2"
                >
                  {isFetching ? (
                    <>
                      <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                      Loading…
                    </>
                  ) : (
                    "Load more"
                  )}
                </Button>
              </div>
            )}
          </>
        )}
      </div>

      {showCollectionModal && data && (
        <CollectionPostModal
          products={data.data}
          onClose={() => setShowCollectionModal(false)}
        />
      )}

      <CreatePostModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
      />

      {showTestimonialModal && data && (
        <TestimonialPostModal
          products={data.data}
          onClose={() => setShowTestimonialModal(false)}
        />
      )}
    </PageWrapper>
  );
}
