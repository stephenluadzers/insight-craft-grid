import { cn } from "@/lib/utils";
import type { NodeCategory } from "@/types/workflow";

interface NodeCategoryBadgeProps {
  category: NodeCategory;
  className?: string;
}

const categoryConfig: Record<NodeCategory, { label: string; className: string }> = {
  INPUT: {
    label: "INPUT",
    className: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  },
  PROCESS: {
    label: "PROCESS",
    className: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  },
  OUTPUT: {
    label: "OUTPUT",
    className: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  },
};

export const NodeCategoryBadge = ({ category, className }: NodeCategoryBadgeProps) => {
  const config = categoryConfig[category];

  return (
    <span
      className={cn(
        "inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider border",
        config.className,
        className
      )}
    >
      {config.label}
    </span>
  );
};
