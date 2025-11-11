import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { injectGuardrailNodes } from "../_shared/guardrails.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { workflow } = await req.json();

    if (!workflow) {
      return new Response(
        JSON.stringify({ error: 'No workflow provided' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate workflow structure
    if (!workflow.nodes || !Array.isArray(workflow.nodes)) {
      return new Response(
        JSON.stringify({ error: 'Invalid workflow structure: nodes array required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Importing workflow with', workflow.nodes.length, 'nodes');

    // Check if guardrails already exist
    const existingGuardrails = workflow.nodes.filter((n: any) => n.type === 'guardrail');
    console.log('Existing guardrails:', existingGuardrails.length);

    // Inject guardrails if none exist
    let processedWorkflow = { ...workflow };
    if (existingGuardrails.length === 0) {
      processedWorkflow.nodes = injectGuardrailNodes(workflow.nodes);
      console.log('Auto-injected guardrails. New total:', processedWorkflow.nodes.filter((n: any) => n.type === 'guardrail').length);
    }

    return new Response(
      JSON.stringify({
        workflow: processedWorkflow,
        guardrailsAdded: processedWorkflow.nodes.filter((n: any) => n.type === 'guardrail').length - existingGuardrails.length,
        message: existingGuardrails.length === 0 
          ? 'Workflow imported with automatic guardrail protection' 
          : 'Workflow imported (guardrails already present)'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error in import-workflow-json:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});
