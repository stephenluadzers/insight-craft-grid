import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "./ui/button";
import { ScrollArea } from "./ui/scroll-area";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "./ui/sheet";
import { Badge } from "./ui/badge";
import { History, Play, Loader2, CheckCircle, XCircle, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface ExecutionPanelProps {
  workflowId?: string;
  workspaceId?: string;
  onExecute: () => void;
  isExecuting: boolean;
}

export const ExecutionPanel = ({ workflowId, workspaceId, onExecute, isExecuting }: ExecutionPanelProps) => {
  const [executions, setExecutions] = useState<any[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const { toast } = useToast();

  const loadExecutionHistory = async () => {
    if (!workspaceId) return;
    
    setIsLoadingHistory(true);
    try {
      const { data, error } = await supabase
        .from('workflow_executions')
        .select('*')
        .eq('workspace_id', workspaceId)
        .order('started_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      setExecutions(data || []);
    } catch (error: any) {
      toast({
        title: "Failed to load history",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-500" />;
      case 'running':
        return <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />;
      default:
        return <Clock className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive"> = {
      completed: "default",
      failed: "destructive",
      running: "secondary",
      pending: "secondary",
    };
    return (
      <Badge variant={variants[status] || "secondary"}>
        {status}
      </Badge>
    );
  };

  return (
    <div className="flex items-center gap-2">
      {/* Execute Button */}
      <Button
        onClick={onExecute}
        disabled={isExecuting}
        size="sm"
        className="flex items-center gap-2"
      >
        {isExecuting ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="hidden sm:inline">Executing...</span>
          </>
        ) : (
          <>
            <Play className="w-4 h-4" />
            <span className="hidden sm:inline">Run Workflow</span>
          </>
        )}
      </Button>

      {/* Execution History */}
      <Sheet>
        <SheetTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            onClick={loadExecutionHistory}
            className="flex items-center gap-2"
          >
            <History className="w-4 h-4" />
            <span className="hidden sm:inline">History</span>
          </Button>
        </SheetTrigger>
        <SheetContent className="w-full sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>Execution History</SheetTitle>
          </SheetHeader>
          <ScrollArea className="h-[calc(100vh-8rem)] mt-4">
            {isLoadingHistory ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : executions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No executions yet
              </div>
            ) : (
              <div className="space-y-3">
                {executions.map((execution) => (
                  <div
                    key={execution.id}
                    className="p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(execution.status)}
                        {getStatusBadge(execution.status)}
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(execution.started_at), 'MMM d, HH:mm:ss')}
                      </span>
                    </div>
                    
                    {execution.duration_ms && (
                      <div className="text-xs text-muted-foreground mb-1">
                        Duration: {execution.duration_ms}ms
                      </div>
                    )}

                    {execution.error_message && (
                      <div className="text-xs text-red-500 mt-2 p-2 bg-red-50 dark:bg-red-950/20 rounded">
                        {execution.error_message}
                      </div>
                    )}

                    {execution.execution_data?.steps && (
                      <div className="mt-3 space-y-1">
                        <div className="text-xs font-medium text-muted-foreground">
                          Steps executed:
                        </div>
                        {execution.execution_data.steps.map((step: any, idx: number) => (
                          <div key={idx} className="text-xs pl-4 py-1 border-l-2 border-primary/20">
                            {step.nodeTitle} - {step.result?.status}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </SheetContent>
      </Sheet>
    </div>
  );
};
