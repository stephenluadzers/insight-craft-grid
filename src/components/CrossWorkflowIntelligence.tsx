import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Network, DollarSign, TrendingUp, AlertTriangle, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface CrossWorkflowIntelligenceProps {
  workspaceId: string;
}

export const CrossWorkflowIntelligence = ({ workspaceId }: CrossWorkflowIntelligenceProps) => {
  const [redundancies, setRedundancies] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [workflows, setWorkflows] = useState<any[]>([]);

  useEffect(() => {
    loadData();
  }, [workspaceId]);

  const loadData = async () => {
    const [redundancyData, workflowData] = await Promise.all([
      supabase
        .from('workflow_redundancy_analysis')
        .select('*')
        .eq('workspace_id', workspaceId)
        .eq('status', 'identified')
        .order('cost_waste_cents', { ascending: false }),
      supabase
        .from('workflows')
        .select('id, name')
        .eq('workspace_id', workspaceId)
    ]);
    
    setRedundancies(redundancyData.data || []);
    setWorkflows(workflowData.data || []);
  };

  const analyzeRedundancy = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.functions.invoke('analyze-workflow-redundancy', {
        body: { workspaceId }
      });
      
      if (error) throw error;
      await loadData();
      toast.success('Redundancy analysis complete');
    } catch (error: any) {
      toast.error(error.message || 'Failed to analyze redundancy');
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (redundancyId: string, status: string) => {
    await supabase
      .from('workflow_redundancy_analysis')
      .update({ status, reviewed_at: new Date().toISOString() })
      .eq('id', redundancyId);
    
    await loadData();
    toast.success(`Marked as ${status}`);
  };

  const getWorkflowName = (workflowId: string) => {
    return workflows.find(w => w.id === workflowId)?.name || workflowId;
  };

  const totalWaste = redundancies.reduce((sum, r) => sum + r.cost_waste_cents, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Network className="h-6 w-6 text-primary" />
            Cross-Workflow Intelligence
          </h2>
          <p className="text-muted-foreground">Discover redundancy and consolidation opportunities</p>
        </div>
        <Button onClick={analyzeRedundancy} disabled={loading}>
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Analyzing...
            </>
          ) : (
            'Run Analysis'
          )}
        </Button>
      </div>

      {totalWaste > 0 && (
        <Alert className="border-orange-500 bg-orange-500/10">
          <AlertTriangle className="h-4 w-4 text-orange-500" />
          <AlertDescription className="flex items-center justify-between">
            <span>
              Found redundant workflows costing <strong>${(totalWaste / 100).toFixed(2)}/month</strong>
            </span>
            <Badge variant="destructive">Action Required</Badge>
          </AlertDescription>
        </Alert>
      )}

      {redundancies.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center space-y-3">
              <Network className="h-12 w-12 text-green-500 mx-auto" />
              <h3 className="text-lg font-semibold">No Redundancy Detected</h3>
              <p className="text-sm text-muted-foreground">
                Your workflows are optimally organized
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {redundancies.map((redundancy) => (
            <Card key={redundancy.id} className="border-l-4 border-l-orange-500">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg capitalize">
                      {redundancy.redundancy_type} Workflows
                    </CardTitle>
                    <CardDescription>
                      {Math.round(redundancy.similarity_score * 100)}% similar
                    </CardDescription>
                  </div>
                  <Badge variant="destructive">
                    ${(redundancy.cost_waste_cents / 100).toFixed(2)}/mo waste
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm font-medium mb-2">Affected Workflows:</p>
                  <div className="flex flex-wrap gap-2">
                    {redundancy.workflow_ids.map((id: string) => (
                      <Badge key={id} variant="outline">
                        {getWorkflowName(id)}
                      </Badge>
                    ))}
                  </div>
                </div>

                <Alert>
                  <TrendingUp className="h-4 w-4" />
                  <AlertDescription>
                    <p className="font-semibold mb-2">Consolidation Plan:</p>
                    <pre className="text-xs bg-muted p-3 rounded overflow-x-auto mt-2">
                      {JSON.stringify(redundancy.suggested_consolidation, null, 2)}
                    </pre>
                  </AlertDescription>
                </Alert>

                <div className="flex items-center gap-4 p-3 bg-green-500/10 rounded-lg border border-green-500/20">
                  <DollarSign className="h-5 w-5 text-green-600" />
                  <div>
                    <p className="text-sm font-medium">Potential Savings</p>
                    <p className="text-2xl font-bold text-green-600">
                      ${(redundancy.cost_waste_cents / 100).toFixed(2)}/month
                    </p>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => updateStatus(redundancy.id, 'reviewed')}
                  >
                    Mark as Reviewed
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => updateStatus(redundancy.id, 'dismissed')}
                  >
                    Dismiss
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};