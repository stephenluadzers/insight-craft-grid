import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { Wrench, CheckCircle, XCircle, Clock, Zap } from "lucide-react";
import { toast } from "sonner";

interface HealingLog {
  id: string;
  workflow_id: string;
  failure_type: string;
  original_error: string;
  healing_action: string;
  healing_strategy: any;
  success: boolean;
  attempted_at: string;
  recovery_time_ms: number;
}

export const SelfHealingMonitor = ({ workspaceId }: { workspaceId: string }) => {
  const [healingLogs, setHealingLogs] = useState<HealingLog[]>([]);
  const [stats, setStats] = useState({ total: 0, successful: 0, rate: 0 });

  useEffect(() => {
    fetchHealingLogs();
    const channel = supabase
      .channel('healing-logs')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'workflow_healing_logs' }, () => {
        fetchHealingLogs();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [workspaceId]);

  const fetchHealingLogs = async () => {
    const { data } = await supabase
      .from('workflow_healing_logs')
      .select('*')
      .eq('workspace_id', workspaceId)
      .order('attempted_at', { ascending: false })
      .limit(50);

    if (data) {
      setHealingLogs(data);
      const successful = data.filter(l => l.success).length;
      setStats({
        total: data.length,
        successful,
        rate: data.length > 0 ? (successful / data.length) * 100 : 0
      });
    }
  };

  const manualHeal = async (workflowId: string, error: string) => {
    try {
      const { error: healError } = await supabase.functions.invoke('self-heal-workflow', {
        body: { workflowId, error }
      });

      if (healError) throw healError;
      toast.success('Healing attempt initiated');
      fetchHealingLogs();
    } catch (error) {
      toast.error('Failed to initiate healing');
      console.error(error);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Self-Healing Workflows</h2>
          <p className="text-muted-foreground">Automatic recovery from failures</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-2">
            <Wrench className="h-5 w-5 text-primary" />
            <span className="text-sm text-muted-foreground">Total Healings</span>
          </div>
          <div className="text-2xl font-bold">{stats.total}</div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-3 mb-2">
            <CheckCircle className="h-5 w-5 text-green-500" />
            <span className="text-sm text-muted-foreground">Successful</span>
          </div>
          <div className="text-2xl font-bold">{stats.successful}</div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-3 mb-2">
            <Zap className="h-5 w-5 text-primary" />
            <span className="text-sm text-muted-foreground">Success Rate</span>
          </div>
          <div className="text-2xl font-bold">{stats.rate.toFixed(1)}%</div>
        </Card>
      </div>

      <div>
        <h3 className="font-semibold mb-4">Recent Healing Attempts</h3>
        <div className="space-y-3">
          {healingLogs.map(log => (
            <Card key={log.id} className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3 flex-1">
                  {log.success ? (
                    <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                  ) : (
                    <XCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
                  )}
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-medium">{log.healing_action}</p>
                      <Badge variant={log.success ? "default" : "destructive"}>
                        {log.success ? 'Success' : 'Failed'}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">
                      {log.failure_type.replace(/_/g, ' ')}
                    </p>
                    <p className="text-xs text-muted-foreground bg-muted p-2 rounded">
                      {log.original_error.substring(0, 150)}...
                    </p>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <Badge variant="outline" className="gap-1">
                    <Clock className="h-3 w-3" />
                    {log.recovery_time_ms}ms
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {new Date(log.attempted_at).toLocaleString()}
                  </span>
                </div>
              </div>
              {log.healing_strategy && (
                <div className="mt-3 p-3 bg-muted rounded text-sm">
                  <p className="font-medium mb-1">Strategy:</p>
                  <code className="text-xs">
                    {JSON.stringify(log.healing_strategy, null, 2)}
                  </code>
                </div>
              )}
            </Card>
          ))}

          {healingLogs.length === 0 && (
            <Card className="p-8 text-center">
              <Wrench className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">
                No healing attempts yet. Self-healing will automatically activate when workflows fail.
              </p>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};
