import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { FolderOpen, Trash2 } from "lucide-react";
import type { StickyColor } from "@/types/workflow-canvas";
import { cn } from "@/lib/utils";

const COLOR_RING: Record<StickyColor, string> = {
  amber: "border-amber-500/40 bg-amber-500/5",
  rose: "border-rose-500/40 bg-rose-500/5",
  violet: "border-violet-500/40 bg-violet-500/5",
  emerald: "border-emerald-500/40 bg-emerald-500/5",
  sky: "border-sky-500/40 bg-sky-500/5",
  slate: "border-slate-500/40 bg-slate-500/5",
};

interface GroupFrameProps {
  label: string;
  color: StickyColor;
  width: number;
  height: number;
  memberCount: number;
  onLabelChange: (label: string) => void;
  onDelete: () => void;
}

/** Wave 3 — Wraps a region of nodes for visual grouping. */
export function GroupFrame({
  label,
  color,
  width,
  height,
  memberCount,
  onLabelChange,
  onDelete,
}: GroupFrameProps) {
  return (
    <Card
      style={{ width, height }}
      className={cn(
        "border-2 border-dashed backdrop-blur-sm relative pointer-events-auto",
        COLOR_RING[color]
      )}
    >
      <div className="absolute -top-9 left-0 right-0 flex items-center gap-2">
        <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-background/80 backdrop-blur-md border text-xs">
          <FolderOpen className="h-3 w-3" />
          <Input
            value={label}
            onChange={(e) => onLabelChange(e.target.value)}
            className="h-5 px-1 text-xs border-none bg-transparent w-32 focus-visible:ring-0"
            placeholder="Group name"
          />
          <span className="text-muted-foreground">· {memberCount} nodes</span>
        </div>
        <Button size="icon" variant="ghost" className="h-6 w-6" onClick={onDelete}>
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>
    </Card>
  );
}
