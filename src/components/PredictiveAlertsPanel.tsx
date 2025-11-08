import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, TrendingUp, DollarSign, Activity, CheckCircle2, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface PredictiveAlertsPanelProps {
  workflowId: string;
  workspaceId: string;
}

export const PredictiveAlertsPanel = ({ workflowId, workspaceId }: PredictiveAlertsPanelProps) => {
  const [predictions, setPredictions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadPredictions();
  }, [workflowId]);

  const loadPredictions = async () => {
    const { data } = await supabase
      .from('workflow_predictions')
      .select('*')
      .eq('workflow_id', workflowId)
      .eq('status', 'pending')
      .order('predicted_for', { ascending: true });
    
    setPredictions(data || []);
  };

  const runPrediction = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.functions.invoke('predict-workflow-failures', {
        body: { workflowId, workspaceId }
      });
      
      if (error) throw error;
      toast.success('Predictive analysis complete');
      await loadPredictions();
    } catch (error: any) {
      toast.error(error.message || 'Failed to run prediction');
    } finally {
      setLoading(false);
    }
  };

  const resolvePrediction = async (predictionId: string, prevented: boolean) => {
    await supabase
      .from('workflow_predictions')
      .update({ 
        status: prevented ? 'prevented' : 'resolved',
        resolved_at: new Date().toISOString()
      })
      .eq('id', predictionId);
    
    await loadPredictions();
    toast.success(prevented ? 'Marked as prevented' : 'Marked as resolved');
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'failure_risk': return AlertTriangle;
      case 'performance_degradation': return Activity;
      case 'cost_spike': return DollarSign;
      case 'scaling_need': return TrendingUp;
      default: return AlertTriangle;
    }
  };

  const getColor = (confidence: number) => {
    if (confidence >= 0.8) return 'destructive';
    if (confidence >= 0.5) return 'default';
    return 'secondary';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <AlertTriangle className="h-6 w-6 text-primary" />
            Predictive Alerts
          </h2>
          <p className="text-muted-foreground">AI-powered failure prevention</p>
        </div>
        <Button onClick={runPrediction} disabled={loading}>
          {loading ? 'Analyzing...' : 'Run Prediction'}
        </Button>
      </div>

      {predictions.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center space-y-3">
              <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto" />
              <h3 className="text-lg font-semibold">No Alerts</h3>
              <p className="text-sm text-muted-foreground">
                AI hasn't detected any potential issues in the next 24 hours
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {predictions.map((prediction) => {
            const Icon = getIcon(prediction.prediction_type);
            const hoursUntil = Math.round(
              (new Date(prediction.predicted_for).getTime() - Date.now()) / (1000 * 60 * 60)
            );
            
            return (
              <Card key={prediction.id} className="border-l-4 border-l-orange-500">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <Icon className="h-5 w-5 text-orange-500" />
                      <div>
                        <CardTitle className="text-lg capitalize">
                          {prediction.prediction_type.replace('_', ' ')}
                        </CardTitle>
                        <CardDescription className="flex items-center gap-2 mt-1">
                          <Clock className="h-3 w-3" />
                          In {hoursUntil} hours
                        </CardDescription>
                      </div>
                    </div>
                    <Badge variant={getColor(prediction.confidence_score)}>
                      {Math.round(prediction.confidence_score * 100)}% confidence
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Alert>
                    <AlertDescription>
                      {JSON.stringify(prediction.details)}
                    </AlertDescription>
                  </Alert>

                  <div className="space-y-2">
                    <h4 className="font-semibold text-sm">Preventive Actions:</h4>
                    <ul className="space-y-1">
                      {prediction.preventive_actions.map((action: string, idx: number) => (
                        <li key={idx} className="text-sm flex items-start gap-2">
                          <span className="text-primary mt-1">•</span>
                          <span>{action}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => resolvePrediction(prediction.id, true)}
                    >
                      Mark as Prevented
                    </Button>
                    <Button 
                      size="sm" 
                      variant="ghost"
                      onClick={() => resolvePrediction(prediction.id, false)}
                    >
                      Dismiss
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};