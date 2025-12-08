import { useState, useEffect } from "react";
import { CheckCircle2, Cloud, CloudOff, Loader2, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export type AutosaveStatus = "saved" | "saving" | "unsaved" | "error" | "offline";

interface AutosaveIndicatorProps {
  status: AutosaveStatus;
  lastSaved?: Date;
  className?: string;
}

export function AutosaveIndicator({ status, lastSaved, className }: AutosaveIndicatorProps) {
  const [timeAgo, setTimeAgo] = useState<string>("");

  useEffect(() => {
    if (!lastSaved) return;

    const updateTimeAgo = () => {
      const now = new Date();
      const diff = now.getTime() - lastSaved.getTime();
      
      if (diff < 5000) {
        setTimeAgo("Just now");
      } else if (diff < 60000) {
        setTimeAgo(`${Math.floor(diff / 1000)}s ago`);
      } else if (diff < 3600000) {
        setTimeAgo(`${Math.floor(diff / 60000)}m ago`);
      } else {
        setTimeAgo(`${Math.floor(diff / 3600000)}h ago`);
      }
    };

    updateTimeAgo();
    const interval = setInterval(updateTimeAgo, 10000);
    return () => clearInterval(interval);
  }, [lastSaved]);

  const getStatusConfig = () => {
    switch (status) {
      case "saved":
        return {
          icon: <CheckCircle2 className="h-3.5 w-3.5" />,
          text: "Saved",
          color: "text-green-600 dark:text-green-400",
          bgColor: "bg-green-500/10",
          borderColor: "border-green-500/30",
        };
      case "saving":
        return {
          icon: <Loader2 className="h-3.5 w-3.5 animate-spin" />,
          text: "Saving...",
          color: "text-blue-600 dark:text-blue-400",
          bgColor: "bg-blue-500/10",
          borderColor: "border-blue-500/30",
        };
      case "unsaved":
        return {
          icon: <Cloud className="h-3.5 w-3.5" />,
          text: "Unsaved changes",
          color: "text-yellow-600 dark:text-yellow-400",
          bgColor: "bg-yellow-500/10",
          borderColor: "border-yellow-500/30",
        };
      case "error":
        return {
          icon: <AlertCircle className="h-3.5 w-3.5" />,
          text: "Save failed",
          color: "text-red-600 dark:text-red-400",
          bgColor: "bg-red-500/10",
          borderColor: "border-red-500/30",
        };
      case "offline":
        return {
          icon: <CloudOff className="h-3.5 w-3.5" />,
          text: "Offline",
          color: "text-gray-600 dark:text-gray-400",
          bgColor: "bg-gray-500/10",
          borderColor: "border-gray-500/30",
        };
    }
  };

  const config = getStatusConfig();

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className={cn(
              "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-medium transition-all",
              config.color,
              config.bgColor,
              config.borderColor,
              className
            )}
          >
            {config.icon}
            <span>{config.text}</span>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <div className="text-sm">
            <p className="font-medium">{config.text}</p>
            {lastSaved && status === "saved" && (
              <p className="text-muted-foreground">Last saved: {timeAgo}</p>
            )}
            {status === "error" && (
              <p className="text-muted-foreground">Click to retry</p>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// Hook for managing autosave state
export function useAutosave() {
  const [status, setStatus] = useState<AutosaveStatus>("saved");
  const [lastSaved, setLastSaved] = useState<Date | undefined>(new Date());
  const [pendingChanges, setPendingChanges] = useState(false);

  const markUnsaved = () => {
    setPendingChanges(true);
    setStatus("unsaved");
  };

  const startSaving = () => {
    setStatus("saving");
  };

  const markSaved = () => {
    setPendingChanges(false);
    setStatus("saved");
    setLastSaved(new Date());
  };

  const markError = () => {
    setStatus("error");
  };

  const markOffline = () => {
    setStatus("offline");
  };

  return {
    status,
    lastSaved,
    pendingChanges,
    markUnsaved,
    startSaving,
    markSaved,
    markError,
    markOffline,
  };
}
