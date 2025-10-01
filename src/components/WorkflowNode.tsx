import { GripVertical, Zap, Mail, Database, FileText, Image, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

export type NodeType = "trigger" | "action" | "condition" | "data" | "ai";

export interface WorkflowNodeData {
  id: string;
  type: NodeType;
  title: string;
  description?: string;
  x: number;
  y: number;
  icon?: string;
}

interface WorkflowNodeProps {
  data: WorkflowNodeData;
  isSelected?: boolean;
  onSelect?: () => void;
  isDragging?: boolean;
}

const nodeTypeConfig: Record<
  NodeType,
  { icon: typeof Zap; gradient: string; border: string }
> = {
  trigger: {
    icon: Zap,
    gradient: "bg-gradient-accent",
    border: "border-accent/50",
  },
  action: {
    icon: Mail,
    gradient: "bg-gradient-primary",
    border: "border-primary/50",
  },
  condition: {
    icon: FileText,
    gradient: "bg-muted",
    border: "border-border",
  },
  data: {
    icon: Database,
    gradient: "bg-gradient-primary",
    border: "border-primary/50",
  },
  ai: {
    icon: Image,
    gradient: "bg-gradient-hero",
    border: "border-accent/50",
  },
};

export const WorkflowNode = ({
  data,
  isSelected = false,
  onSelect,
  isDragging = false,
}: WorkflowNodeProps) => {
  const config = nodeTypeConfig[data.type];
  const Icon = config.icon;

  return (
    <div
      onClick={onSelect}
      className={cn(
        "absolute w-64 rounded-lg border-2 bg-card backdrop-blur-sm transition-all cursor-move",
        "hover:shadow-lg hover:scale-[1.02]",
        config.border,
        isSelected && "ring-2 ring-primary shadow-glow scale-[1.02]",
        isDragging && "opacity-50 cursor-grabbing"
      )}
      style={{
        left: `${data.x}px`,
        top: `${data.y}px`,
      }}
    >
      {/* Drag Handle */}
      <div className="absolute -left-3 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
        <GripVertical className="w-6 h-6 text-muted-foreground" />
      </div>

      {/* Node Header */}
      <div className={cn("px-4 py-3 rounded-t-lg", config.gradient)}>
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-md bg-background/20 backdrop-blur">
            <Icon className="w-4 h-4 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-sm text-white truncate">
              {data.title}
            </h3>
          </div>
        </div>
      </div>

      {/* Node Body */}
      {data.description && (
        <div className="px-4 py-3 border-t border-border/50">
          <p className="text-xs text-muted-foreground line-clamp-2">
            {data.description}
          </p>
        </div>
      )}

      {/* Connection Points */}
      <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-primary border-2 border-background" />
      <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-primary border-2 border-background" />
    </div>
  );
};
