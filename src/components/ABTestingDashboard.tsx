import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { FlaskConical, TrendingUp, CheckCircle, PlayCircle, Pause } from "lucide-react";
import { toast } from "sonner";

interface Experiment {
  id: string;
  workflow_id: string;
  experiment_type: string;
  variant_a_config: any;
  variant_b_config: any;
  variant_a_executions: number;
  variant_b_executions: number;
  variant_a_success_rate: number;
  variant_b_success_rate: number;
  variant_a_avg_duration_ms: number;
  variant_b_avg_duration_ms: number;
  winner: string | null;
  status: string;
  started_at: string;
  auto_apply: boolean;
}

export const ABTestingDashboard = ({ workspaceId }: { workspaceId: string }) => {
  const [experiments, setExperiments] = useState<Experiment[]>([]);
  const [analyzing, setAnalyzing] = useState<string | null>(null);

  useEffect(() => {
    fetchExperiments();
  }, [workspaceId]);

  const fetchExperiments = async () => {
    const { data } = await supabase
      .from('workflow_optimization_experiments')
      .select('*')
      .eq('workspace_id', workspaceId)
      .order('started_at', { ascending: false });

    setExperiments(data || []);
  };

  const analyzeExperiment = async (experimentId: string) => {
    setAnalyzing(experimentId);
    try {
      const { data, error } = await supabase.functions.invoke('run-ab-test', {
        body: { experimentId, action: 'analyze' }
      });

      if (error) throw error;

      if (data.winner) {
        toast.success(`Winner: Variant ${data.winner.replace('variant_', '').toUpperCase()}`);
      } else {
        toast.info(data.message || 'Analysis complete');
      }

      fetchExperiments();
    } catch (error) {
      toast.error('Analysis failed');
      console.error(error);
    } finally {
      setAnalyzing(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'running':
        return <Badge variant="secondary">Running</Badge>;
      case 'completed':
        return <Badge variant="default">Completed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getWinnerBadge = (winner: string | null) => {
    if (!winner) return null;
    return (
      <Badge className="gap-1">
        <CheckCircle className="h-3 w-3" />
        Variant {winner.replace('variant_', '').toUpperCase()} Won
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">A/B Testing & Autonomous Optimization</h2>
          <p className="text-muted-foreground">System learns and applies optimal configurations</p>
        </div>
      </div>

      {experiments.length === 0 ? (
        <Card className="p-8 text-center">
          <FlaskConical className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground mb-4">
            No experiments running. The system will automatically create experiments to optimize your workflows.
          </p>
        </Card>
      ) : (
        <div className="space-y-4">
          {experiments.map(exp => (
            <Card key={exp.id} className="p-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-lg capitalize mb-1">
                      {exp.experiment_type.replace(/_/g, ' ')}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Started {new Date(exp.started_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {getStatusBadge(exp.status)}
                    {getWinnerBadge(exp.winner)}
                    {exp.auto_apply && (
                      <Badge variant="outline">Auto-Apply</Badge>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <Card className={`p-4 ${exp.winner === 'variant_a' ? 'border-primary border-2' : ''}`}>
                    <div className="flex items-center gap-2 mb-3">
                      <div className="h-3 w-3 rounded-full bg-blue-500" />
                      <h4 className="font-medium">Variant A (Control)</h4>
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Executions:</span>
                        <span className="font-medium">{exp.variant_a_executions}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Success Rate:</span>
                        <span className="font-medium">
                          {((exp.variant_a_success_rate || 0) * 100).toFixed(1)}%
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Avg Duration:</span>
                        <span className="font-medium">{exp.variant_a_avg_duration_ms || 0}ms</span>
                      </div>
                    </div>
                  </Card>

                  <Card className={`p-4 ${exp.winner === 'variant_b' ? 'border-primary border-2' : ''}`}>
                    <div className="flex items-center gap-2 mb-3">
                      <div className="h-3 w-3 rounded-full bg-green-500" />
                      <h4 className="font-medium">Variant B (Test)</h4>
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Executions:</span>
                        <span className="font-medium">{exp.variant_b_executions}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Success Rate:</span>
                        <span className="font-medium">
                          {((exp.variant_b_success_rate || 0) * 100).toFixed(1)}%
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Avg Duration:</span>
                        <span className="font-medium">{exp.variant_b_avg_duration_ms || 0}ms</span>
                      </div>
                    </div>
                  </Card>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2 text-sm">
                    <span className="text-muted-foreground">Progress to Statistical Significance</span>
                    <span className="font-medium">
                      {Math.min(((exp.variant_a_executions + exp.variant_b_executions) / 30) * 100, 100).toFixed(0)}%
                    </span>
                  </div>
                  <Progress 
                    value={Math.min(((exp.variant_a_executions + exp.variant_b_executions) / 30) * 100, 100)} 
                  />
                </div>

                {exp.status === 'running' && (
                  <Button 
                    size="sm" 
                    onClick={() => analyzeExperiment(exp.id)}
                    disabled={analyzing === exp.id}
                  >
                    <TrendingUp className={`h-4 w-4 mr-2 ${analyzing === exp.id ? 'animate-pulse' : ''}`} />
                    {analyzing === exp.id ? 'Analyzing...' : 'Analyze Results'}
                  </Button>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
