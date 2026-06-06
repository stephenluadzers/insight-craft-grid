import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { RefreshCw, RotateCcw, Clock, CheckCircle2, XCircle, MinusCircle } from "lucide-react";
import { toast } from "sonner";
import type { RunStepLog, StepStatus } from "@/types/workflow-debug";
import { RetryPolicyPanel } from "./RetryPolicyPanel";
import { FailureForensicsCard } from "./FailureForensicsCard";

interface StepInspectorDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workflowId: string;
  executionId: string;
  nodeId: string | null;
  nodeTitle?: string;
  onApplyFix?: (patch: Record<string, unknown>) => void;
}

const statusMeta: Record<StepStatus, { icon: typeof CheckCircle2; cls: string }> = {
  completed: { icon: CheckCircle2, cls: "text-emerald-500" },
  failed:    { icon: XCircle,      cls: "text-destructive" },
  running:   { icon: RefreshCw,    cls: "text-primary animate-spin" },
  pending:   { icon: Clock,        cls: "text-muted-foreground" },
  retrying:  { icon: RotateCcw,    cls: "text-amber-500" },
  skipped:   { icon: MinusCircle,  cls: "text-muted-foreground" },
};

/**
 * Wave 1 — Step Inspector drawer (Make + Pipedream + Retool combined).
 * Click a node post-run → see input JSON, output JSON, duration, retries, errors.
 */
export const StepInspectorDrawer = ({
  open, onOpenChange, workflowId, executionId, nodeId, nodeTitle, onApplyFix,
}: StepInspectorDrawerProps) => {
  const [logs, setLogs] = useState<RunStepLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [replaying, setReplaying] = useState(false);

  useEffect(() => {
    if (!open || !nodeId) return;
    void fetchLogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, nodeId, executionId]);

  const fetchLogs = async () => {
    if (!nodeId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("run_step_logs")
      .select("*")
      .eq("execution_id", executionId)
      .eq("node_id", nodeId)
      .order("attempt", { ascending: true });
    setLoading(false);
    if (error) { toast.error(error.message); return; }
    setLogs((data ?? []) as unknown as RunStepLog[]);
  };

  const latest = useMemo(() => logs[logs.length - 1] ?? null, [logs]);
  const meta = latest ? statusMeta[latest.status] : null;
  const StatusIcon = meta?.icon;

  const replay = async () => {
    if (!nodeId) return;
    setReplaying(true);
    const { error } = await supabase.functions.invoke("replay-run", {
      body: { executionId, fromNodeId: nodeId },
    });
    setReplaying(false);
    if (error) toast.error(error.message);
    else toast.success("Replay queued from this step");
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-xl overflow-hidden flex flex-col p-0">
        <SheetHeader className="px-6 pt-6 pb-3 border-b border-border/40">
          <div className="flex items-center gap-2">
            {StatusIcon && <StatusIcon className={`w-4 h-4 ${meta!.cls}`} />}
            <SheetTitle className="truncate">{nodeTitle ?? nodeId ?? "Step inspector"}</SheetTitle>
          </div>
          <SheetDescription className="flex items-center gap-3 text-xs">
            {latest && (
              <>
                <Badge variant="outline">attempt {latest.attempt}</Badge>
                {latest.duration_ms != null && <span>{latest.duration_ms} ms</span>}
                <Badge variant={latest.branch === "error" ? "destructive" : "secondary"}>
                  {latest.branch}
                </Badge>
              </>
            )}
            {!latest && !loading && <span>No run data for this node yet.</span>}
          </SheetDescription>
        </SheetHeader>

        <Tabs defaultValue="io" className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="mx-6 mt-3 grid grid-cols-4">
            <TabsTrigger value="io">I/O</TabsTrigger>
            <TabsTrigger value="error">Error</TabsTrigger>
            <TabsTrigger value="retry">Retry</TabsTrigger>
            <TabsTrigger value="attempts">Attempts</TabsTrigger>
          </TabsList>

          <ScrollArea className="flex-1 px-6 py-4">
            <TabsContent value="io" className="space-y-4 mt-0">
              <JsonBlock label="Input" value={latest?.input_payload} />
              <JsonBlock label="Output" value={latest?.output_payload} />
              <Button
                onClick={replay}
                disabled={replaying || !nodeId}
                variant="outline"
                className="w-full"
              >
                <RotateCcw className={`w-4 h-4 mr-2 ${replaying ? "animate-spin" : ""}`} />
                {replaying ? "Queuing replay…" : "Replay from this step"}
              </Button>
            </TabsContent>

            <TabsContent value="error" className="space-y-4 mt-0">
              {latest?.error_message ? (
                <>
                  <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/30 text-sm">
                    <p className="font-medium text-destructive">{latest.error_message}</p>
                    {latest.error_stack && (
                      <pre className="mt-2 text-xs whitespace-pre-wrap text-muted-foreground max-h-48 overflow-auto">
                        {latest.error_stack}
                      </pre>
                    )}
                  </div>
                  {nodeId && (
                    <FailureForensicsCard
                      workflowId={workflowId}
                      executionId={executionId}
                      nodeId={nodeId}
                      onApplyFix={onApplyFix}
                    />
                  )}
                </>
              ) : (
                <p className="text-sm text-muted-foreground">No error recorded.</p>
              )}
            </TabsContent>

            <TabsContent value="retry" className="mt-0">
              {nodeId && (
                <RetryPolicyPanel
                  workflowId={workflowId}
                  nodeId={nodeId}
                  nodeTitle={nodeTitle}
                />
              )}
            </TabsContent>

            <TabsContent value="attempts" className="mt-0 space-y-2">
              {logs.length === 0 && <p className="text-sm text-muted-foreground">No attempts yet.</p>}
              {logs.map((log) => {
                const m = statusMeta[log.status];
                const Icon = m.icon;
                return (
                  <div key={log.id} className="p-3 rounded-lg glass border border-border/40 text-xs flex items-center gap-3">
                    <Icon className={`w-4 h-4 ${m.cls}`} />
                    <span className="font-medium">Attempt {log.attempt}</span>
                    <Badge variant="outline">{log.status}</Badge>
                    {log.duration_ms != null && <span className="text-muted-foreground">{log.duration_ms} ms</span>}
                    <span className="ml-auto text-muted-foreground">
                      {new Date(log.started_at).toLocaleTimeString()}
                    </span>
                  </div>
                );
              })}
            </TabsContent>
          </ScrollArea>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
};

const JsonBlock = ({ label, value }: { label: string; value: unknown }) => (
  <div>
    <div className="flex items-center justify-between mb-1">
      <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</span>
    </div>
    <pre className="text-xs glass rounded-lg p-3 border border-border/40 max-h-72 overflow-auto whitespace-pre-wrap break-all">
      {value === undefined || value === null
        ? <span className="text-muted-foreground">—</span>
        : JSON.stringify(value, null, 2)}
    </pre>
  </div>
);
