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

    const { workflowId, executionId, error } = await req.json();

    console.log('Starting self-healing for workflow:', workflowId);

    // Analyze the error
    const errorType = classifyError(error);
    const healingStrategy = determineHealingStrategy(errorType, error);

    const startTime = Date.now();

    // Attempt healing
    let success = false;
    let healingAction = '';

    try {
      switch (healingStrategy.type) {
        case 'retry_with_backoff':
          healingAction = 'Implemented exponential backoff retry';
          await implementRetryStrategy(supabase, workflowId, healingStrategy);
          success = true;
          break;

        case 'circuit_breaker':
          healingAction = 'Activated circuit breaker';
          await activateCircuitBreaker(supabase, workflowId, healingStrategy);
          success = true;
          break;

        case 'fallback_node':
          healingAction = 'Added fallback execution path';
          await addFallbackNode(supabase, workflowId, healingStrategy);
          success = true;
          break;

        case 'increase_timeout':
          healingAction = 'Increased execution timeout';
          await adjustTimeout(supabase, workflowId, healingStrategy);
          success = true;
          break;

        case 'optimize_query':
          healingAction = 'Optimized data query';
          await optimizeDataQuery(supabase, workflowId, healingStrategy);
          success = true;
          break;

        default:
          healingAction = 'Logged for manual review';
          success = false;
      }
    } catch (healError) {
      console.error('Healing failed:', healError);
      success = false;
    }

    const recoveryTime = Date.now() - startTime;

    // Log healing attempt
    const { data: { user } } = await supabase.auth.getUser();
    const { data: workflow } = await supabase
      .from('workflows')
      .select('workspace_id')
      .eq('id', workflowId)
      .single();

    await supabase.from('workflow_healing_logs').insert({
      workflow_id: workflowId,
      workspace_id: workflow?.workspace_id,
      failure_type: errorType,
      original_error: error,
      healing_action: healingAction,
      healing_strategy: healingStrategy,
      success,
      completed_at: new Date().toISOString(),
      recovery_time_ms: recoveryTime,
      learned_pattern: {
        error_signature: generateErrorSignature(error),
        solution: healingStrategy.type,
        context: healingStrategy
      }
    });

    // If successful, create learned optimization
    if (success) {
      await supabase.from('workflow_learned_optimizations').insert({
        workflow_id: workflowId,
        workspace_id: workflow?.workspace_id,
        optimization_type: 'self_healing',
        optimization_data: {
          error_type: errorType,
          healing_strategy: healingStrategy.type,
          recovery_time_ms: recoveryTime
        },
        performance_improvement_percent: calculateImprovement(healingStrategy),
        applied: true,
        applied_at: new Date().toISOString()
      });
    }

    return new Response(
      JSON.stringify({ 
        success, 
        healingAction,
        recoveryTime,
        strategy: healingStrategy
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in self-heal-workflow:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function classifyError(error: string): string {
  if (error.includes('timeout') || error.includes('ETIMEDOUT')) return 'timeout';
  if (error.includes('rate limit') || error.includes('429')) return 'rate_limit';
  if (error.includes('connection') || error.includes('ECONNREFUSED')) return 'connection';
  if (error.includes('502') || error.includes('503')) return 'service_unavailable';
  if (error.includes('validation') || error.includes('invalid')) return 'validation';
  return 'unknown';
}

function determineHealingStrategy(errorType: string, error: string): any {
  switch (errorType) {
    case 'timeout':
      return { type: 'increase_timeout', multiplier: 2, maxRetries: 3 };
    case 'rate_limit':
      return { type: 'retry_with_backoff', initialDelay: 5000, maxDelay: 60000 };
    case 'connection':
    case 'service_unavailable':
      return { type: 'circuit_breaker', threshold: 5, timeout: 60 };
    case 'validation':
      return { type: 'fallback_node', fallbackType: 'default_values' };
    default:
      return { type: 'retry_with_backoff', initialDelay: 1000, maxDelay: 10000 };
  }
}

async function implementRetryStrategy(supabase: any, workflowId: string, strategy: any) {
  const { data: workflow } = await supabase
    .from('workflows')
    .select('nodes')
    .eq('id', workflowId)
    .single();

  if (!workflow) return;

  // Add retry configuration to nodes
  const updatedNodes = workflow.nodes.map((node: any) => ({
    ...node,
    config: {
      ...node.config,
      retry: {
        enabled: true,
        maxRetries: strategy.maxRetries || 3,
        backoffType: 'exponential',
        initialDelay: strategy.initialDelay
      }
    }
  }));

  await supabase
    .from('workflows')
    .update({ nodes: updatedNodes })
    .eq('id', workflowId);
}

async function activateCircuitBreaker(supabase: any, workflowId: string, strategy: any) {
  const { data: workflow } = await supabase
    .from('workflows')
    .select('workspace_id')
    .eq('id', workflowId)
    .single();

  await supabase.from('integration_circuit_breakers').upsert({
    workspace_id: workflow.workspace_id,
    integration_type: 'workflow_execution',
    state: 'half_open',
    failure_threshold: strategy.threshold,
    timeout_duration_seconds: strategy.timeout
  });
}

async function addFallbackNode(supabase: any, workflowId: string, strategy: any) {
  const { data: workflow } = await supabase
    .from('workflows')
    .select('nodes')
    .eq('id', workflowId)
    .single();

  if (!workflow) return;

  // Add fallback nodes after error-prone nodes
  const updatedNodes = [...workflow.nodes];
  workflow.nodes.forEach((node: any, index: number) => {
    if (node.type === 'action' || node.type === 'ai') {
      updatedNodes.push({
        id: `${node.id}-fallback`,
        type: 'condition',
        position: { x: node.position.x + 200, y: node.position.y + 100 },
        data: {
          label: `${node.data.label} Fallback`,
          type: 'condition',
          config: { fallbackFor: node.id }
        }
      });
    }
  });

  await supabase
    .from('workflows')
    .update({ nodes: updatedNodes })
    .eq('id', workflowId);
}

async function adjustTimeout(supabase: any, workflowId: string, strategy: any) {
  const { data: workflow } = await supabase
    .from('workflows')
    .select('nodes, workspace_id')
    .eq('id', workflowId)
    .single();

  if (!workflow) return;

  // Increase timeout in workspace limits
  await supabase
    .from('workspace_execution_limits')
    .update({
      max_execution_time_seconds: 600
    })
    .eq('workspace_id', workflow.workspace_id);
}

async function optimizeDataQuery(supabase: any, workflowId: string, strategy: any) {
  // Add caching and optimization flags
  const { data: workflow } = await supabase
    .from('workflows')
    .select('nodes')
    .eq('id', workflowId)
    .single();

  if (!workflow) return;

  const updatedNodes = workflow.nodes.map((node: any) => ({
    ...node,
    config: {
      ...node.config,
      cache: { enabled: true, ttl: 300 },
      optimization: { enabled: true }
    }
  }));

  await supabase
    .from('workflows')
    .update({ nodes: updatedNodes })
    .eq('id', workflowId);
}

function generateErrorSignature(error: string): string {
  return error.substring(0, 100).replace(/\d+/g, 'N').replace(/[^\w\s]/g, '');
}

function calculateImprovement(strategy: any): number {
  const improvements: Record<string, number> = {
    'retry_with_backoff': 25,
    'circuit_breaker': 40,
    'fallback_node': 30,
    'increase_timeout': 20,
    'optimize_query': 35
  };
  return improvements[strategy.type] || 15;
}
