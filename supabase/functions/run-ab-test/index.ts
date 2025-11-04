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

    const { experimentId, action } = await req.json();

    const { data: experiment } = await supabase
      .from('workflow_optimization_experiments')
      .select('*')
      .eq('id', experimentId)
      .single();

    if (!experiment) {
      return new Response(
        JSON.stringify({ error: 'Experiment not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'analyze') {
      // Analyze experiment results
      const minSampleSize = 30;
      const totalExecutions = experiment.variant_a_executions + experiment.variant_b_executions;

      if (totalExecutions < minSampleSize) {
        return new Response(
          JSON.stringify({
            status: 'insufficient_data',
            message: `Need ${minSampleSize - totalExecutions} more executions`,
            winner: null
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Calculate statistical significance
      const aSuccess = experiment.variant_a_success_rate || 0;
      const bSuccess = experiment.variant_b_success_rate || 0;
      const aDuration = experiment.variant_a_avg_duration_ms || 0;
      const bDuration = experiment.variant_b_avg_duration_ms || 0;

      // Composite score: success rate (70%) + speed (30%)
      const aScore = (aSuccess * 0.7) + ((1 - (aDuration / (aDuration + bDuration))) * 0.3);
      const bScore = (bSuccess * 0.7) + ((1 - (bDuration / (aDuration + bDuration))) * 0.3);

      const improvement = Math.abs((bScore - aScore) / aScore) * 100;
      const isSignificant = improvement > 5; // 5% threshold

      let winner = null;
      if (isSignificant) {
        winner = bScore > aScore ? 'variant_b' : 'variant_a';
      }

      // Update experiment
      await supabase
        .from('workflow_optimization_experiments')
        .update({
          winner,
          status: isSignificant ? 'completed' : 'running',
          completed_at: isSignificant ? new Date().toISOString() : null
        })
        .eq('id', experimentId);

      // If winner and auto_apply, apply the winning variant
      if (winner && experiment.auto_apply && isSignificant) {
        const winningConfig = winner === 'variant_a' ? 
          experiment.variant_a_config : experiment.variant_b_config;

        await applyOptimization(supabase, experiment.workflow_id, winningConfig);

        await supabase
          .from('workflow_optimization_experiments')
          .update({ applied_at: new Date().toISOString() })
          .eq('id', experimentId);

        // Log learned optimization
        await supabase.from('workflow_learned_optimizations').insert({
          workflow_id: experiment.workflow_id,
          workspace_id: experiment.workspace_id,
          optimization_type: experiment.experiment_type,
          optimization_data: winningConfig,
          performance_improvement_percent: improvement,
          applied: true,
          applied_at: new Date().toISOString()
        });
      }

      return new Response(
        JSON.stringify({
          status: isSignificant ? 'completed' : 'running',
          winner,
          improvement: improvement.toFixed(2),
          analysis: {
            variant_a: { score: aScore, success_rate: aSuccess, avg_duration: aDuration },
            variant_b: { score: bScore, success_rate: bSuccess, avg_duration: bDuration }
          },
          applied: winner && experiment.auto_apply
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'record') {
      const { variant, success, duration } = await req.json();

      const updates: any = {};

      if (variant === 'a') {
        updates.variant_a_executions = (experiment.variant_a_executions || 0) + 1;
        
        const newSuccessRate = ((experiment.variant_a_success_rate || 0) * experiment.variant_a_executions + (success ? 1 : 0)) / 
          updates.variant_a_executions;
        updates.variant_a_success_rate = newSuccessRate;

        const newAvgDuration = ((experiment.variant_a_avg_duration_ms || 0) * experiment.variant_a_executions + duration) / 
          updates.variant_a_executions;
        updates.variant_a_avg_duration_ms = Math.round(newAvgDuration);
      } else {
        updates.variant_b_executions = (experiment.variant_b_executions || 0) + 1;
        
        const newSuccessRate = ((experiment.variant_b_success_rate || 0) * experiment.variant_b_executions + (success ? 1 : 0)) / 
          updates.variant_b_executions;
        updates.variant_b_success_rate = newSuccessRate;

        const newAvgDuration = ((experiment.variant_b_avg_duration_ms || 0) * experiment.variant_b_executions + duration) / 
          updates.variant_b_executions;
        updates.variant_b_avg_duration_ms = Math.round(newAvgDuration);
      }

      await supabase
        .from('workflow_optimization_experiments')
        .update(updates)
        .eq('id', experimentId);

      return new Response(
        JSON.stringify({ success: true, updates }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Invalid action' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in run-ab-test:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function applyOptimization(supabase: any, workflowId: string, config: any) {
  const { data: workflow } = await supabase
    .from('workflows')
    .select('nodes')
    .eq('id', workflowId)
    .single();

  if (!workflow) return;

  let updatedNodes = workflow.nodes;

  // Apply optimization based on type
  if (config.type === 'parallel_execution') {
    updatedNodes = enableParallelExecution(workflow.nodes, config);
  } else if (config.type === 'caching') {
    updatedNodes = enableCaching(workflow.nodes, config);
  } else if (config.type === 'timeout_adjustment') {
    updatedNodes = adjustTimeouts(workflow.nodes, config);
  }

  await supabase
    .from('workflows')
    .update({ nodes: updatedNodes })
    .eq('id', workflowId);
}

function enableParallelExecution(nodes: any[], config: any): any[] {
  return nodes.map(node => ({
    ...node,
    config: {
      ...node.config,
      parallel: config.parallel_groups?.includes(node.id)
    }
  }));
}

function enableCaching(nodes: any[], config: any): any[] {
  return nodes.map(node => ({
    ...node,
    config: {
      ...node.config,
      cache: {
        enabled: true,
        ttl: config.cache_ttl || 300
      }
    }
  }));
}

function adjustTimeouts(nodes: any[], config: any): any[] {
  return nodes.map(node => ({
    ...node,
    config: {
      ...node.config,
      timeout: config.timeout_ms || 30000
    }
  }));
}
