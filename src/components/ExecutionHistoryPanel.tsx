import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { History, CheckCircle2, XCircle, Clock, Play, AlertCircle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface ExecutionLog {
  id: string;
  node_id: string;
  node_type: string;
  status: string;
  input_data: any;
  output_data: any;
  error_message?: string;
  started_at: string;
  completed_at?: string;
  duration_ms?: number;
  retry_count: number;
}

interface Execution {
  id: string;
  workflow_id: string;
  status: string;
  started_at: string;
  completed_at?: string;
  duration_ms?: number;
  error_message?: string;
  logs?: ExecutionLog[];
}

export const ExecutionHistoryPanel = ({ workspaceId }: { workspaceId: string }) => {
  const { data: executions, isLoading } = useQuery({
    queryKey: ["executions", workspaceId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("workflow_executions")
        .select(`
          *,
          workflow:workflows(name)
        `)
        .eq("workspace_id", workspaceId)
        .order("started_at", { ascending: false })
        .limit(20);

      if (error) throw error;

      // Fetch logs for each execution
      const executionsWithLogs = await Promise.all(
        data.map(async (exec) => {
          const { data: logs } = await supabase
            .from("workflow_execution_logs")
            .select("*")
            .eq("execution_id", exec.id)
            .order("started_at", { ascending: true });

          return { ...exec, logs: logs || [] };
        })
      );

      return executionsWithLogs as Execution[];
    },
    refetchInterval: 3000, // Poll every 3 seconds for live updates
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "success":
        return <CheckCircle2 className="w-4 h-4 text-green-500" />;
      case "error":
        return <XCircle className="w-4 h-4 text-red-500" />;
      case "running":
        return <Play className="w-4 h-4 text-blue-500 animate-pulse" />;
      case "pending":
        return <Clock className="w-4 h-4 text-yellow-500" />;
      default:
        return <AlertCircle className="w-4 h-4" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      success: "default",
      error: "destructive",
      running: "secondary",
      pending: "outline",
    };
    return <Badge variant={variants[status] || "outline"}>{status}</Badge>;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <History className="w-5 h-5" />
          Execution History
        </CardTitle>
        <CardDescription>Real-time workflow execution logs and monitoring</CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[600px]">
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading execution history...</div>
          ) : executions && executions.length > 0 ? (
            <Accordion type="single" collapsible className="space-y-2">
              {executions.map((exec) => (
                <AccordionItem key={exec.id} value={exec.id} className="border rounded-lg px-4">
                  <AccordionTrigger className="hover:no-underline">
                    <div className="flex items-center justify-between w-full pr-4">
                      <div className="flex items-center gap-3">
                        {getStatusIcon(exec.status)}
                        <div className="text-left">
                          <div className="font-medium">{(exec as any).workflow?.name || "Workflow"}</div>
                          <div className="text-sm text-muted-foreground">
                            {formatDistanceToNow(new Date(exec.started_at), { addSuffix: true })}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {getStatusBadge(exec.status)}
                        {exec.duration_ms && (
                          <span className="text-sm text-muted-foreground">{exec.duration_ms}ms</span>
                        )}
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-3 pt-4">
                      {exec.error_message && (
                        <div className="p-3 bg-destructive/10 border border-destructive/20 rounded text-sm text-destructive">
                          {exec.error_message}
                        </div>
                      )}
                      {exec.logs && exec.logs.length > 0 && (
                        <div className="space-y-2">
                          <div className="text-sm font-medium">Node Execution Steps:</div>
                          {exec.logs.map((log, idx) => (
                            <div key={log.id} className="border rounded p-3 space-y-2 text-sm">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <span className="font-mono text-xs bg-muted px-2 py-1 rounded">
                                    {idx + 1}
                                  </span>
                                  <span className="font-medium">{log.node_type}</span>
                                  {getStatusIcon(log.status)}
                                </div>
                                {log.duration_ms && (
                                  <span className="text-muted-foreground">{log.duration_ms}ms</span>
                                )}
                              </div>
                              {log.error_message && (
                                <div className="text-destructive text-xs">{log.error_message}</div>
                              )}
                              {log.retry_count > 0 && (
                                <div className="text-yellow-600 text-xs">Retried {log.retry_count} times</div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          ) : (
            <div className="text-center py-8 text-muted-foreground">No executions yet. Run a workflow to see history.</div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
};