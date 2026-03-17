import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, XCircle, Loader2, Clock, Zap, ChevronDown, ChevronUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";

interface NodeExecution {
  nodeId: string;
  nodeType: string;
  status: "pending" | "running" | "success" | "error";
  startedAt?: string;
  completedAt?: string;
  durationMs?: number;
  message?: string;
  retryCount?: number;
}

interface ExecutionStreamProps {
  executionId: string | null;
  onClose?: () => void;
}

export function ExecutionStream({ executionId, onClose }: ExecutionStreamProps) {
  const [nodes, setNodes] = useState<NodeExecution[]>([]);
  const [overallStatus, setOverallStatus] = useState<"idle" | "running" | "success" | "error">("idle");
  const [expanded, setExpanded] = useState(true);
  const [totalDuration, setTotalDuration] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval>>();
  const startTimeRef = useRef<number>(Date.now());

  useEffect(() => {
    if (!executionId) return;

    setOverallStatus("running");
    startTimeRef.current = Date.now();

    // Live timer
    timerRef.current = setInterval(() => {
      setTotalDuration(Date.now() - startTimeRef.current);
    }, 100);

    // Subscribe to execution log changes
    const channel = supabase
      .channel(`exec-${executionId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "workflow_execution_logs",
          filter: `execution_id=eq.${executionId}`,
        },
        (payload: any) => {
          const log = payload.new;
          setNodes((prev) => {
            const existing = prev.findIndex((n) => n.nodeId === log.node_id && n.status === log.status);
            if (existing >= 0) return prev;

            const updated = prev.filter((n) => !(n.nodeId === log.node_id && log.status !== "running"));
            return [
              ...updated,
              {
                nodeId: log.node_id,
                nodeType: log.node_type,
                status: log.status as NodeExecution["status"],
                startedAt: log.started_at,
                completedAt: log.completed_at,
                durationMs: log.duration_ms,
                message: log.error_message || undefined,
                retryCount: log.retry_count,
              },
            ];
          });
        }
      )
      .subscribe();

    // Also subscribe to the execution record for final status
    const execChannel = supabase
      .channel(`exec-status-${executionId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "workflow_executions",
          filter: `id=eq.${executionId}`,
        },
        (payload: any) => {
          const exec = payload.new;
          if (exec.status === "success" || exec.status === "error") {
            setOverallStatus(exec.status);
            clearInterval(timerRef.current);
            setTotalDuration(exec.duration_ms || Date.now() - startTimeRef.current);
          }
        }
      )
      .subscribe();

    return () => {
      clearInterval(timerRef.current);
      supabase.removeChannel(channel);
      supabase.removeChannel(execChannel);
    };
  }, [executionId]);

  if (!executionId) return null;

  const statusIcon = {
    idle: <Clock className="w-4 h-4 text-muted-foreground" />,
    running: <Loader2 className="w-4 h-4 text-accent animate-spin" />,
    success: <CheckCircle2 className="w-4 h-4 text-green-500" />,
    error: <XCircle className="w-4 h-4 text-destructive" />,
  };

  const nodeStatusIcon = (status: NodeExecution["status"]) => {
    switch (status) {
      case "pending": return <Clock className="w-3.5 h-3.5 text-muted-foreground" />;
      case "running": return <Loader2 className="w-3.5 h-3.5 text-accent animate-spin" />;
      case "success": return <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />;
      case "error": return <XCircle className="w-3.5 h-3.5 text-destructive" />;
    }
  };

  const formatMs = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  return (
    <motion.div
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 100, opacity: 0 }}
      className="fixed bottom-20 right-6 w-80 bg-card border border-border rounded-xl shadow-lg overflow-hidden z-50"
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3 bg-muted/50 cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-2">
          {statusIcon[overallStatus]}
          <span className="text-sm font-semibold text-foreground">
            {overallStatus === "running" ? "Executing..." : overallStatus === "success" ? "Completed" : overallStatus === "error" ? "Failed" : "Idle"}
          </span>
          <Badge variant="outline" className="text-xs font-mono">
            {formatMs(totalDuration)}
          </Badge>
        </div>
        <div className="flex items-center gap-1">
          <Badge variant="secondary" className="text-xs">
            <Zap className="w-3 h-3 mr-1" />
            {nodes.filter((n) => n.status === "success").length}/{nodes.length}
          </Badge>
          {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
        </div>
      </div>

      {/* Node list */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: "auto" }}
            exit={{ height: 0 }}
            className="overflow-hidden"
          >
            <ScrollArea className="max-h-64">
              <div className="px-3 py-2 space-y-1">
                {nodes.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-4">Waiting for nodes...</p>
                )}
                {nodes.map((node, i) => (
                  <motion.div
                    key={`${node.nodeId}-${node.status}`}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="flex items-center gap-2 py-1.5 px-2 rounded-md hover:bg-muted/50 transition-colors"
                  >
                    {nodeStatusIcon(node.status)}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-foreground truncate">{node.nodeId}</p>
                      <p className="text-[10px] text-muted-foreground">{node.nodeType}</p>
                    </div>
                    {node.durationMs != null && (
                      <span className="text-[10px] text-muted-foreground font-mono">{formatMs(node.durationMs)}</span>
                    )}
                    {(node.retryCount ?? 0) > 0 && (
                      <Badge variant="outline" className="text-[10px] px-1">
                        retry {node.retryCount}
                      </Badge>
                    )}
                  </motion.div>
                ))}
              </div>
            </ScrollArea>

            {overallStatus !== "running" && (
              <div className="px-3 pb-3">
                <Button variant="ghost" size="sm" className="w-full text-xs" onClick={onClose}>
                  Dismiss
                </Button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
