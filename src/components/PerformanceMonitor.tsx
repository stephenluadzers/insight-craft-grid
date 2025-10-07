import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "./ui/badge";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from "recharts";
import { Activity, Clock, Zap, TrendingUp } from "lucide-react";

interface PerformanceMonitorProps {
  workspaceId: string;
}

interface PerformanceMetric {
  id: string;
  workflow_id: string;
  node_id: string;
  node_type: string;
  execution_time_ms: number;
  memory_usage_mb: number | null;
  cpu_usage_percent: number | null;
  recorded_at: string;
}

interface AggregatedMetrics {
  avg_execution_time: number;
  max_execution_time: number;
  total_executions: number;
  slow_nodes: Array<{
    node_id: string;
    node_type: string;
    avg_time: number;
  }>;
}

export const PerformanceMonitor = ({ workspaceId }: PerformanceMonitorProps) => {
  const [metrics, setMetrics] = useState<PerformanceMetric[]>([]);
  const [aggregated, setAggregated] = useState<AggregatedMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'1h' | '24h' | '7d'>('24h');

  useEffect(() => {
    loadMetrics();
    
    // Real-time subscription
    const channel = supabase
      .channel('performance-metrics')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'workflow_performance_metrics',
          filter: `workspace_id=eq.${workspaceId}`
        },
        (payload) => {
          setMetrics(prev => [payload.new as PerformanceMetric, ...prev].slice(0, 100));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [workspaceId, timeRange]);

  const loadMetrics = async () => {
    try {
      setLoading(true);
      const timeAgo = timeRange === '1h' ? '1 hour' : timeRange === '24h' ? '24 hours' : '7 days';
      
      const { data, error } = await supabase
        .from('workflow_performance_metrics')
        .select('*')
        .eq('workspace_id', workspaceId)
        .gte('recorded_at', new Date(Date.now() - getTimeRangeMs(timeRange)).toISOString())
        .order('recorded_at', { ascending: false })
        .limit(100);

      if (error) throw error;

      setMetrics(data || []);
      calculateAggregatedMetrics(data || []);
    } catch (error) {
      console.error('Error loading metrics:', error);
    } finally {
      setLoading(false);
    }
  };

  const getTimeRangeMs = (range: '1h' | '24h' | '7d'): number => {
    switch (range) {
      case '1h': return 60 * 60 * 1000;
      case '24h': return 24 * 60 * 60 * 1000;
      case '7d': return 7 * 24 * 60 * 60 * 1000;
    }
  };

  const calculateAggregatedMetrics = (data: PerformanceMetric[]) => {
    if (data.length === 0) {
      setAggregated(null);
      return;
    }

    const totalTime = data.reduce((sum, m) => sum + m.execution_time_ms, 0);
    const avgTime = totalTime / data.length;
    const maxTime = Math.max(...data.map(m => m.execution_time_ms));

    // Group by node_id and calculate averages
    const nodeGroups = data.reduce((acc, m) => {
      if (!acc[m.node_id]) {
        acc[m.node_id] = { times: [], type: m.node_type };
      }
      acc[m.node_id].times.push(m.execution_time_ms);
      return acc;
    }, {} as Record<string, { times: number[]; type: string }>);

    const slowNodes = Object.entries(nodeGroups)
      .map(([node_id, data]) => ({
        node_id,
        node_type: data.type,
        avg_time: data.times.reduce((sum, t) => sum + t, 0) / data.times.length
      }))
      .sort((a, b) => b.avg_time - a.avg_time)
      .slice(0, 5);

    setAggregated({
      avg_execution_time: avgTime,
      max_execution_time: maxTime,
      total_executions: data.length,
      slow_nodes: slowNodes
    });
  };

  const chartData = metrics
    .slice(0, 20)
    .reverse()
    .map(m => ({
      time: new Date(m.recorded_at).toLocaleTimeString(),
      execution_time: m.execution_time_ms,
      memory: m.memory_usage_mb || 0
    }));

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Execution Time</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {aggregated ? `${Math.round(aggregated.avg_execution_time)}ms` : '-'}
            </div>
            <p className="text-xs text-muted-foreground">Last {timeRange}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Max Execution Time</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {aggregated ? `${Math.round(aggregated.max_execution_time)}ms` : '-'}
            </div>
            <p className="text-xs text-muted-foreground">Peak performance</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Executions</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {aggregated ? aggregated.total_executions : 0}
            </div>
            <p className="text-xs text-muted-foreground">Metrics recorded</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Slow Nodes</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {aggregated ? aggregated.slow_nodes.length : 0}
            </div>
            <p className="text-xs text-muted-foreground">Need optimization</p>
          </CardContent>
        </Card>
      </div>

      {/* Time Range Selector */}
      <div className="flex gap-2">
        {(['1h', '24h', '7d'] as const).map(range => (
          <Badge
            key={range}
            variant={timeRange === range ? "default" : "outline"}
            className="cursor-pointer"
            onClick={() => setTimeRange(range)}
          >
            {range === '1h' ? 'Last Hour' : range === '24h' ? 'Last 24H' : 'Last 7 Days'}
          </Badge>
        ))}
      </div>

      {/* Execution Time Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Execution Time Trend</CardTitle>
          <CardDescription>Recent workflow execution performance</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="time" />
              <YAxis label={{ value: 'Time (ms)', angle: -90, position: 'insideLeft' }} />
              <Tooltip />
              <Line type="monotone" dataKey="execution_time" stroke="hsl(var(--primary))" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Slow Nodes */}
      {aggregated && aggregated.slow_nodes.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Slowest Nodes</CardTitle>
            <CardDescription>Nodes that may need optimization</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={aggregated.slow_nodes}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="node_id" />
                <YAxis label={{ value: 'Avg Time (ms)', angle: -90, position: 'insideLeft' }} />
                <Tooltip />
                <Bar dataKey="avg_time" fill="hsl(var(--primary))" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
