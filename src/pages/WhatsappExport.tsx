import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { PageWrapper } from "@/components/layout/PageWrapper";
import { ErrorState } from "@/components/ui/ErrorState";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { postService } from "@/services/postService";
import { useToast } from "@/hooks/useToast";
import { useNavigate } from "react-router-dom";
import {
  Download,
  Copy,
  Check,
  Link2,
  ChevronDown,
  ChevronUp,
  ExternalLink,
} from "lucide-react";
import { WhatsAppIcon } from "@/components/icons/WhatsAppIcon";
import { cn } from "@utils/cn";

type FilterType = "all" | "week" | "month";

interface WhatsappPost {
  id: string;
  caption: string;
  hashtags: string[];
  imageUrl: string;
  publishedAt: string;
  platform: string;
  productId: string | null;
  productTitle: string | null;
  productUrl: string | null;
}

export default function WhatsappExport() {
  useEffect(() => {
    document.title = "WhatsApp Export — VisualFlow AI";
  }, []);

  const navigate = useNavigate();
  const { showToast } = useToast();
  const [filter, setFilter] = useState<FilterType>("all");
  const [expandedCaptions, setExpandedCaptions] = useState<Set<string>>(
    new Set(),
  );
  const [copiedCaption, setCopiedCaption] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState<string | null>(null);

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["posts", "whatsapp-ready"],
    queryFn: async () => {
      const res = await postService.getWhatsappReady();
      return res.data.posts;
    },
  });

  const filteredPosts = (data || []).filter((post) => {
    if (filter === "all") return true;
    const postDate = new Date(post.publishedAt);
    const now = new Date();
    const daysDiff = Math.floor(
      (now.getTime() - postDate.getTime()) / (1000 * 60 * 60 * 24),
    );
    if (filter === "week") return daysDiff <= 7;
    if (filter === "month") return daysDiff <= 30;
    return true;
  });

  const handleShare = (post: WhatsappPost) => {
    const productLine = post.productUrl
      ? `\n\n🛍️ Shop here: ${post.productUrl}`
      : "";
    const shareText = `${post.caption}${productLine}\n\n💰 Free Delivery | 📦 COD Available\n\nMessage us to order 👉`;
    const encodedText = encodeURIComponent(shareText);
    const whatsappUrl = `https://api.whatsapp.com/send?text=${encodedText}`;
    try {
      window.open(whatsappUrl, "_blank", "width=800,height=600");
      showToast("Opening WhatsApp...", "success");
    } catch {
      showToast("Could not open WhatsApp", "error");
    }
  };

  const handleCopyProductLink = async (post: WhatsappPost) => {
    if (!post.productUrl) return;
    try {
      await navigator.clipboard.writeText(post.productUrl);
      showToast("Product link copied!", "success");
    } catch {
      showToast("Could not copy link", "error");
    }
  };

  const handleCopyCaption = async (post: WhatsappPost) => {
    const text = `${post.caption}${post.hashtags?.length ? "\n\n" + post.hashtags.map((h) => `#${h}`).join(" ") : ""}`;
    try {
      await navigator.clipboard.writeText(text);
      setCopiedCaption(post.id);
      showToast("Caption copied!", "success");
      setTimeout(() => setCopiedCaption(null), 2000);
    } catch {
      showToast("Could not copy", "error");
    }
  };

  const handleCopyLink = async (post: WhatsappPost) => {
    try {
      await navigator.clipboard.writeText(post.imageUrl);
      setCopiedLink(post.id);
      showToast("Image link copied!", "success");
      setTimeout(() => setCopiedLink(null), 2000);
    } catch {
      showToast("Could not copy link", "error");
    }
  };

  const handleDownload = async (imageUrl: string, postId: string) => {
    try {
      const response = await fetch(imageUrl, { mode: "no-cors" });
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = `post-${postId}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);
      showToast("Image downloaded!", "success");
    } catch {
      window.open(imageUrl, "_blank");
      showToast("Opening image in new tab — right-click to save.", "info");
    }
  };

  const toggleCaption = (postId: string) => {
    const next = new Set(expandedCaptions);
    if (next.has(postId)) next.delete(postId);
    else next.add(postId);
    setExpandedCaptions(next);
  };

  if (isLoading) {
    return (
      <PageWrapper title="WhatsApp Export" showBack>
        <div className="space-y-6">
          <div className="h-10 bg-zinc-100 rounded-2xl animate-pulse w-2/3" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Skeleton key={i} className="h-96 rounded-2xl" />
            ))}
          </div>
        </div>
      </PageWrapper>
    );
  }

  if (isError) {
    return (
      <PageWrapper title="WhatsApp Export" showBack>
        <ErrorState
          title="Could not load WhatsApp content"
          message={
            error instanceof Error ? error.message : "Something went wrong"
          }
          onRetry={() => refetch()}
        />
      </PageWrapper>
    );
  }

  const allPosts = data || [];

  if (allPosts.length === 0) {
    return (
      <PageWrapper title="WhatsApp Export" showBack>
        <EmptyState
          title="No published posts yet"
          description="Publish your first post to see WhatsApp-ready content here"
          icon={<WhatsAppIcon className="h-6 w-6" />}
        />
      </PageWrapper>
    );
  }

  return (
    <PageWrapper title="WhatsApp Export" showBack>
      <div className="space-y-7">
        {/* ── Header ── */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5 mb-1">
              <div className="w-8 h-8 rounded-xl bg-green-500 flex items-center justify-center shadow-sm">
                <WhatsAppIcon className="h-4 w-4 text-white" />
              </div>
              <h1 className="font-display font-bold text-2xl sm:text-3xl text-zinc-900">
                WhatsApp Export
              </h1>
            </div>
            <p className="text-sm text-zinc-500 ml-10.5">
              {allPosts.length} post{allPosts.length !== 1 ? "s" : ""} ready to
              share
            </p>
          </div>

          {/* Stats pill */}
          <div className="flex items-center gap-3 bg-green-50 border border-green-100 rounded-2xl px-4 py-2.5 self-start sm:self-auto">
            <div className="text-center">
              <p className="text-xs text-green-600 font-medium">This Week</p>
              <p className="text-lg font-bold text-green-700 leading-tight">
                {
                  allPosts.filter(
                    (p) =>
                      Math.floor(
                        (Date.now() - new Date(p.publishedAt).getTime()) /
                          86400000,
                      ) <= 7,
                  ).length
                }
              </p>
            </div>
            <div className="w-px h-8 bg-green-200" />
            <div className="text-center">
              <p className="text-xs text-green-600 font-medium">This Month</p>
              <p className="text-lg font-bold text-green-700 leading-tight">
                {
                  allPosts.filter(
                    (p) =>
                      Math.floor(
                        (Date.now() - new Date(p.publishedAt).getTime()) /
                          86400000,
                      ) <= 30,
                  ).length
                }
              </p>
            </div>
          </div>
        </div>

        {/* ── Filter Tabs ── */}
        <div className="flex items-center gap-2 bg-zinc-100 rounded-2xl p-1 self-start w-fit">
          {(["all", "week", "month"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              className={cn(
                "px-4 py-2 text-sm font-semibold rounded-xl whitespace-nowrap transition-all duration-150 cursor-pointer",
                filter === tab
                  ? "bg-white text-zinc-900 shadow-sm"
                  : "text-zinc-500 hover:text-zinc-700",
              )}
            >
              {tab === "all"
                ? `All (${allPosts.length})`
                : tab === "week"
                  ? "This Week"
                  : "This Month"}
            </button>
          ))}
        </div>

        {/* ── Grid ── */}
        {filteredPosts.length === 0 ? (
          <div className="bg-white rounded-2xl border border-surface-100 p-10 text-center">
            <p className="text-sm text-zinc-400">
              No posts found for this period
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredPosts.map((post) => {
              const isExpanded = expandedCaptions.has(post.id);
              const fullCaption = `${post.caption}${post.hashtags?.length ? "\n\n" + post.hashtags.map((h) => `#${h}`).join(" ") : ""}`;
              const captionIsCopyied = copiedCaption === post.id;
              const linkIsCopied = copiedLink === post.id;

              return (
                <div
                  key={post.id}
                  className="group bg-white rounded-2xl border border-zinc-100 shadow-sm hover:shadow-md transition-shadow duration-200 overflow-hidden flex flex-col"
                >
                  {/* ── Image (fixed height, not square) ── */}
                  <div className="relative h-44 w-full bg-zinc-100 overflow-hidden shrink-0">
                    <img
                      src={post.imageUrl}
                      alt="Post"
                      crossOrigin="anonymous"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    {/* Gradient overlay at bottom */}
                    <div className="absolute inset-x-0 bottom-0 h-16 bg-linear-to-t from-black/50 to-transparent" />
                    {/* Platform badge */}
                    <span
                      className={cn(
                        "absolute top-2.5 left-2.5 text-[10px] font-bold px-2 py-0.5 rounded-full border backdrop-blur-sm",
                        post.platform === "instagram"
                          ? "bg-pink-50/90 text-pink-700 border-pink-200"
                          : post.platform === "facebook"
                            ? "bg-blue-50/90 text-blue-700 border-blue-200"
                            : "bg-violet-50/90 text-violet-700 border-violet-200",
                      )}
                    >
                      {post.platform === "instagram"
                        ? "📷 IG"
                        : post.platform === "facebook"
                          ? "👍 FB"
                          : "📱 Both"}
                    </span>
                    {/* Action icons overlaid on image bottom-right */}
                    <div className="absolute bottom-2.5 right-2.5 flex gap-1.5">
                      <button
                        onClick={() => handleCopyLink(post)}
                        className="w-7 h-7 rounded-lg bg-black/50 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/70 transition-colors cursor-pointer"
                        title="Copy image link"
                      >
                        {linkIsCopied ? (
                          <Check className="h-3 w-3" />
                        ) : (
                          <Link2 className="h-3 w-3" />
                        )}
                      </button>
                      <button
                        onClick={() => handleDownload(post.imageUrl, post.id)}
                        className="w-7 h-7 rounded-lg bg-black/50 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/70 transition-colors cursor-pointer"
                        title="Download image"
                      >
                        <Download className="h-3 w-3" />
                      </button>
                    </div>
                  </div>

                  {/* ── Content ── */}
                  <div className="p-3 flex flex-col gap-2.5">
                    {/* Caption — always 2 lines, expand on tap */}
                    <div>
                      <p
                        className={cn(
                          "text-xs text-zinc-600 leading-relaxed",
                          !isExpanded && "line-clamp-2",
                        )}
                      >
                        {fullCaption}
                      </p>
                      {fullCaption.length > 80 && (
                        <button
                          onClick={() => toggleCaption(post.id)}
                          className="flex items-center gap-0.5 text-[11px] text-brand-500 font-semibold mt-1 cursor-pointer"
                        >
                          {isExpanded ? (
                            <>
                              <ChevronUp className="h-3 w-3" />
                              Less
                            </>
                          ) : (
                            <>
                              <ChevronDown className="h-3 w-3" />
                              More
                            </>
                          )}
                        </button>
                      )}
                    </div>

                    {/* Product pill — compact single row */}
                    {post.productId && (
                      <div className="flex items-center gap-2 bg-brand-50 border border-brand-100 rounded-xl px-2.5 py-2">
                        <button
                          onClick={() =>
                            navigate(`/products/${post.productId}`)
                          }
                          className="flex-1 min-w-0 flex items-center gap-1 text-xs font-semibold text-brand-700 hover:text-brand-900 transition-colors cursor-pointer truncate text-left"
                        >
                          <ExternalLink className="h-3 w-3 shrink-0" />
                          <span className="truncate">
                            {post.productTitle || "View Product"}
                          </span>
                        </button>
                        {post.productUrl && (
                          <button
                            onClick={() => handleCopyProductLink(post)}
                            className="shrink-0 flex items-center gap-1 text-[10px] font-bold text-brand-600 hover:text-brand-800 bg-white border border-brand-200 rounded-lg px-2 py-1 transition-all cursor-pointer"
                          >
                            <Copy className="h-2.5 w-2.5" />
                            Copy
                          </button>
                        )}
                      </div>
                    )}

                    {/* Main actions — single row */}
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleCopyCaption(post)}
                        className={cn(
                          "flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer border min-h-11",
                          captionIsCopyied
                            ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                            : "bg-zinc-50 border-zinc-200 text-zinc-600 hover:bg-zinc-100",
                        )}
                      >
                        {captionIsCopyied ? (
                          <Check className="h-3.5 w-3.5" />
                        ) : (
                          <Copy className="h-3.5 w-3.5" />
                        )}
                        {captionIsCopyied ? "Copied!" : "Copy"}
                      </button>
                      <button
                        onClick={async () => {
                          await handleDownload(post.imageUrl, post.id);
                          handleShare(post);
                        }}
                        className="flex-2 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold text-white bg-green-500 hover:bg-green-600 active:scale-[0.98] transition-all cursor-pointer shadow-sm min-h-11"
                      >
                        <WhatsAppIcon className="h-4 w-4" />
                        Share
                      </button>
                    </div>

                    {/* Tip */}
                    <p className="text-[10px] text-zinc-400 leading-relaxed text-center">
                      💡 Clicking{" "}
                      <span className="font-semibold text-zinc-500">Share</span>{" "}
                      saves the image &amp; opens WhatsApp with the caption.
                      Attach the saved image in the chat.
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </PageWrapper>
  );
}
