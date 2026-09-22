import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ChevronLeft } from "lucide-react";
import { cn } from "@utils/cn";

interface PageWrapperProps {
  title: string;
  showBack?: boolean;
  backLabel?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

const pageVariants = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -4 },
};

export function PageWrapper({ children, title, className, showBack, backLabel, action }: PageWrapperProps) {
  const navigate = useNavigate();

  useEffect(() => {
    document.title = `${title} | VisualFlow AI`;
  }, [title]);

  const showHeader = showBack || !!action;

  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={{ duration: 0.15 }}
      className={cn(
        "px-4 py-4 md:px-6 md:py-6 max-w-7xl mx-auto",
        className,
      )}
    >
      {showHeader && (
        <div className="flex items-center gap-3 mb-5">
          {showBack && (
            <button
              onClick={() => navigate(-1)}
              className="cursor-pointer flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-sm font-medium text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 active:bg-zinc-200 transition-all duration-150 shrink-0 min-h-9"
              aria-label="Go back"
            >
              <ChevronLeft className="h-4 w-4" />
              <span>{backLabel ?? "Back"}</span>
            </button>
          )}
          <h1 className="font-display font-bold text-zinc-900 text-lg flex-1">{title}</h1>
          {action && <div className="shrink-0">{action}</div>}
        </div>
      )}
      {children}
    </motion.div>
  );
}
