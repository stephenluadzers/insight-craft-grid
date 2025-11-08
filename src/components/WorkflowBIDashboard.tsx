import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  DollarSign, 
  TrendingUp, 
  Clock, 
  Target,
  BarChart3,
  PieChart,
  LineChart as LineChartIcon
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface WorkflowBIDashboardProps {
  workflowId: string;
  workspaceId: string;
}

interface BusinessMetrics {
  total_executions: number;
  successful_executions: number;
  failed_executions: number;
  total_cost_cents: number;
  avg_execution_time_ms: number | null;
  time_saved_hours: number | null;
  roi_score: number | null;
}

interface CostBreakdown {
  cost_type: string;
  total_cost_cents: number;
  count: number;
}

export const WorkflowBIDashboard = ({ workflowId, workspaceId }: WorkflowBIDashboardProps) => {
  const [metrics, setMetrics] = useState<BusinessMetrics | null>(null);
  const [costBreakdown, setCostBreakdown] = useState<CostBreakdown[]>([]);
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('30d');

  useEffect(() => {
    loadMetrics();
    loadCostBreakdown();
  }, [workflowId, timeRange]);

  const loadMetrics = async () => {
    try {
      const daysAgo = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90;
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - daysAgo);

      const { data, error } = await supabase
        .from('workflow_business_metrics')
        .select('*')
        .eq('workflow_id', workflowId)
        .gte('date', startDate.toISOString().split('T')[0])
        .order('date', { ascending: false });

      if (error) throw error;

      // Aggregate metrics
      if (data && data.length > 0) {
        const aggregated = data.reduce((acc, curr) => ({
          total_executions: acc.total_executions + curr.total_executions,
          successful_executions: acc.successful_executions + curr.successful_executions,
          failed_executions: acc.failed_executions + curr.failed_executions,
          total_cost_cents: acc.total_cost_cents + curr.total_cost_cents,
          avg_execution_time_ms: curr.avg_execution_time_ms || acc.avg_execution_time_ms,
          time_saved_hours: (acc.time_saved_hours || 0) + (curr.time_saved_hours || 0),
          roi_score: curr.roi_score || acc.roi_score,
        }), {
          total_executions: 0,
          successful_executions: 0,
          failed_executions: 0,
          total_cost_cents: 0,
          avg_execution_time_ms: null,
          time_saved_hours: null,
          roi_score: null,
        });

        setMetrics(aggregated);
      }
    } catch (error) {
      console.error('Failed to load metrics:', error);
    }
  };

  const loadCostBreakdown = async () => {
    try {
      const daysAgo = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90;
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - daysAgo);

      const { data, error } = await supabase
        .from('workflow_cost_tracking')
        .select('cost_type, cost_amount_cents')
        .eq('workflow_id', workflowId)
        .gte('recorded_at', startDate.toISOString());

      if (error) throw error;

      // Group by cost type
      const breakdown = data?.reduce((acc, curr) => {
        const existing = acc.find(item => item.cost_type === curr.cost_type);
        if (existing) {
          existing.total_cost_cents += curr.cost_amount_cents;
          existing.count++;
        } else {
          acc.push({
            cost_type: curr.cost_type,
            total_cost_cents: curr.cost_amount_cents,
            count: 1,
          });
        }
        return acc;
      }, [] as CostBreakdown[]);

      setCostBreakdown(breakdown || []);
    } catch (error) {
      console.error('Failed to load cost breakdown:', error);
    }
  };

  const formatCurrency = (cents: number) => {
    return `$${(cents / 100).toFixed(2)}`;
  };

  const successRate = metrics
    ? ((metrics.successful_executions / metrics.total_executions) * 100).toFixed(1)
    : '0';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Business Intelligence</h2>
          <p className="text-muted-foreground">
            Track costs, ROI, and business impact
          </p>
        </div>
        <Tabs value={timeRange} onValueChange={(v) => setTimeRange(v as any)}>
          <TabsList>
            <TabsTrigger value="7d">7 days</TabsTrigger>
            <TabsTrigger value="30d">30 days</TabsTrigger>
            <TabsTrigger value="90d">90 days</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Cost</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {metrics ? formatCurrency(metrics.total_cost_cents) : '$0.00'}
            </div>
            <p className="text-xs text-muted-foreground">
              {metrics?.total_executions || 0} executions
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{successRate}%</div>
            <p className="text-xs text-muted-foreground">
              {metrics?.successful_executions || 0} successful
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Time Saved</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {metrics?.time_saved_hours?.toFixed(1) || '0.0'}h
            </div>
            <p className="text-xs text-muted-foreground">
              Automation efficiency
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">ROI Score</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {metrics?.roi_score?.toFixed(1) || 'N/A'}
            </div>
            <p className="text-xs text-muted-foreground">
              Return on investment
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <PieChart className="h-5 w-5 text-primary" />
            <CardTitle>Cost Breakdown</CardTitle>
          </div>
          <CardDescription>
            Detailed cost analysis by category
          </CardDescription>
        </CardHeader>
        <CardContent>
          {costBreakdown.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No cost data available for this period
            </div>
          ) : (
            <div className="space-y-4">
              {costBreakdown.map((item) => (
                <div key={item.cost_type} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className="capitalize">
                      {item.cost_type.replace('_', ' ')}
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      {item.count} calls
                    </span>
                  </div>
                  <div className="text-lg font-semibold">
                    {formatCurrency(item.total_cost_cents)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Performance Insights</CardTitle>
            <CardDescription>Key performance indicators</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
              <span className="text-sm font-medium">Avg Execution Time</span>
              <span className="text-sm font-bold">
                {metrics?.avg_execution_time_ms 
                  ? `${(metrics.avg_execution_time_ms / 1000).toFixed(2)}s`
                  : 'N/A'}
              </span>
            </div>
            <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
              <span className="text-sm font-medium">Cost per Execution</span>
              <span className="text-sm font-bold">
                {metrics && metrics.total_executions > 0
                  ? formatCurrency(metrics.total_cost_cents / metrics.total_executions)
                  : '$0.00'}
              </span>
            </div>
            <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
              <span className="text-sm font-medium">Failure Rate</span>
              <span className="text-sm font-bold">
                {metrics
                  ? ((metrics.failed_executions / metrics.total_executions) * 100).toFixed(1)
                  : '0'}%
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Business Impact</CardTitle>
            <CardDescription>Estimated value delivered</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 bg-gradient-to-r from-green-500/10 to-emerald-500/10 rounded-lg border border-green-500/20">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Time Savings Value</span>
                <TrendingUp className="h-4 w-4 text-green-500" />
              </div>
              <div className="text-2xl font-bold text-green-500">
                {metrics && metrics.time_saved_hours
                  ? formatCurrency(metrics.time_saved_hours * 50 * 100) // $50/hour estimate
                  : '$0.00'}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Based on $50/hour labor cost
              </p>
            </div>

            <div className="p-4 bg-gradient-to-r from-blue-500/10 to-cyan-500/10 rounded-lg border border-blue-500/20">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Net Value</span>
                <BarChart3 className="h-4 w-4 text-blue-500" />
              </div>
              <div className="text-2xl font-bold text-blue-500">
                {metrics && metrics.time_saved_hours
                  ? formatCurrency((metrics.time_saved_hours * 50 * 100) - metrics.total_cost_cents)
                  : '$0.00'}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Time savings minus operational costs
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};