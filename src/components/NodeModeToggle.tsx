import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Bot, Cog } from "lucide-react";
import { cn } from "@/lib/utils";
import type { NodeExecutionMode } from "@/types/workflow-authoring";

interface NodeModeToggleProps {
  mode: NodeExecutionMode;
  onChange: (mode: NodeExecutionMode) => void;
  compact?: boolean;
}

/**
 * Wave 2 leapfrog — Unified Agent + Workflow node toggle.
 * Flip any node between deterministic and agent execution on the same canvas.
 */
export const NodeModeToggle = ({ mode, onChange, compact }: NodeModeToggleProps) => {
  const isAgent = mode === "agent";
  return (
    <div className={cn(
      "flex items-center gap-2 p-2 rounded-lg glass border border-border/40",
      compact && "p-1.5 text-xs"
    )}>
      <Cog className={cn("w-4 h-4 transition-colors", !isAgent ? "text-primary" : "text-muted-foreground")} />
      <span className={cn("text-xs font-medium", !isAgent && "text-primary")}>Deterministic</span>
      <Switch
        checked={isAgent}
        onCheckedChange={(v) => onChange(v ? "agent" : "deterministic")}
      />
      <span className={cn("text-xs font-medium", isAgent && "text-primary")}>Agent</span>
      <Bot className={cn("w-4 h-4 transition-colors", isAgent ? "text-primary" : "text-muted-foreground")} />
      {isAgent && <Badge variant="secondary" className="ml-auto text-[10px]">LLM-driven</Badge>}
    </div>
  );
};
