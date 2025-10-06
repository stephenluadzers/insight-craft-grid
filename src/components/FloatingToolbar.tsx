import { Zap, Mail, Database, FileText, Image as ImageIcon, Moon, Sun, Loader2, Sparkles } from "lucide-react";
import { Button } from "./ui/button";
import { NodeType } from "./WorkflowNode";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface FloatingToolbarProps {
  onAddNode: (type: NodeType) => void;
  workflow: any;
  onOptimized: (nodes: any[]) => void;
}

const nodeButtons: Array<{ type: NodeType; icon: typeof Zap; label: string }> = [
  { type: "trigger", icon: Zap, label: "Trigger" },
  { type: "action", icon: Mail, label: "Action" },
  { type: "condition", icon: FileText, label: "Condition" },
  { type: "data", icon: Database, label: "Data" },
  { type: "ai", icon: ImageIcon, label: "AI" },
];

export const FloatingToolbar = ({ onAddNode, workflow, onOptimized }: FloatingToolbarProps): JSX.Element => {
  const [isDark, setIsDark] = useState(false);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    // Check initial theme
    const dark = document.documentElement.classList.contains("dark");
    setIsDark(dark);
  }, []);

  const toggleTheme = () => {
    const newTheme = !isDark;
    setIsDark(newTheme);
    document.documentElement.classList.toggle("dark", newTheme);
  };

  const handleOptimize = async () => {
    if (!workflow?.nodes?.length) {
      toast({
        title: "No workflow",
        description: "Create some nodes first to optimize",
        variant: "destructive",
      });
      return;
    }

    setIsOptimizing(true);
    try {
      const { data, error } = await supabase.functions.invoke('optimize-workflow', {
        body: { 
          workflow: { nodes: workflow.nodes },
          userContext: "General workflow automation"
        }
      });

      if (error) throw error;

      if (data?.optimizedWorkflow?.nodes) {
        onOptimized(data.optimizedWorkflow.nodes);
        toast({
          title: "Workflow Optimized!",
          description: data.optimizedWorkflow.insights || "AI Genius enhanced your workflow",
        });
      }
    } catch (error: any) {
      toast({
        title: "Optimization Failed",
        description: error.message || "Failed to optimize workflow",
        variant: "destructive",
      });
    } finally {
      setIsOptimizing(false);
    }
  };

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-slide-up">
      <div className="flex items-center gap-2 p-2 rounded-2xl bg-card/95 backdrop-blur-xl border border-border shadow-lg">
        {/* Add Node Buttons */}
        {nodeButtons.map(({ type, icon: Icon, label }) => (
          <Button
            key={type}
            onClick={() => onAddNode(type)}
            variant="ghost"
            size="sm"
            className={cn(
              "flex items-center gap-2 rounded-xl transition-all",
              "hover:bg-primary hover:text-primary-foreground",
              "active:scale-95"
            )}
          >
            <Icon className="w-4 h-4" />
            <span className="text-xs font-medium hidden sm:inline">{label}</span>
          </Button>
        ))}

        {/* Divider */}
        <div className="w-px h-6 bg-border" />

        {/* AI Optimizer */}
        <Button
          onClick={handleOptimize}
          disabled={isOptimizing || !workflow?.nodes?.length}
          variant="ghost"
          size="sm"
          className={cn(
            "flex items-center gap-2 rounded-xl",
            "bg-gradient-accent hover:shadow-glow",
            "text-primary-foreground",
            "disabled:opacity-50 disabled:pointer-events-none"
          )}
        >
          {isOptimizing ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-xs font-medium hidden sm:inline">Optimizing...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              <span className="text-xs font-medium hidden sm:inline">AI Genius</span>
            </>
          )}
        </Button>

        {/* Divider */}
        <div className="w-px h-6 bg-border" />

        {/* Theme Toggle */}
        <Button
          onClick={toggleTheme}
          variant="ghost"
          size="sm"
          className="rounded-xl hover:bg-accent hover:text-accent-foreground"
        >
          {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </Button>
      </div>
    </div>
  );
};
