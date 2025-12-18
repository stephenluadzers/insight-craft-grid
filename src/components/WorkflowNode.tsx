import { GripVertical, Zap, Mail, Database, FileText, Image, Clock, Shield, Bot, Brain, Target, Play, Eye, MessageSquare, Plug, Wand2, CheckCircle, GraduationCap, Type, Video, ImagePlus, Paintbrush, Volume2, Mic } from "lucide-react";
import { cn } from "@/lib/utils";
import { NodeCategoryBadge } from "./NodeCategoryBadge";
import type { NodeType, WorkflowNodeData } from "@/types/workflow";
import { getNodeCategory } from "@/types/workflow";

// Re-export for backward compatibility
export type { NodeType, WorkflowNodeData };

interface WorkflowNodeProps {
  data: WorkflowNodeData;
  isSelected?: boolean;
  onSelect?: () => void;
  isDragging?: boolean;
  showCategory?: boolean;
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
  utility: {
    icon: FileText,
    gradient: "bg-gradient-primary",
    border: "border-primary/50",
  },
  security: {
    icon: Zap,
    gradient: "bg-gradient-accent",
    border: "border-accent/50",
  },
  storage: {
    icon: Database,
    gradient: "bg-gradient-primary",
    border: "border-primary/50",
  },
  agent_handoff: {
    icon: Mail,
    gradient: "bg-gradient-hero",
    border: "border-accent/50",
  },
  connector: {
    icon: Zap,
    gradient: "bg-gradient-primary",
    border: "border-primary/50",
  },
  checkpointer: {
    icon: Clock,
    gradient: "bg-gradient-accent",
    border: "border-accent/50",
  },
  error_handler: {
    icon: Zap,
    gradient: "bg-gradient-primary",
    border: "border-primary/50",
  },
  circuit_breaker: {
    icon: Zap,
    gradient: "bg-gradient-accent",
    border: "border-accent/50",
  },
  guardrail: {
    icon: Shield,
    gradient: "bg-gradient-to-br from-orange-500 to-red-600",
    border: "border-orange-500/50",
  },
  // AI Agent Types
  ai_orchestrator: {
    icon: Bot,
    gradient: "bg-gradient-to-br from-emerald-500 to-teal-600",
    border: "border-emerald-500/50",
  },
  ai_reasoner: {
    icon: Brain,
    gradient: "bg-gradient-to-br from-purple-500 to-indigo-600",
    border: "border-purple-500/50",
  },
  ai_planner: {
    icon: Target,
    gradient: "bg-gradient-to-br from-blue-500 to-cyan-600",
    border: "border-blue-500/50",
  },
  ai_executor: {
    icon: Play,
    gradient: "bg-gradient-to-br from-green-500 to-emerald-600",
    border: "border-green-500/50",
  },
  ai_monitor: {
    icon: Eye,
    gradient: "bg-gradient-to-br from-amber-500 to-orange-600",
    border: "border-amber-500/50",
  },
  ai_communicator: {
    icon: MessageSquare,
    gradient: "bg-gradient-to-br from-pink-500 to-rose-600",
    border: "border-pink-500/50",
  },
  ai_integrator: {
    icon: Plug,
    gradient: "bg-gradient-to-br from-violet-500 to-purple-600",
    border: "border-violet-500/50",
  },
  ai_transformer: {
    icon: Wand2,
    gradient: "bg-gradient-to-br from-fuchsia-500 to-pink-600",
    border: "border-fuchsia-500/50",
  },
  ai_validator: {
    icon: CheckCircle,
    gradient: "bg-gradient-to-br from-lime-500 to-green-600",
    border: "border-lime-500/50",
  },
  ai_learner: {
    icon: GraduationCap,
    gradient: "bg-gradient-to-br from-sky-500 to-blue-600",
    border: "border-sky-500/50",
  },
  // Media generation types (Easy-Peasy.AI inspired)
  text_generation: {
    icon: Type,
    gradient: "bg-gradient-to-br from-cyan-500 to-blue-600",
    border: "border-cyan-500/50",
  },
  text_to_image: {
    icon: ImagePlus,
    gradient: "bg-gradient-to-br from-pink-500 to-purple-600",
    border: "border-pink-500/50",
  },
  image_to_image: {
    icon: Paintbrush,
    gradient: "bg-gradient-to-br from-orange-500 to-pink-600",
    border: "border-orange-500/50",
  },
  image_to_video: {
    icon: Video,
    gradient: "bg-gradient-to-br from-red-500 to-orange-600",
    border: "border-red-500/50",
  },
  text_to_video: {
    icon: Video,
    gradient: "bg-gradient-to-br from-violet-500 to-fuchsia-600",
    border: "border-violet-500/50",
  },
  upscale_image: {
    icon: ImagePlus,
    gradient: "bg-gradient-to-br from-teal-500 to-cyan-600",
    border: "border-teal-500/50",
  },
  style_transfer: {
    icon: Paintbrush,
    gradient: "bg-gradient-to-br from-yellow-500 to-orange-600",
    border: "border-yellow-500/50",
  },
  audio_synthesis: {
    icon: Volume2,
    gradient: "bg-gradient-to-br from-indigo-500 to-purple-600",
    border: "border-indigo-500/50",
  },
  transcription: {
    icon: Mic,
    gradient: "bg-gradient-to-br from-green-500 to-teal-600",
    border: "border-green-500/50",
  },
};

export const WorkflowNode = ({
  data,
  isSelected = false,
  onSelect,
  isDragging = false,
  showCategory = true,
}: WorkflowNodeProps) => {
  // Fallback to 'action' type if invalid type is provided
  const nodeType = data.type in nodeTypeConfig ? data.type : 'action';
  const config = nodeTypeConfig[nodeType];
  const Icon = config.icon;
  const category = getNodeCategory(nodeType);

  return (
    <div
      data-node-id={data.id}
      onClick={onSelect}
      className={cn(
        "absolute w-64 rounded-lg border-2 bg-card backdrop-blur-sm transition-all duration-300 cursor-move group",
        "hover:shadow-glow hover:scale-105",
        config.border,
        isSelected && "ring-2 ring-primary shadow-glow-lg scale-105 z-10",
        isDragging && "opacity-60 cursor-grabbing scale-95"
      )}
      style={{
        left: `${data.x}px`,
        top: `${data.y}px`,
        transition: isDragging ? "none" : "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
      }}
    >
      {/* Drag Handle */}
      <div className="absolute -left-3 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-all duration-200">
        <div className="p-1 rounded bg-background/90 shadow-sm border">
          <GripVertical className="w-4 h-4 text-muted-foreground" />
        </div>
      </div>

      {/* Category Badge (Easy-Peasy.AI style) */}
      {showCategory && (
        <div className="absolute -top-6 left-2">
          <NodeCategoryBadge category={category} />
        </div>
      )}

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

      {/* Connection Points with pulse animation */}
      <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-primary border-2 border-background transition-all duration-200 group-hover:scale-110 group-hover:shadow-glow" />
      <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-primary border-2 border-background transition-all duration-200 group-hover:scale-110 group-hover:shadow-glow" />
    </div>
  );
};
