import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/Button";
import { Pause, Play } from "lucide-react";
import { ConfirmDialog } from "./ConfirmDialog";
import { cn } from "@utils/cn";
import { shopService } from "@/services/shopService";
import { useShopStore } from "@/store/shopStore";
import { useToast } from "@/hooks/useToast";

export function GlobalPauseButton() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const shop = useShopStore((s) => s.shop);
  const setShop = useShopStore((s) => s.setShop);
  const isPaused = shop?.isGlobalPaused ?? false;

  const [dialogOpen, setDialogOpen] = useState(false);

  const { mutate: togglePause, isPending } = useMutation({
    mutationFn: () => shopService.pauseShop(!isPaused),
    onMutate: () => {
      // Optimistic update
      if (shop) setShop({ ...shop, isGlobalPaused: !isPaused });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shop", "status"] });
      showToast(
        isPaused ? "Activity resumed" : "All activity paused",
        isPaused ? "success" : "info"
      );
      setDialogOpen(false);
    },
    onError: () => {
      // Rollback optimistic update
      if (shop) setShop({ ...shop, isGlobalPaused: isPaused });
      showToast("Failed to update pause state. Please try again.", "error");
      setDialogOpen(false);
    },
  });

  return (
    <>
      <Button
        onClick={() => setDialogOpen(true)}
        disabled={isPending}
        className={cn(
          'rounded-full px-4 py-2.5 flex items-center gap-2 font-medium transition-all border',
          isPaused
            ? 'bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100'
            : 'bg-red-50 border-red-200 text-red-700 hover:bg-red-100'
        )}
      >
        <div className="relative">
          {isPaused ? (
            <Play className="h-4 w-4" />
          ) : (
            <Pause className="h-4 w-4" />
          )}
          {isPaused && (
            <div className="absolute inset-0 rounded-full animate-pulse bg-amber-400 opacity-50" />
          )}
        </div>
        <span className="text-sm">
          {isPaused ? "▶ Resume All" : "⏸ Pause All"}
        </span>
      </Button>

      <ConfirmDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        title={isPaused ? "Resume activity?" : "Pause all activity?"}
        description={
          isPaused
            ? "All scheduled posts and ads will resume from where they stopped."
            : "This will stop all scheduled posts, ads, and content generation immediately. You can resume at any time."
        }
        onConfirm={() => togglePause()}
        confirmText={isPaused ? "Resume Everything" : "Pause Everything"}
        variant={isPaused ? "success" : "danger"}
        isConfirming={isPending}
      />
    </>
  );
}
