import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Timer, CheckCircle, Loader2 } from "lucide-react";
import type { WorkflowExecutionProgress } from "@/types/workflow";

interface ExecutionProgressTimerProps {
  progress: WorkflowExecutionProgress | null;
  className?: string;
}

const formatTime = (ms: number): string => {
  if (ms < 1000) return `${ms}ms`;
  const seconds = (ms / 1000).toFixed(2);
  return `${seconds}s`;
};

export const ExecutionProgressTimer = ({ progress, className }: ExecutionProgressTimerProps) => {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!progress) {
      setElapsed(0);
      return;
    }

    const interval = setInterval(() => {
      const now = Date.now();
      setElapsed(now - progress.startedAt);
    }, 50); // Update every 50ms for smooth display

    return () => clearInterval(interval);
  }, [progress]);

  if (!progress) return null;

  const percentComplete = Math.min(
    (elapsed / progress.totalEstimatedMs) * 100,
    100
  );

  const isComplete = progress.nodeTimings.every(
    (t) => t.status === "completed" || t.status === "failed"
  );

  return (
    <div
      className={cn(
        "flex items-center gap-3 px-4 py-2 rounded-lg border bg-card/80 backdrop-blur-sm",
        className
      )}
    >
      {isComplete ? (
        <CheckCircle className="w-4 h-4 text-green-500" />
      ) : (
        <Loader2 className="w-4 h-4 text-primary animate-spin" />
      )}

      <div className="flex-1">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs font-medium text-foreground">
            {isComplete ? "Completed" : "Executing..."}
          </span>
          <span className="text-xs font-mono text-muted-foreground">
            {formatTime(elapsed)} / {formatTime(progress.totalEstimatedMs)}
          </span>
        </div>

        {/* Progress bar */}
        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
          <div
            className={cn(
              "h-full rounded-full transition-all duration-100",
              isComplete ? "bg-green-500" : "bg-primary"
            )}
            style={{ width: `${percentComplete}%` }}
          />
        </div>
      </div>

      <div className="flex items-center gap-1 text-xs text-muted-foreground">
        <Timer className="w-3 h-3" />
        <span className="font-mono">{formatTime(elapsed)}</span>
      </div>
    </div>
  );
};

// Mini inline timer for individual nodes
export const NodeExecutionTimer = ({
  startedAt,
  estimatedMs,
  status,
}: {
  startedAt?: number;
  estimatedMs?: number;
  status: "pending" | "running" | "completed" | "failed";
}) => {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (status !== "running" || !startedAt) return;

    const interval = setInterval(() => {
      setElapsed(Date.now() - startedAt);
    }, 100);

    return () => clearInterval(interval);
  }, [startedAt, status]);

  if (status === "pending") return null;

  return (
    <span
      className={cn(
        "text-[10px] font-mono px-1.5 py-0.5 rounded",
        status === "running" && "bg-primary/20 text-primary animate-pulse",
        status === "completed" && "bg-green-500/20 text-green-500",
        status === "failed" && "bg-red-500/20 text-red-500"
      )}
    >
      {formatTime(status === "completed" && estimatedMs ? estimatedMs : elapsed)}
    </span>
  );
};
