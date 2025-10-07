import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CheckCircle2, XCircle, Clock, Play, ArrowRight } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";

interface ExecutionLog {
  id: string;
  node_id: string;
  node_type: string;
  status: string;
  started_at: string;
  completed_at?: string;
  duration_ms?: number;
  error_message?: string;
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

export const EnhancedExecutionTimeline = ({ workspaceId }: { workspaceId: string }) => {
  const { data: executions, isLoading } = useQuery({
    queryKey: ["enhanced-executions", workspaceId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("workflow_executions")
        .select(`*, workflow:workflows(name)`)
        .eq("workspace_id", workspaceId)
        .order("started_at", { ascending: false })
        .limit(10);

      if (error) throw error;

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
    refetchInterval: 3000,
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "success":
        return "text-green-500 border-green-500";
      case "error":
        return "text-red-500 border-red-500";
      case "running":
        return "text-blue-500 border-blue-500";
      default:
        return "text-muted-foreground border-muted-foreground";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "success":
        return <CheckCircle2 className="w-4 h-4" />;
      case "error":
        return <XCircle className="w-4 h-4" />;
      case "running":
        return <Play className="w-4 h-4 animate-pulse" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Execution Timeline</CardTitle>
        <CardDescription>Visual timeline of workflow executions</CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[600px]">
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading executions...</div>
          ) : executions && executions.length > 0 ? (
            <div className="space-y-8">
              {executions.map((exec) => (
                <div key={exec.id} className="relative">
                  {/* Execution Header */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className={cn("p-2 rounded-full border-2", getStatusColor(exec.status))}>
                        {getStatusIcon(exec.status)}
                      </div>
                      <div>
                        <div className="font-medium">{(exec as any).workflow?.name || "Workflow"}</div>
                        <div className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(exec.started_at), { addSuffix: true })}
                        </div>
                      </div>
                    </div>
                    {exec.duration_ms && (
                      <Badge variant="outline">{exec.duration_ms}ms</Badge>
                    )}
                  </div>

                  {/* Timeline of Steps */}
                  {exec.logs && exec.logs.length > 0 && (
                    <div className="ml-6 border-l-2 border-muted pl-6 space-y-4">
                      {exec.logs.map((log, idx) => (
                        <div key={log.id} className="relative">
                          {/* Timeline dot */}
                          <div
                            className={cn(
                              "absolute -left-[28px] w-4 h-4 rounded-full border-2 bg-background",
                              getStatusColor(log.status)
                            )}
                          />
                          
                          {/* Step content */}
                          <div className="border rounded-lg p-3 bg-card">
                            <div className="flex items-center justify-between mb-1">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-mono bg-muted px-2 py-0.5 rounded">
                                  Step {idx + 1}
                                </span>
                                <span className="text-sm font-medium">{log.node_type}</span>
                              </div>
                              {log.duration_ms && (
                                <span className="text-xs text-muted-foreground">
                                  {log.duration_ms}ms
                                </span>
                              )}
                            </div>
                            {log.error_message && (
                              <p className="text-xs text-destructive mt-2">{log.error_message}</p>
                            )}
                          </div>

                          {/* Arrow to next step */}
                          {idx < exec.logs!.length - 1 && (
                            <ArrowRight className="w-3 h-3 text-muted-foreground absolute -left-[23px] top-full mt-2" />
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {exec.error_message && (
                    <div className="mt-3 ml-6 p-3 bg-destructive/10 border border-destructive/20 rounded text-sm text-destructive">
                      {exec.error_message}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No executions yet. Run a workflow to see the timeline.
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
};
