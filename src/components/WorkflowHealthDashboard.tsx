import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Activity, TrendingUp, TrendingDown, Minus, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface WorkflowHealthDashboardProps {
  workflowId: string;
  workspaceId: string;
}

export const WorkflowHealthDashboard = ({ workflowId, workspaceId }: WorkflowHealthDashboardProps) => {
  const [healthScore, setHealthScore] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadHealthScore();
  }, [workflowId]);

  const loadHealthScore = async () => {
    const { data } = await supabase
      .from('workflow_health_scores')
      .select('*')
      .eq('workflow_id', workflowId)
      .order('calculated_at', { ascending: false })
      .limit(1)
      .single();
    
    setHealthScore(data);
  };

  const calculateScore = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('calculate-health-score', {
        body: { workflowId, workspaceId }
      });
      
      if (error) throw error;
      setHealthScore(data);
      toast.success('Health score updated');
    } catch (error: any) {
      toast.error(error.message || 'Failed to calculate health score');
    } finally {
      setLoading(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreLabel = (score: number) => {
    if (score >= 90) return 'Excellent';
    if (score >= 70) return 'Good';
    if (score >= 50) return 'Fair';
    return 'Poor';
  };

  const getTrendIcon = (trend: string) => {
    if (trend === 'improving') return TrendingUp;
    if (trend === 'declining') return TrendingDown;
    return Minus;
  };

  if (!healthScore) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="text-center space-y-3">
            <Activity className="h-12 w-12 text-muted-foreground mx-auto" />
            <h3 className="text-lg font-semibold">No Health Data</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Calculate workflow health score to get insights
            </p>
            <Button onClick={calculateScore} disabled={loading}>
              {loading ? 'Calculating...' : 'Calculate Health Score'}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const TrendIcon = getTrendIcon(healthScore.trend);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Activity className="h-6 w-6 text-primary" />
            Workflow Health
          </h2>
          <p className="text-muted-foreground">AI-powered quality scoring</p>
        </div>
        <Button onClick={calculateScore} disabled={loading} variant="outline" size="sm">
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      <Card className="border-primary/20 bg-gradient-to-br from-background to-primary/5">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-3xl">Overall Health Score</CardTitle>
              <CardDescription>Combined quality metrics</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <TrendIcon className={`h-5 w-5 ${
                healthScore.trend === 'improving' ? 'text-green-500' :
                healthScore.trend === 'declining' ? 'text-red-500' :
                'text-gray-500'
              }`} />
              <Badge variant={healthScore.trend === 'improving' ? 'default' : 'secondary'}>
                {healthScore.trend}
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-6">
            <div className={`text-6xl font-bold ${getScoreColor(healthScore.overall_score)}`}>
              {healthScore.overall_score}
            </div>
            <div className="flex-1 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="font-medium">{getScoreLabel(healthScore.overall_score)}</span>
                <span className="text-muted-foreground">out of 100</span>
              </div>
              <Progress value={healthScore.overall_score} className="h-3" />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Reliability</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-3xl font-bold ${getScoreColor(healthScore.reliability_score)}`}>
              {healthScore.reliability_score}
            </div>
            <Progress value={healthScore.reliability_score} className="mt-2 h-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Efficiency</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-3xl font-bold ${getScoreColor(healthScore.efficiency_score)}`}>
              {healthScore.efficiency_score}
            </div>
            <Progress value={healthScore.efficiency_score} className="mt-2 h-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Cost Optimization</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-3xl font-bold ${getScoreColor(healthScore.cost_score)}`}>
              {healthScore.cost_score}
            </div>
            <Progress value={healthScore.cost_score} className="mt-2 h-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Security</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-3xl font-bold ${getScoreColor(healthScore.security_score)}`}>
              {healthScore.security_score}
            </div>
            <Progress value={healthScore.security_score} className="mt-2 h-2" />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recommendations</CardTitle>
          <CardDescription>AI-generated improvement suggestions</CardDescription>
        </CardHeader>
        <CardContent>
          {healthScore.recommendations?.length === 0 ? (
            <p className="text-sm text-muted-foreground">No recommendations at this time</p>
          ) : (
            <div className="space-y-3">
              {healthScore.recommendations?.map((rec: any, idx: number) => (
                <div key={idx} className="flex items-start gap-3 p-3 bg-muted rounded-lg">
                  <Badge variant={rec.priority === 'high' ? 'destructive' : 'secondary'}>
                    {rec.priority}
                  </Badge>
                  <div className="flex-1">
                    <p className="font-medium text-sm capitalize">{rec.type}</p>
                    <p className="text-sm text-muted-foreground">{rec.message}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};