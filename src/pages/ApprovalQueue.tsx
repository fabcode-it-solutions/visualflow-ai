import { useEffect, useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { PageWrapper } from "@/components/layout/PageWrapper";
import { ApprovalQueueSkeleton } from "@/components/skeletons/ApprovalQueueSkeleton";
import { ErrorState } from "@/components/ui/ErrorState";
import { PostCard } from "@/components/shared/PostCard";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { PublishProgressModal } from "@/components/shared/PublishProgressModal";
import { postService } from "@/services/postService";
import { productService } from "@/services/productService";
import { shopService } from "@/services/shopService";
import { useToast } from "@/hooks/useToast";
import { CheckCheck } from "lucide-react";
import type { Post } from "@/types/post.types";
import type { Product } from "@/types/product.types";
import type { PaginatedResponse } from "@/types/api.types";

type StatusTab = "all" | "pending_approval" | "scheduled" | "published" | "draft" | "held" | "failed";
type FilterTab = "all" | "feed_image" | "carousel" | "story" | "reel" | "ad";

const FILTER_LABELS: Record<FilterTab, string> = {
  all: "All",
  feed_image: "Feed",
  carousel: "Carousel",
  story: "Story",
  reel: "Reel",
  ad: "Ad",
};

const INDIA_TIMEZONE = "Asia/Kolkata";

export default function ApprovalQueue() {
  const navigate = useNavigate()
  useEffect(() => {
    document.title = "Approval Queue — VisualFlow AI";
  }, []);

  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [statusTab, setStatusTab] = useState<StatusTab>("pending_approval");
  const [activeTab, setActiveTab] = useState<FilterTab>("all");
  const [confirmAction, setConfirmAction] = useState<
    "approve-all" | "restore" | "delete" | "reject-all" | "override-hold" | null
  >(null);
  const [overrideHoldPostId, setOverrideHoldPostId] = useState<string | null>(null);
  const [selectedPostForConfirm, setSelectedPostForConfirm] = useState<
    string | null
  >(null);
  const [loadingPostIds, setLoadingPostIds] = useState<Record<string, boolean>>(
    {},
  );
  const [publishingPost, setPublishingPost] = useState<Post | null>(null);
  const [productNames, setProductNames] = useState<Record<string, string>>({});
  const [productImages, setProductImages] = useState<Record<string, string>>({});
  const [regenerateNote, setRegenerateNote] = useState("");
  const [regeneratePostId, setRegeneratePostId] = useState<string | null>(null);
  const [swapPostId, setSwapPostId] = useState<string | null>(null);

  const setPostLoading = (id: string, loading: boolean) => {
    setLoadingPostIds((prev) => ({
      ...prev,
      [id]: loading,
    }));
  };

  const isPostLoading = (id: string): boolean => loadingPostIds[id] ?? false;

  useQuery({
    queryKey: ["onboarding-data"],
    queryFn: shopService.getOnboardingData,
    staleTime: 5 * 60 * 1000,
  });

  const {
    data: allPostsData,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery<PaginatedResponse<Post>>({
    queryKey: ["posts"],
    queryFn: async () => {
      const res = await postService.getAll();
      return res.data;
    },
  });

  const isScheduledPost = (post: Post): boolean =>
    post.status === "scheduled" || (post.status === "approved" && Boolean(post.scheduledAt));

  // Filter data based on current status tab
  // Published and scheduled tabs are date-sorted; all others use server order (createdAt desc)
  const data = allPostsData
    ? {
        ...allPostsData,
        data: (() => {
          const filtered = allPostsData.data.filter((p) => {
            if (statusTab === "all") return true;
            if (statusTab === "scheduled") return isScheduledPost(p);
            return p.status === statusTab;
          });
          if (statusTab === "published") {
            return [...filtered].sort((a, b) => {
              const ta = a.publishedAt ? new Date(a.publishedAt).getTime() : 0;
              const tb = b.publishedAt ? new Date(b.publishedAt).getTime() : 0;
              return tb - ta;
            });
          }
          if (statusTab === "scheduled") {
            return [...filtered].sort((a, b) => {
              const ta = a.scheduledAt ? new Date(a.scheduledAt).getTime() : 0;
              const tb = b.scheduledAt ? new Date(b.scheduledAt).getTime() : 0;
              return ta - tb;
            });
          }
          return filtered;
        })(),
      }
    : undefined;

  // Fetch products for swap product dialog
  const { data: productsData } = useQuery({
    queryKey: ["products-list"],
    queryFn: async () => {
      const res = await productService.getAll({ limit: 100 });
      return res.data;
    },
  });

  const products: Product[] = productsData?.data ?? [];

  // Fetch product names for all posts
  useQuery({
    queryKey: ["product-names", data?.data],
    queryFn: async () => {
      if (!data?.data) return;
      const productIds = [
        ...new Set(
          data.data.map((p) => p.productId).filter(Boolean) as string[],
        ),
      ];
      const names: Record<string, string> = {};
      const images: Record<string, string> = {};
      await Promise.all(
        productIds.map(async (id: string) => {
          try {
            const product = await productService.getById(id);
            names[id] = product.data.title;
            const imgs = product.data.images as string[];
            if (imgs?.[0]) images[id] = imgs[0];
          } catch {
            names[id] = "Product";
          }
        }),
      );
      setProductNames(names);
      setProductImages(images);
      return names;
    },
    enabled: !!data?.data,
  });

  const { mutate: skip } = useMutation({
    mutationFn: (id: string) => postService.skip(id),
    onMutate: (id) => {
      setPostLoading(id, true);
    },
    onSuccess: () => {
      showToast("Moved to Drafts", "success");
      queryClient.invalidateQueries({ queryKey: ["posts"] });
    },
    onError: () => {
      showToast("Failed to move to drafts", "error");
    },
    onSettled: (_, __, id) => {
      setPostLoading(id, false);
    },
  });

  const { mutate: restore } = useMutation({
    mutationFn: (id: string) => postService.restore(id),
    onMutate: (id) => {
      setPostLoading(id, true);
    },
    onSuccess: () => {
      showToast("Post restored to approval queue", "success");
      queryClient.invalidateQueries({ queryKey: ["posts"] });
    },
    onError: () => {
      showToast("Failed to restore post", "error");
    },
    onSettled: (_, __, id) => {
      setPostLoading(id, false);
    },
  });

  const { mutate: deletePost } = useMutation({
    mutationFn: (id: string) => postService.delete(id),
    onMutate: (id) => {
      setPostLoading(id, true);
    },
    onSuccess: () => {
      showToast("Post deleted", "success");
      queryClient.invalidateQueries({ queryKey: ["posts"] });
    },
    onError: () => {
      showToast("Failed to delete post", "error");
    },
    onSettled: (_, __, id) => {
      setPostLoading(id, false);
    },
  });

  const { mutate: save } = useMutation({
    mutationFn: ({
      id,
      captionInstagram,
      captionFacebook,
      hashtags,
    }: {
      id: string;
      captionInstagram: string;
      captionFacebook: string;
      hashtags: string[];
    }) =>
      postService.update(id, {
        captionInstagram,
        captionFacebook,
        hashtags,
      }),
    onMutate: ({ id }) => {
      setPostLoading(id, true);
    },
    onSuccess: () => {
      showToast("Changes saved", "success");
      queryClient.invalidateQueries({ queryKey: ["posts"] });
    },
    onError: () => showToast("Failed to save changes", "error"),
    onSettled: (_, __, { id }) => {
      setPostLoading(id, false);
    },
  });

  const { mutate: regenerate } = useMutation({
    mutationFn: (id: string) => postService.regenerate(id),
    onMutate: (id) => {
      setPostLoading(id, true);
    },
    onSuccess: async () => {
      await queryClient.refetchQueries({ queryKey: ["posts"] });
      showToast("Caption regenerated — open Edit or View to see the new text", "success");
    },
    onError: () => showToast("Failed to regenerate", "error"),
    onSettled: (_, __, id) => {
      setPostLoading(id, false);
    },
  });

  function publish(id: string) {
    const post = data?.data.find(p => p.id === id)
    if (post) setPublishingPost(post)
  }

  const { mutateAsync: schedulePost } = useMutation({
    mutationFn: ({ id, scheduledAt }: { id: string; scheduledAt: string }) =>
      postService.schedulePost(id, { scheduledAt }),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["posts"] });
      const post = res.data as import("@/types/post.types").Post & { scheduledAt?: string };
      const formatted = post.scheduledAt
        ? new Date(post.scheduledAt).toLocaleString("en-IN", { timeZone: INDIA_TIMEZONE, dateStyle: "medium", timeStyle: "short" })
        : "";
      showToast(`Post scheduled for ${formatted}`, "success");
    },
    onError: () => showToast("Failed to schedule post", "error"),
  });

  const { mutate: boost } = useMutation({
    mutationFn: ({
      id,
      budget,
      durationHours,
    }: {
      id: string;
      budget: number;
      durationHours: number;
    }) => postService.boost(id, { budget, durationHours }),
    onMutate: (id) => {
      setPostLoading(id.id, true);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["posts"] });
      showToast("Post boosted! Ad campaign created ⚡", "success");
    },
    onError: () => showToast("Failed to boost post", "error"),
    onSettled: (_, __, id) => {
      setPostLoading(id.id, false);
    },
  });

  const { mutate: retryReel } = useMutation({
    mutationFn: (id: string) => postService.retryReel(id),
    onMutate: (id) => {
      setPostLoading(id, true);
    },
    onSuccess: (res, id) => {
      queryClient.invalidateQueries({ queryKey: ["posts"] });
      if (res.data.success) {
        showToast("Reel video generated successfully 🎬", "success");
      } else {
        showToast(res.data.message || "Reel generation failed", "error");
      }
      setPostLoading(id, false);
    },
    onError: () => showToast("Failed to retry reel generation", "error"),
    onSettled: (_, __, id) => {
      setPostLoading(id, false);
    },
  });

  const { mutate: approveAll, isPending: isApprovingAll } = useMutation({
    mutationFn: () => postService.approveAll(),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["posts"] });
      showToast(
        `${res.data.approved} post${res.data.approved !== 1 ? "s" : ""} approved`,
        "success",
      );
    },
    onError: () => showToast("Failed to approve all", "error"),
  });

  const { mutate: regenerateWithNote, isPending: isRegenerating } = useMutation(
    {
      mutationFn: ({ id, note }: { id: string; note?: string }) =>
        postService.regenerateWithNote(id, { note }),
      onMutate: ({ id }) => setPostLoading(id, true),
      onSuccess: async () => {
        await queryClient.refetchQueries({ queryKey: ["posts"] });
        showToast("Caption regenerated — open Edit or View to see the new text", "success");
        setRegeneratePostId(null);
        setRegenerateNote("");
      },
      onError: () => showToast("Failed to regenerate", "error"),
      onSettled: (_, __, { id }) => setPostLoading(id, false),
    },
  );

  const { mutate: swapProduct } = useMutation({
    mutationFn: ({ id, newProductId }: { id: string; newProductId: string }) =>
      postService.swapProduct(id, { newProductId }),
    onMutate: ({ id }) => setPostLoading(id, true),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["posts"] });
      showToast("Product swapped", "success");
      setSwapPostId(null);
    },
    onError: () => showToast("Failed to swap product", "error"),
    onSettled: (_, __, { id }) => setPostLoading(id, false),
  });

  const { mutate: retryFailedPost } = useMutation({
    mutationFn: (id: string) => postService.retryPost(id),
    onMutate: (id) => setPostLoading(id, true),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["posts"] });
      showToast("Post rescheduled for publishing", "success");
    },
    onError: () => showToast("Failed to retry post", "error"),
    onSettled: (_, __, id) => setPostLoading(id, false),
  });

  const { mutate: overrideHold, isPending: isOverridingHold } = useMutation({
    mutationFn: (id: string) => postService.overrideHold(id),
    onMutate: (id) => setPostLoading(id, true),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["posts"] });
      showToast("Post approved — publishing with low stock", "success");
      setConfirmAction(null);
      setOverrideHoldPostId(null);
    },
    onError: () => showToast("Failed to override hold", "error"),
    onSettled: (_, __, id) => setPostLoading(id, false),
  });

  const { mutate: replaceHeldProduct } = useMutation({
    mutationFn: ({ id, newProductId }: { id: string; newProductId: string }) =>
      postService.replaceHeldProduct(id, { newProductId }),
    onMutate: ({ id }) => setPostLoading(id, true),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["posts"] });
      showToast("Product replaced — post approved", "success");
      setSwapPostId(null);
    },
    onError: () => showToast("Failed to replace product", "error"),
    onSettled: (_, __, { id }) => setPostLoading(id, false),
  });

  function approveAndPublish(id: string) {
    const post = data?.data.find(p => p.id === id)
    if (post) setPublishingPost(post)
  }

  const { mutateAsync: approveAndSchedule } = useMutation({
    mutationFn: async ({ id, scheduledAt }: { id: string; scheduledAt: string }) => {
      await postService.approve(id)
      return postService.schedulePost(id, { scheduledAt })
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['posts'] })
      const post = res.data as import('@/types/post.types').Post & { scheduledAt?: string }
      const formatted = post.scheduledAt
        ? new Date(post.scheduledAt).toLocaleString('en-IN', { timeZone: INDIA_TIMEZONE, dateStyle: 'medium', timeStyle: 'short' })
        : ''
      showToast(`Post scheduled for ${formatted} 📅`, 'success')
    },
    onError: () => showToast('Failed to schedule post', 'error'),
  })

  const { mutate: rejectAll } = useMutation({
    mutationFn: async () => {
      const pending =
        data?.data?.filter((p) => p.status === "pending_approval") ?? [];
      await Promise.all(pending.map((p) => postService.skip(p.id)));
      return pending.length;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ["posts"] });
      showToast(
        `${count} post${count !== 1 ? "s" : ""} moved to drafts`,
        "success",
      );
      setConfirmAction(null);
    },
    onError: () => showToast("Failed to reject posts", "error"),
  });

  // Calculate derived state BEFORE early returns (required by Rules of Hooks)
  const currentPosts = useMemo<Post[]>(() => data?.data ?? [], [data?.data]);

  // Filter posts by active type tab
  const filteredPosts = useMemo(() => {
    if (activeTab === "all") return currentPosts;
    return currentPosts.filter((p) => p.postType === activeTab);
  }, [currentPosts, activeTab]);

  // Count by post type for current status
  const countByType = useMemo(() => {
    const counts: Record<FilterTab, number> = {
      all: currentPosts.length,
      feed_image: 0,
      carousel: 0,
      story: 0,
      reel: 0,
      ad: 0,
    };
    currentPosts.forEach((p) => {
      if (
        p.postType === "feed_image" ||
        p.postType === "carousel" ||
        p.postType === "story" ||
        p.postType === "reel" ||
        p.postType === "ad"
      ) {
        counts[p.postType as FilterTab]++;
      }
    });
    return counts;
  }, [currentPosts]);

  if (isLoading) return <ApprovalQueueSkeleton />;

  if (isError)
    return (
      <PageWrapper title="Approval Queue" showBack>
        <ErrorState
          title="Could not load approval queue"
          message={
            error instanceof Error ? error.message : "Something went wrong"
          }
          onRetry={() => refetch()}
        />
      </PageWrapper>
    );

  const pendingCount =
    allPostsData?.data?.filter((p) => p.status === "pending_approval").length ??
    0;
  const scheduledCount =
    allPostsData?.data?.filter((p) => isScheduledPost(p)).length ?? 0;
  const draftCount =
    allPostsData?.data?.filter((p) => p.status === "draft").length ?? 0;
  const heldCount =
    allPostsData?.data?.filter((p) => p.status === "held").length ?? 0;
  const failedCount =
    allPostsData?.data?.filter((p) => p.status === "failed").length ?? 0;
  const publishedCount =
    allPostsData?.data?.filter((p) => p.status === "published").length ?? 0;

  return (
    <PageWrapper title="Approval Queue" showBack>
      <div className="space-y-6">
        {/* HEADER */}
        <div>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-1">
            {pendingCount > 0 && statusTab === "pending_approval" && (
              <div className="flex items-center gap-2">
                <Button
                  variant="primary"
                  size="md"
                  leftIcon={<CheckCheck className="h-4 w-4" />}
                  onClick={() => setConfirmAction("approve-all")}
                  disabled={isApprovingAll}
                >
                  {isApprovingAll ? "Approving..." : "Approve All"}
                </Button>
                <Button
                  variant="ghost"
                  size="md"
                  onClick={() => setConfirmAction("reject-all")}
                  className="text-red-500 hover:text-red-600 hover:bg-red-50"
                >
                  Reject All
                </Button>
              </div>
            )}
          </div>
          <p className="text-sm text-zinc-500">
            {statusTab === "all"
              ? `${currentPosts.length} post${currentPosts.length !== 1 ? "s" : ""}`
              : statusTab === "pending_approval"
                ? `${pendingCount} post${pendingCount !== 1 ? "s" : ""} waiting for approval`
                : statusTab === "scheduled"
                  ? `${scheduledCount} post${scheduledCount !== 1 ? "s" : ""} scheduled`
                  : statusTab === "published"
                    ? `${publishedCount} post${publishedCount !== 1 ? "s" : ""} published`
                    : statusTab === "held"
                      ? `${heldCount} post${heldCount !== 1 ? "s" : ""} held due to low inventory`
                      : statusTab === "failed"
                      ? `${failedCount} post${failedCount !== 1 ? "s" : ""} failed to publish`
                      : `${draftCount} draft post${draftCount !== 1 ? "s" : ""}`}
          </p>
        </div>

        {/* STATUS TABS */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2">
          <button
            onClick={() => {
              setStatusTab("all");
              setActiveTab("all");
            }}
            className={`px-4 py-2.5 text-sm font-medium rounded-full whitespace-nowrap transition-all cursor-pointer ${
              statusTab === "all"
                ? "bg-brand-600 text-white shadow-md"
                : "bg-surface-100 text-zinc-700 hover:bg-surface-200"
            }`}
          >
            All
          </button>
          <button
            onClick={() => {
              setStatusTab("pending_approval");
              setActiveTab("all");
            }}
            className={`px-4 py-2.5 text-sm font-medium rounded-full whitespace-nowrap transition-all cursor-pointer ${
              statusTab === "pending_approval"
                ? "bg-brand-600 text-white shadow-md"
                : "bg-surface-100 text-zinc-700 hover:bg-surface-200"
            }`}
          >
            Pending
            {pendingCount > 0 && (
              <span
                className={`ml-1.5 px-2 py-0.5 rounded-full text-xs font-semibold ${
                  statusTab === "pending_approval"
                    ? "bg-white/30 text-white"
                    : "bg-zinc-300 text-zinc-700"
                }`}
              >
                {pendingCount}
              </span>
            )}
          </button>
          <button
            onClick={() => {
              setStatusTab("scheduled");
              setActiveTab("all");
            }}
            className={`px-4 py-2.5 text-sm font-medium rounded-full whitespace-nowrap transition-all cursor-pointer ${
              statusTab === "scheduled"
                ? "bg-emerald-600 text-white shadow-md"
                : "bg-surface-100 text-zinc-700 hover:bg-surface-200"
            }`}
          >
            📅 Scheduled
            {scheduledCount > 0 && (
              <span
                className={`ml-1.5 px-2 py-0.5 rounded-full text-xs font-semibold ${
                  statusTab === "scheduled"
                    ? "bg-white/30 text-white"
                    : "bg-zinc-300 text-zinc-700"
                }`}
              >
                {scheduledCount}
              </span>
            )}
          </button>
          <button
            onClick={() => {
              setStatusTab("published");
              setActiveTab("all");
            }}
            className={`px-4 py-2.5 text-sm font-medium rounded-full whitespace-nowrap transition-all cursor-pointer ${
              statusTab === "published"
                ? "bg-teal-600 text-white shadow-md"
                : "bg-surface-100 text-zinc-700 hover:bg-surface-200"
            }`}
          >
            ✅ Published
            {publishedCount > 0 && (
              <span
                className={`ml-1.5 px-2 py-0.5 rounded-full text-xs font-semibold ${
                  statusTab === "published"
                    ? "bg-white/30 text-white"
                    : "bg-teal-100 text-teal-700"
                }`}
              >
                {publishedCount}
              </span>
            )}
          </button>
          <button
            onClick={() => {
              setStatusTab("draft");
              setActiveTab("all");
            }}
            className={`px-4 py-2.5 text-sm font-medium rounded-full whitespace-nowrap transition-all cursor-pointer ${
              statusTab === "draft"
                ? "bg-amber-600 text-white shadow-md"
                : "bg-surface-100 text-zinc-700 hover:bg-surface-200"
            }`}
          >
            Drafts
            {draftCount > 0 && (
              <span
                className={`ml-1.5 px-2 py-0.5 rounded-full text-xs font-semibold ${
                  statusTab === "draft"
                    ? "bg-white/30 text-white"
                    : "bg-zinc-300 text-zinc-700"
                }`}
              >
                {draftCount}
              </span>
            )}
          </button>
          <button
            onClick={() => {
              setStatusTab("held");
              setActiveTab("all");
            }}
            className={`px-4 py-2.5 text-sm font-medium rounded-full whitespace-nowrap transition-all cursor-pointer ${
              statusTab === "held"
                ? "bg-amber-500 text-white shadow-md"
                : "bg-surface-100 text-zinc-700 hover:bg-surface-200"
            }`}
          >
            ⚠️ Held
            {heldCount > 0 && (
              <span
                className={`ml-1.5 px-2 py-0.5 rounded-full text-xs font-semibold ${
                  statusTab === "held"
                    ? "bg-white/30 text-white"
                    : "bg-amber-100 text-amber-700"
                }`}
              >
                {heldCount}
              </span>
            )}
          </button>
          <button
            onClick={() => {
              setStatusTab("failed");
              setActiveTab("all");
            }}
            className={`px-4 py-2.5 text-sm font-medium rounded-full whitespace-nowrap transition-all cursor-pointer ${
              statusTab === "failed"
                ? "bg-red-600 text-white shadow-md"
                : "bg-surface-100 text-zinc-700 hover:bg-surface-200"
            }`}
          >
            ❌ Failed
            {failedCount > 0 && (
              <span
                className={`ml-1.5 px-2 py-0.5 rounded-full text-xs font-semibold ${
                  statusTab === "failed"
                    ? "bg-white/30 text-white"
                    : "bg-red-100 text-red-700"
                }`}
              >
                {failedCount}
              </span>
            )}
          </button>
        </div>

        {/* FILTER TABS - Only show for pending_approval */}
        {statusTab === "pending_approval" && pendingCount > 0 && (
          <div className="flex items-center gap-2 overflow-x-auto pb-3 -mx-4 px-4 sm:mx-0 sm:px-0">
            {(Object.entries(FILTER_LABELS) as Array<[FilterTab, string]>).map(
              ([tab, label]) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-4 py-2.5 text-sm font-medium rounded-full whitespace-nowrap transition-all cursor-pointer flex items-center gap-2 ${
                    activeTab === tab
                      ? "bg-brand-600 text-white shadow-md"
                      : "bg-surface-100 text-zinc-700 hover:bg-surface-200"
                  }`}
                >
                  {label}
                  {countByType[tab] > 0 && (
                    <span
                      className={`ml-1.5 px-2 py-0.5 rounded-full text-xs font-semibold ${
                        activeTab === tab
                          ? "bg-white/30 text-white"
                          : "bg-zinc-300 text-zinc-700"
                      }`}
                    >
                      {countByType[tab]}
                    </span>
                  )}
                </button>
              ),
            )}
          </div>
        )}

        {/* POSTS GRID */}
        {filteredPosts.length > 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {filteredPosts.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                productName={
                  post.productId
                    ? productNames[post.productId] || "Product"
                    : "Product"
                }
                productImageUrl={
                  post.productId ? productImages[post.productId] : undefined
                }
                onProductClick={post.productId ? () => navigate(`/products/${post.productId}`) : undefined}
                directActions={statusTab === "pending_approval"}
                onApprove={undefined}
                onSkip={statusTab === "pending_approval" ? skip : undefined}
                onRestore={
                  statusTab === "draft"
                    ? () => {
                        setSelectedPostForConfirm(post.id);
                        setConfirmAction("restore");
                      }
                    : undefined
                }
                onSave={(id, captionInstagram, captionFacebook, hashtags) =>
                  save({ id, captionInstagram, captionFacebook, hashtags })
                }
                onRegenerate={regenerate}
                readOnly={statusTab === "published"}
                onPublish={
                  statusTab === "pending_approval"
                    ? (id) => approveAndPublish(id)
                    : statusTab === "scheduled"
                    ? publish
                    : undefined
                }
                onSchedule={
                  statusTab === "pending_approval"
                    ? async (id, scheduledAt) => {
                        await approveAndSchedule({ id, scheduledAt });
                      }
                    : statusTab === "scheduled"
                    ? async (id, scheduledAt) => {
                        await schedulePost({ id, scheduledAt });
                      }
                    : undefined
                }
                storeTimezone={INDIA_TIMEZONE}
                onBoost={(id, budget, durationHours) =>
                  boost({ id, budget, durationHours })
                }
                onRetryReel={retryReel}
                onRegenerateWithNote={
                  statusTab !== "draft"
                    ? (id: string) => {
                        setRegeneratePostId(id);
                      }
                    : undefined
                }
                onSwapProduct={
                  statusTab !== "draft"
                    ? (id: string) => {
                        setSwapPostId(id);
                      }
                    : undefined
                }
                onOverrideHold={
                  statusTab === "held"
                    ? (id: string) => {
                        setOverrideHoldPostId(id);
                        setConfirmAction("override-hold");
                      }
                    : undefined
                }
                onReplaceProduct={
                  statusTab === "held"
                    ? (id: string) => {
                        setSwapPostId(id);
                      }
                    : undefined
                }
                onRetryFailed={
                  statusTab === "failed" ? retryFailedPost : undefined
                }
                onDelete={
                  statusTab === "draft" || statusTab === "failed"
                    ? () => {
                        setSelectedPostForConfirm(post.id);
                        setConfirmAction("delete");
                      }
                    : undefined
                }
                isOverridingHold={isPostLoading(post.id)}
                isRetryingPost={isPostLoading(post.id)}
                isApproving={isPostLoading(post.id)}
                isSkipping={isPostLoading(post.id)}
                isSaving={isPostLoading(post.id)}
                isRegenerating={isPostLoading(post.id)}
                isPublishing={isPostLoading(post.id)}
                isRetryingReel={isPostLoading(post.id)}
                isRestoring={isPostLoading(post.id)}
                isDeleting={isPostLoading(post.id)}
                isBoosting={isPostLoading(post.id)}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-lg text-zinc-500">
              {statusTab === "pending_approval"
                ? "No posts waiting for approval"
                : statusTab === "scheduled"
                  ? "No scheduled posts yet"
                : statusTab === "published"
                    ? "No published posts yet. Scheduled posts will appear here after publishing."
                    : statusTab === "draft"
                      ? "No draft posts"
                      : statusTab === "held"
                        ? "No held posts"
                        : statusTab === "failed"
                          ? "No failed posts"
                          : "No posts"}
            </p>
            <p className="text-sm text-zinc-400 mt-2">
              Use the tabs above to view other sections
            </p>
          </div>
        )}
      </div>

      {/* Approve All Confirmation */}
      <ConfirmDialog
        open={confirmAction === "approve-all"}
        title={`Approve all ${pendingCount} posts?`}
        description="These posts will be ready to publish to Instagram and Facebook."
        confirmText="Approve All"
        cancelText="Cancel"
        variant="success"
        onConfirm={() => {
          approveAll();
          setConfirmAction(null);
        }}
        onClose={() => setConfirmAction(null)}
        isConfirming={isApprovingAll}
      />

      {/* Reject All Confirmation */}
      <ConfirmDialog
        open={confirmAction === "reject-all"}
        title={`Skip all ${pendingCount} posts?`}
        description="All pending posts will be moved to Drafts."
        confirmText="Move to Drafts"
        cancelText="Cancel"
        variant="danger"
        onConfirm={() => rejectAll()}
        onClose={() => setConfirmAction(null)}
        isConfirming={false}
      />

      {/* Restore Confirmation */}
      <ConfirmDialog
        open={confirmAction === "restore"}
        title="Restore this post?"
        description="Post will be moved back to approval queue."
        confirmText="Restore"
        cancelText="Cancel"
        variant="success"
        onConfirm={() => {
          if (selectedPostForConfirm) {
            restore(selectedPostForConfirm);
            setSelectedPostForConfirm(null);
          }
          setConfirmAction(null);
        }}
        onClose={() => {
          setSelectedPostForConfirm(null);
          setConfirmAction(null);
        }}
        isConfirming={
          selectedPostForConfirm ? isPostLoading(selectedPostForConfirm) : false
        }
      />

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={confirmAction === "delete"}
        title="Delete this post?"
        description="This cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
        onConfirm={() => {
          if (selectedPostForConfirm) {
            deletePost(selectedPostForConfirm);
            setSelectedPostForConfirm(null);
          }
          setConfirmAction(null);
        }}
        onClose={() => {
          setSelectedPostForConfirm(null);
          setConfirmAction(null);
        }}
        isConfirming={
          selectedPostForConfirm ? isPostLoading(selectedPostForConfirm) : false
        }
      />

      {/* Regenerate with Note Dialog */}
      {regeneratePostId && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl">
            <h3 className="font-semibold text-zinc-900 mb-1">
              Regenerate Caption
            </h3>
            <p className="text-sm text-zinc-500 mb-4">
              Any specific instructions? (optional)
            </p>
            <textarea
              className="w-full border border-surface-200 rounded-xl p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-brand-500"
              rows={3}
              placeholder="Make it more festive"
              value={regenerateNote}
              onChange={(e) => setRegenerateNote(e.target.value)}
            />
            <div className="flex gap-2 mt-4">
              <Button
                variant="ghost"
                size="sm"
                className="flex-1"
                onClick={() => {
                  setRegeneratePostId(null);
                  setRegenerateNote("");
                }}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                className="flex-1"
                disabled={isRegenerating}
                onClick={() =>
                  regenerateWithNote({
                    id: regeneratePostId,
                    note: regenerateNote || undefined,
                  })
                }
              >
                {isRegenerating ? "Regenerating..." : "Regenerate"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Override Hold Confirmation */}
      <ConfirmDialog
        open={confirmAction === "override-hold"}
        title="Publish with low stock?"
        description="This post was held due to low inventory. Publishing anyway may lead to overselling."
        confirmText="Publish Anyway"
        cancelText="Cancel"
        variant="danger"
        onConfirm={() => {
          if (overrideHoldPostId) overrideHold(overrideHoldPostId);
        }}
        onClose={() => {
          setConfirmAction(null);
          setOverrideHoldPostId(null);
        }}
        isConfirming={overrideHoldPostId ? isPostLoading(overrideHoldPostId) || isOverridingHold : false}
      />

      {/* Swap / Replace Product Dialog */}
      {swapPostId && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-xl overflow-hidden">
            <div className="p-4 border-b border-surface-100">
              <h3 className="font-semibold text-zinc-900">
                {statusTab === "held" ? "Replace Product" : "Change Product"}
              </h3>
            </div>
            <div className="max-h-72 overflow-y-auto divide-y divide-surface-100">
              {products
                .filter((p) => p.inventoryQuantity > 0)
                .map((p) => (
                  <button
                    key={p.id}
                    onClick={() =>
                      statusTab === "held"
                        ? replaceHeldProduct({ id: swapPostId, newProductId: p.id })
                        : swapProduct({ id: swapPostId, newProductId: p.id })
                    }
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-surface-50 transition-colors text-left"
                  >
                    {p.images?.[0] && (
                      <img
                        src={p.images[0]}
                        alt={p.title}
                        className="w-10 h-10 rounded-lg object-cover shrink-0"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-zinc-900 truncate">
                        {p.title}
                      </p>
                      <p className="text-xs text-zinc-500">
                        ₹{parseFloat(p.price).toLocaleString("en-IN")}
                      </p>
                    </div>
                  </button>
                ))}
            </div>
            <div className="p-3 border-t border-surface-100">
              <Button
                variant="ghost"
                size="sm"
                className="w-full"
                onClick={() => setSwapPostId(null)}
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
      {publishingPost && (
        <PublishProgressModal
          post={publishingPost}
          publishFn={async (signal) => {
            const p = publishingPost
            const needsApproval = p.status === 'pending_approval'
            if (needsApproval) await postService.approve(p.id)
            return postService.publish(p.id, signal)
          }}
          onDone={() => {
            setPublishingPost(null)
            showToast('Post published successfully!', 'success')
            void queryClient.invalidateQueries({ queryKey: ['posts'] })
          }}
          onError={(msg) => {
            setPublishingPost(null)
            showToast(msg, 'error')
          }}
        />
      )}
    </PageWrapper>
  );
}

