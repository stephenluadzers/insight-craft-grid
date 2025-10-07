import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
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

    console.log('Executing workflow with', nodes?.length || 0, 'nodes');

    const startTime = Date.now();

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

      console.log('Execution completed in', duration, 'ms');

      return new Response(
        JSON.stringify({
          success: true,
          duration: `${duration}ms`,
          result: executionData,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } catch (nodeError: any) {
      const duration = Date.now() - startTime;
      
      console.error('Execution failed:', nodeError);

      return new Response(
        JSON.stringify({
          success: false,
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
