import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify JWT authentication
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid or expired token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { nodes, triggeredBy, workspaceId, workflowId } = await req.json();

    // Input validation
    if (!nodes || !Array.isArray(nodes)) {
      return new Response(
        JSON.stringify({ error: 'Invalid nodes array' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (nodes.length > 100) {
      return new Response(
        JSON.stringify({ error: 'Workflow exceeds maximum of 100 nodes' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!workspaceId) {
      return new Response(
        JSON.stringify({ error: 'Workspace ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify user has access to workspace
    const { data: membership } = await supabaseClient
      .from('workspace_members')
      .select('role')
      .eq('workspace_id', workspaceId)
      .eq('user_id', user.id)
      .single();

    if (!membership) {
      return new Response(
        JSON.stringify({ error: 'Access denied to workspace' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Executing workflow with', nodes?.length || 0, 'nodes, triggered by:', user.id);

    // Use authenticated client for RLS enforcement
    const supabase = supabaseClient;

    const startTime = Date.now();

    // Create execution record
    const { data: execution, error: executionError } = await supabase
      .from('workflow_executions')
      .insert({
        workflow_id: workflowId || null,
        workspace_id: workspaceId,
        triggered_by: user.id,
        status: 'running',
        started_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (executionError) {
      console.error('Failed to create execution record:', executionError);
      return new Response(
        JSON.stringify({ error: 'Failed to start workflow execution' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Execution started:', execution.id);

    try {
      // Execute each node in the workflow
      const executionData: any = {
        steps: [],
      };

      for (let i = 0; i < nodes.length; i++) {
        const node = nodes[i];
        console.log(`Executing node ${i + 1}/${nodes.length}:`, node.type, node.title);

        const stepResult = await executeNode(node, executionData);
        executionData.steps.push({
          nodeId: node.id,
          nodeType: node.type,
          nodeTitle: node.title,
          result: stepResult,
          timestamp: new Date().toISOString(),
        });
      }

      const duration = Date.now() - startTime;

      // Update execution as completed
      if (execution) {
        await supabase
          .from('workflow_executions')
          .update({
            status: 'completed',
            completed_at: new Date().toISOString(),
            duration_ms: duration,
            execution_data: executionData,
          })
          .eq('id', execution.id);

        console.log('Execution completed:', execution.id, 'in', duration, 'ms');
      } else {
        console.log('Execution completed in', duration, 'ms (no record saved)');
      }

      return new Response(
        JSON.stringify({
          success: true,
          executionId: execution?.id,
          duration,
          result: executionData,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } catch (nodeError: any) {
      const duration = Date.now() - startTime;
      
      // Update execution as failed
      if (execution) {
        await supabase
          .from('workflow_executions')
          .update({
            status: 'failed',
            completed_at: new Date().toISOString(),
            duration_ms: duration,
            error_message: nodeError.message,
          })
          .eq('id', execution.id);

        console.error('Execution failed:', execution.id, nodeError);
      } else {
        console.error('Execution failed:', nodeError);
      }

      return new Response(
        JSON.stringify({
          success: false,
          executionId: execution?.id,
          error: nodeError.message,
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500
        }
      );
    }

  } catch (error: any) {
    console.error('Error in execute-workflow function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});

async function executeNode(node: any, executionData: any): Promise<any> {
  // Simulate node execution based on type
  await new Promise(resolve => setTimeout(resolve, 500)); // Simulate processing time

  switch (node.type) {
    case 'trigger':
      return {
        status: 'triggered',
        message: `Trigger "${node.title}" activated`,
        data: { timestamp: new Date().toISOString() }
      };

    case 'condition':
      // Simulate condition evaluation
      const conditionMet = Math.random() > 0.2; // 80% success rate
      return {
        status: conditionMet ? 'passed' : 'failed',
        message: `Condition "${node.title}" ${conditionMet ? 'passed' : 'failed'}`,
        conditionMet
      };

    case 'action':
      return {
        status: 'completed',
        message: `Action "${node.title}" executed successfully`,
        data: { processed: true }
      };

    case 'data':
      return {
        status: 'completed',
        message: `Data operation "${node.title}" completed`,
        data: { records: 42 }
      };

    case 'ai':
      return {
        status: 'completed',
        message: `AI processing "${node.title}" completed`,
        data: { 
          analysis: 'Processed successfully',
          confidence: 0.95
        }
      };

    default:
      return {
        status: 'completed',
        message: `Node "${node.title}" executed`,
      };
  }
}
