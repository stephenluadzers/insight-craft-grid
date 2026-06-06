import { cn } from "@/lib/utils";
import { AlertTriangle } from "lucide-react";

interface ErrorPortHandleProps {
  active?: boolean;
  onClick?: (e: React.MouseEvent) => void;
  title?: string;
}

/**
 * Wave 1 — Visual error-branch port (Make-style).
 * A small red handle that lives on the bottom-right of a workflow node
 * and represents the "on failure" outbound edge.
 */
export const ErrorPortHandle = ({ active = false, onClick, title }: ErrorPortHandleProps) => {
  return (
    <button
      type="button"
      onClick={(e) => { e.stopPropagation(); onClick?.(e); }}
      title={title ?? "Failure branch"}
      className={cn(
        "absolute -bottom-2 -right-2 w-4 h-4 rounded-full border-2 border-background",
        "flex items-center justify-center transition-all duration-200",
        "shadow-glow hover:scale-125 group/err",
        active
          ? "bg-destructive"
          : "bg-destructive/70 hover:bg-destructive",
      )}
    >
      <AlertTriangle className="w-2 h-2 text-destructive-foreground opacity-0 group-hover/err:opacity-100" />
      <span
        className={cn(
          "absolute inset-0 rounded-full bg-destructive opacity-20 animate-ping",
          !active && "hidden",
        )}
      />
    </button>
  );
};
