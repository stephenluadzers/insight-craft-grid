import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { workflowId } = await req.json();

    // Get recent executions for analysis
    const { data: executions, error: execError } = await supabase
      .from('workflow_executions')
      .select('*')
      .eq('workflow_id', workflowId)
      .order('created_at', { ascending: false })
      .limit(100);

    if (execError) throw execError;

    if (!executions || executions.length < 10) {
      return new Response(
        JSON.stringify({ 
          predictions: [],
          message: 'Not enough data for analysis. Need at least 10 executions.' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const predictions = [];

    // Analyze failure rate
    const failedCount = executions.filter(e => e.status === 'failed').length;
    const failureRate = failedCount / executions.length;

    if (failureRate > 0.2) {
      predictions.push({
        workflow_id: workflowId,
        prediction_type: 'failure_risk',
        confidence_score: Math.min(failureRate * 2, 0.95),
        prediction_data: {
          current_failure_rate: failureRate,
          failed_executions: failedCount,
          total_executions: executions.length,
          common_errors: analyzeErrors(executions)
        },
        suggested_actions: [
          'Review error logs for common patterns',
          'Add retry logic to failing nodes',
          'Implement circuit breakers for external services',
          'Add input validation to prevent bad data'
        ],
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
      });
    }

    // Analyze performance degradation
    const recentAvg = calculateAvgDuration(executions.slice(0, 20));
    const historicalAvg = calculateAvgDuration(executions.slice(20));
    
    if (recentAvg > historicalAvg * 1.5) {
      predictions.push({
        workflow_id: workflowId,
        prediction_type: 'performance_degradation',
        confidence_score: Math.min((recentAvg / historicalAvg - 1), 0.95),
        prediction_data: {
          recent_avg_duration_ms: recentAvg,
          historical_avg_duration_ms: historicalAvg,
          degradation_percentage: ((recentAvg / historicalAvg - 1) * 100).toFixed(2)
        },
        suggested_actions: [
          'Check for external API slowdowns',
          'Review database query performance',
          'Consider caching frequently accessed data',
          'Implement parallel execution for independent nodes'
        ],
        expires_at: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString()
      });
    }

    // Analyze scaling needs
    const executionsPerHour = executions.filter(e => 
      new Date(e.created_at) > new Date(Date.now() - 60 * 60 * 1000)
    ).length;

    if (executionsPerHour > 100) {
      predictions.push({
        workflow_id: workflowId,
        prediction_type: 'scaling_recommendation',
        confidence_score: 0.85,
        prediction_data: {
          executions_per_hour: executionsPerHour,
          estimated_monthly_executions: executionsPerHour * 24 * 30,
          current_capacity: 'standard'
        },
        suggested_actions: [
          'Consider implementing workflow compilation',
          'Enable result caching',
          'Use edge deployment for lower latency',
          'Implement connection pooling'
        ],
        expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
      });
    }

    // Detect optimization opportunities
    const longRunning = executions.filter(e => 
      e.result?.duration_ms && e.result.duration_ms > 5000
    );

    if (longRunning.length > executions.length * 0.3) {
      predictions.push({
        workflow_id: workflowId,
        prediction_type: 'optimization_opportunity',
        confidence_score: 0.75,
        prediction_data: {
          long_running_percentage: (longRunning.length / executions.length * 100).toFixed(2),
          avg_duration_ms: calculateAvgDuration(executions),
          bottleneck_nodes: identifyBottlenecks(executions)
        },
        suggested_actions: [
          'Identify and parallelize independent nodes',
          'Add caching for repeated operations',
          'Optimize external API calls',
          'Consider breaking workflow into smaller sub-workflows'
        ],
        expires_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString()
      });
    }

    // Insert predictions
    if (predictions.length > 0) {
      const { error: insertError } = await supabase
        .from('workflow_predictions')
        .insert(predictions);

      if (insertError) {
        console.error('Error inserting predictions:', insertError);
      }
    }

    // Calculate and store metrics
    const metrics = calculateMetrics(executions, workflowId);
    if (metrics.length > 0) {
      await supabase.from('workflow_metrics').insert(metrics);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        predictions,
        metrics 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in analyze-workflow-performance:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function analyzeErrors(executions: any[]): Record<string, number> {
  const errors: Record<string, number> = {};
  executions
    .filter(e => e.status === 'failed' && e.error)
    .forEach(e => {
      const errorType = e.error.split(':')[0] || 'Unknown';
      errors[errorType] = (errors[errorType] || 0) + 1;
    });
  return errors;
}

function calculateAvgDuration(executions: any[]): number {
  const durations = executions
    .map(e => e.result?.duration_ms)
    .filter(d => d && d > 0);
  
  return durations.length > 0
    ? durations.reduce((sum, d) => sum + d, 0) / durations.length
    : 0;
}

function identifyBottlenecks(executions: any[]): string[] {
  const nodeDurations: Record<string, number[]> = {};
  
  executions.forEach(exec => {
    if (exec.result?.steps) {
      exec.result.steps.forEach((step: any) => {
        if (step.duration_ms) {
          if (!nodeDurations[step.node_id]) {
            nodeDurations[step.node_id] = [];
          }
          nodeDurations[step.node_id].push(step.duration_ms);
        }
      });
    }
  });

  const avgDurations = Object.entries(nodeDurations).map(([nodeId, durations]) => ({
    nodeId,
    avgDuration: durations.reduce((sum, d) => sum + d, 0) / durations.length
  }));

  return avgDurations
    .sort((a, b) => b.avgDuration - a.avgDuration)
    .slice(0, 3)
    .map(n => n.nodeId);
}

function calculateMetrics(executions: any[], workflowId: string): any[] {
  const now = new Date().toISOString();
  const metrics = [];

  // Success rate
  const successRate = executions.filter(e => e.status === 'success').length / executions.length;
  metrics.push({
    workflow_id: workflowId,
    metric_type: 'success_rate',
    metric_value: successRate,
    time_window: '1h',
    recorded_at: now
  });

  // Error rate
  metrics.push({
    workflow_id: workflowId,
    metric_type: 'error_rate',
    metric_value: 1 - successRate,
    time_window: '1h',
    recorded_at: now
  });

  // Average execution time
  const avgDuration = calculateAvgDuration(executions);
  metrics.push({
    workflow_id: workflowId,
    metric_type: 'execution_time',
    metric_value: avgDuration,
    time_window: '1h',
    recorded_at: now
  });

  // Latency percentiles
  const durations = executions
    .map(e => e.result?.duration_ms)
    .filter(d => d && d > 0)
    .sort((a, b) => a - b);

  if (durations.length > 0) {
    const p50 = durations[Math.floor(durations.length * 0.5)];
    const p95 = durations[Math.floor(durations.length * 0.95)];
    const p99 = durations[Math.floor(durations.length * 0.99)];

    metrics.push(
      { workflow_id: workflowId, metric_type: 'latency_p50', metric_value: p50, time_window: '1h', recorded_at: now },
      { workflow_id: workflowId, metric_type: 'latency_p95', metric_value: p95, time_window: '1h', recorded_at: now },
      { workflow_id: workflowId, metric_type: 'latency_p99', metric_value: p99, time_window: '1h', recorded_at: now }
    );
  }

  return metrics;
}