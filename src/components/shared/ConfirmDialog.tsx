import * as Dialog from "@radix-ui/react-dialog";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/Button";

interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description: string;
  onConfirm: () => void;
  confirmText?: string;
  cancelText?: string;
  isConfirming?: boolean;
  variant?: 'danger' | 'success' | 'primary';
}

export function ConfirmDialog({
  open,
  onClose,
  title,
  description,
  onConfirm,
  confirmText = "Confirm",
  cancelText = "Cancel",
  isConfirming = false,
  variant = 'danger',
}: ConfirmDialogProps) {
  // Block backdrop click + Escape while async op is in flight
  const handleOpenChange = (next: boolean) => {
    if (isConfirming) return;
    if (!next) onClose();
  };

  return (
    <Dialog.Root open={open} onOpenChange={handleOpenChange}>
      <AnimatePresence>
        {open && (
          <Dialog.Portal forceMount>
            <Dialog.Overlay asChild>
              <motion.div
                className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.18 }}
              />
            </Dialog.Overlay>

            <Dialog.Content
              asChild
              // Prevent Escape from closing while confirming
              onEscapeKeyDown={e => { if (isConfirming) e.preventDefault() }}
              // Prevent pointer-down-outside from closing while confirming
              onPointerDownOutside={e => { if (isConfirming) e.preventDefault() }}
            >
              <motion.div
                className="fixed bottom-0 left-0 right-0 z-50
                  md:inset-0 md:flex md:items-center md:justify-center
                  bg-transparent"
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                exit={{ y: "100%" }}
                transition={{ type: "spring", damping: 28, stiffness: 320 }}
              >
                <div
                  className="w-full md:w-auto md:max-w-120 md:mx-auto
                    bg-white md:rounded-2xl rounded-t-3xl safe-bottom
                    overflow-hidden shadow-2xl ring-1 ring-black/6
                    relative"
                >
                  {/* progress bar — animates in while isConfirming */}
                  <AnimatePresence>
                    {isConfirming && (
                      <motion.div
                        className={`absolute top-0 left-0 right-0 h-0.5 z-10 overflow-hidden ${
                          variant === 'success' ? 'bg-emerald-100' : variant === 'primary' ? 'bg-brand-100' : 'bg-red-100'
                        }`}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                      >
                        <motion.div
                          className={`h-full rounded-full ${
                            variant === 'success' ? 'bg-emerald-500' : variant === 'primary' ? 'bg-brand-600' : 'bg-red-500'
                          }`}
                          initial={{ x: "-100%" }}
                          animate={{ x: "100%" }}
                          transition={{ repeat: Infinity, duration: 1.1, ease: "easeInOut" }}
                        />
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* drag pill — mobile only */}
                  <div className="flex justify-center pt-3 pb-1 md:hidden">
                    <div className="w-9 h-1 rounded-full bg-zinc-200" />
                  </div>

                  <div className="px-6 pt-5 pb-6 md:pt-7 md:pb-7">
                    {/* icon */}
                    <motion.div
                      animate={isConfirming ? { scale: [1, 1.08, 1], opacity: [1, 0.6, 1] } : {}}
                      transition={{ repeat: Infinity, duration: 1.4, ease: "easeInOut" }}
                      className={`flex items-center justify-center w-11 h-11 rounded-2xl mb-4 ${
                        variant === 'success' ? 'bg-emerald-50' : variant === 'primary' ? 'bg-brand-50' : 'bg-red-50'
                      }`}
                    >
                      <AlertTriangle className={`h-5 w-5 ${
                        variant === 'success' ? 'text-emerald-500' : variant === 'primary' ? 'text-brand-600' : 'text-red-500'
                      }`} strokeWidth={2} />
                    </motion.div>

                    <Dialog.Title className="font-display font-bold text-[1.0625rem] leading-snug text-zinc-900 mb-1.5">
                      {title}
                    </Dialog.Title>

                    <Dialog.Description className="text-sm text-zinc-500 leading-relaxed mb-7">
                      {isConfirming ? "Please wait…" : description}
                    </Dialog.Description>

                    <div className="flex flex-col-reverse gap-2.5 sm:flex-row sm:justify-end sm:gap-3">
                      <Button
                        variant="secondary"
                        onClick={onClose}
                        disabled={isConfirming}
                      >
                        {cancelText}
                      </Button>
                      <Button
                        variant={variant}
                        onClick={onConfirm}
                        loading={isConfirming}
                      >
                        {confirmText}
                      </Button>
                    </div>
                  </div>
                </div>
              </motion.div>
            </Dialog.Content>
          </Dialog.Portal>
        )}
      </AnimatePresence>
    </Dialog.Root>
  );
}
