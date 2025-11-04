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

    const { workspaceId, workflowId } = await req.json();
    console.log('Generating recommendations for workspace:', workspaceId);

    const recommendations: any[] = [];

    // Get workflow data
    const { data: workflows } = await supabase
      .from('workflows')
      .select('*')
      .eq('workspace_id', workspaceId);

    if (!workflows || workflows.length === 0) {
      return new Response(
        JSON.stringify({ recommendations: [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get execution history
    const { data: executions } = await supabase
      .from('workflow_executions')
      .select('*')
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false })
      .limit(1000);

    // Get other workspace data
    const { data: otherWorkspaces } = await supabase
      .from('workflows')
      .select('workspace_id, nodes, category')
      .neq('workspace_id', workspaceId)
      .limit(100);

    // Analyze patterns
    for (const workflow of workflows) {
      if (workflowId && workflow.id !== workflowId) continue;

      // Recommendation 1: Similar workflows used by others
      const similarWorkflows = findSimilarWorkflows(workflow, otherWorkspaces || []);
      if (similarWorkflows.length > 0) {
        recommendations.push({
          workspace_id: workspaceId,
          workflow_id: workflow.id,
          recommendation_type: 'similar_workflows',
          title: 'Workflows Like Yours',
          description: `${similarWorkflows.length} similar workflows are using additional integrations that might benefit you.`,
          priority: 'medium',
          impact_score: 0.7,
          effort_score: 0.3,
          recommendation_data: {
            similar_workflows: similarWorkflows.slice(0, 5),
            suggested_integrations: extractIntegrations(similarWorkflows)
          },
          expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
        });
      }

      // Recommendation 2: Performance optimization
      const perfIssues = analyzePerformance(workflow, executions || []);
      if (perfIssues.length > 0) {
        recommendations.push({
          workspace_id: workspaceId,
          workflow_id: workflow.id,
          recommendation_type: 'performance',
          title: 'Speed Up Your Workflow',
          description: `We found ${perfIssues.length} optimization opportunities that could improve execution time by up to 40%.`,
          priority: 'high',
          impact_score: 0.85,
          effort_score: 0.2,
          recommendation_data: {
            issues: perfIssues,
            estimated_improvement: calculateImprovement(perfIssues)
          },
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
        });
      }

      // Recommendation 3: Missing error handling
      const errorHandling = analyzeErrorHandling(workflow);
      if (errorHandling.score < 0.7) {
        recommendations.push({
          workspace_id: workspaceId,
          workflow_id: workflow.id,
          recommendation_type: 'reliability',
          title: 'Improve Error Handling',
          description: 'Add retry logic and fallback paths to prevent workflow failures.',
          priority: 'high',
          impact_score: 0.9,
          effort_score: 0.4,
          recommendation_data: {
            current_score: errorHandling.score,
            missing_features: errorHandling.missing,
            suggested_nodes: errorHandling.suggestions
          },
          expires_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString()
        });
      }

      // Recommendation 4: Cost optimization
      const costAnalysis = analyzeCosts(workflow, executions || []);
      if (costAnalysis.potential_savings > 10) {
        recommendations.push({
          workspace_id: workspaceId,
          workflow_id: workflow.id,
          recommendation_type: 'cost',
          title: 'Reduce Execution Costs',
          description: `Save up to $${costAnalysis.potential_savings.toFixed(2)}/month by optimizing API calls and data transfer.`,
          priority: 'medium',
          impact_score: 0.6,
          effort_score: 0.3,
          recommendation_data: costAnalysis,
          expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
        });
      }

      // Recommendation 5: Automation opportunities
      const automationOpps = findAutomationOpportunities(workflow);
      if (automationOpps.length > 0) {
        recommendations.push({
          workspace_id: workspaceId,
          workflow_id: workflow.id,
          recommendation_type: 'automation',
          title: 'Automate More Steps',
          description: `${automationOpps.length} manual steps could be automated to save time.`,
          priority: 'low',
          impact_score: 0.5,
          effort_score: 0.5,
          recommendation_data: {
            opportunities: automationOpps
          },
          expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
        });
      }
    }

    // Insert recommendations
    if (recommendations.length > 0) {
      const { error } = await supabase
        .from('workflow_recommendations')
        .insert(recommendations);

      if (error) {
        console.error('Error inserting recommendations:', error);
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        recommendations: recommendations.length,
        data: recommendations
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in generate-recommendations:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function findSimilarWorkflows(workflow: any, otherWorkflows: any[]): any[] {
  const similar: any[] = [];
  
  for (const other of otherWorkflows) {
    const similarity = calculateSimilarity(workflow, other);
    if (similarity > 0.6) {
      similar.push({ ...other, similarity });
    }
  }

  return similar.sort((a, b) => b.similarity - a.similarity);
}

function calculateSimilarity(w1: any, w2: any): number {
  if (w1.category && w2.category && w1.category === w2.category) {
    return 0.8;
  }

  const nodes1 = new Set(w1.nodes.map((n: any) => n.type));
  const nodes2 = new Set(w2.nodes.map((n: any) => n.type));
  
  const intersection = new Set([...nodes1].filter(x => nodes2.has(x)));
  const union = new Set([...nodes1, ...nodes2]);
  
  return intersection.size / union.size;
}

function extractIntegrations(workflows: any[]): string[] {
  const integrations = new Set<string>();
  
  workflows.forEach(w => {
    w.nodes.forEach((node: any) => {
      if (node.data?.integration) {
        integrations.add(node.data.integration);
      }
    });
  });

  return Array.from(integrations);
}

function analyzePerformance(workflow: any, executions: any[]): any[] {
  const issues: any[] = [];
  
  const workflowExecs = executions.filter(e => e.workflow_id === workflow.id);
  const avgDuration = workflowExecs.reduce((sum, e) => sum + (e.duration_ms || 0), 0) / workflowExecs.length;

  if (avgDuration > 5000) {
    issues.push({
      type: 'slow_execution',
      description: 'Workflow takes longer than average',
      current_avg: avgDuration,
      suggested_fix: 'Enable parallel execution'
    });
  }

  const sequentialNodes = workflow.nodes.filter((n: any) => 
    n.type === 'action' || n.type === 'ai'
  );

  if (sequentialNodes.length > 3) {
    issues.push({
      type: 'sequential_bottleneck',
      description: 'Multiple nodes could run in parallel',
      affected_nodes: sequentialNodes.length,
      suggested_fix: 'Use workflow compilation'
    });
  }

  return issues;
}

function calculateImprovement(issues: any[]): number {
  return issues.reduce((sum, issue) => {
    if (issue.type === 'slow_execution') return sum + 30;
    if (issue.type === 'sequential_bottleneck') return sum + 40;
    return sum + 15;
  }, 0);
}

function analyzeErrorHandling(workflow: any): any {
  const nodes = workflow.nodes;
  let retryNodes = 0;
  let fallbackNodes = 0;
  let actionNodes = 0;

  nodes.forEach((node: any) => {
    if (node.type === 'action' || node.type === 'ai') {
      actionNodes++;
      if (node.config?.retry?.enabled) retryNodes++;
      if (node.config?.fallback) fallbackNodes++;
    }
  });

  const score = actionNodes > 0 ? 
    (retryNodes + fallbackNodes) / (actionNodes * 2) : 1;

  return {
    score,
    missing: actionNodes - retryNodes,
    suggestions: [
      'Add retry logic to API calls',
      'Implement fallback paths for critical nodes',
      'Enable circuit breakers for external services'
    ]
  };
}

function analyzeCosts(workflow: any, executions: any[]): any {
  const monthlyExecs = executions.filter(e => 
    e.workflow_id === workflow.id &&
    new Date(e.created_at) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
  ).length;

  const aiNodes = workflow.nodes.filter((n: any) => n.type === 'ai').length;
  const currentCost = monthlyExecs * aiNodes * 0.002;

  const potential_savings = currentCost * 0.3; // 30% savings with caching

  return {
    current_monthly_cost: currentCost,
    potential_savings,
    recommendations: [
      'Enable result caching',
      'Use lighter AI models where possible',
      'Batch API requests'
    ]
  };
}

function findAutomationOpportunities(workflow: any): any[] {
  const opportunities: any[] = [];

  if (workflow.nodes.some((n: any) => n.type === 'trigger' && n.data.manual)) {
    opportunities.push({
      type: 'trigger_automation',
      description: 'Convert manual trigger to webhook or schedule',
      effort: 'low'
    });
  }

  return opportunities;
}
