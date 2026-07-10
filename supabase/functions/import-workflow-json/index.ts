import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { injectGuardrailNodes } from "../_shared/guardrails.ts";
import { specifyWorkflow } from "../_shared/specify.ts";
import { finalizeWorkflowConnections } from "../_shared/workflow-graph.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { workflow, skipSpecify } = await req.json();

    if (!workflow) {
      return new Response(
        JSON.stringify({ error: 'No workflow provided' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!workflow.nodes || !Array.isArray(workflow.nodes)) {
      return new Response(
        JSON.stringify({ error: 'Invalid workflow structure: nodes array required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Importing workflow with', workflow.nodes.length, 'nodes');

    // ---- Jerry Specify pass (auto-concretize underspecified nodes) ----
    let processedWorkflow: any = { ...workflow };
    let specifyChanges: any[] = [];
    let placeholders: any[] = [];
    let autoResolved: any[] = [];
    let requiredEnv: any[] = [];
    if (!skipSpecify) {
      const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
      const specified = await specifyWorkflow(processedWorkflow, LOVABLE_API_KEY);
      processedWorkflow = specified.workflow;
      specifyChanges = specified.changes;
      placeholders = specified.placeholders || [];
      autoResolved = specified.autoResolved || [];
      requiredEnv = specified.requiredEnv || [];
      console.log(`Jerry Specify applied ${specifyChanges.length} change(s), wired ${autoResolved.length} env var(s), manifest=${requiredEnv.length}, ${placeholders.length} unresolved`);
    }

    // ---- Guardrail injection ----
    const existingGuardrails = processedWorkflow.nodes.filter((n: any) => n.type === 'guardrail');
    if (existingGuardrails.length === 0) {
      const injectionResult = injectGuardrailNodes(processedWorkflow.nodes);
      processedWorkflow.nodes = injectionResult.nodes;
      processedWorkflow.guardrailExplanations = injectionResult.explanations;
      processedWorkflow.complianceStandards = injectionResult.complianceStandards;
      console.log('Auto-injected guardrails. New total:', injectionResult.guardrailsAdded);
    }

    processedWorkflow.connections = finalizeWorkflowConnections(
      processedWorkflow.nodes,
      processedWorkflow.connections ?? workflow.connections,
    );
    processedWorkflow.finalizedForExport = true;

    return new Response(
      JSON.stringify({
        workflow: processedWorkflow,
        guardrailsAdded: processedWorkflow.nodes.filter((n: any) => n.type === 'guardrail').length - existingGuardrails.length,
        complianceStandards: processedWorkflow.complianceStandards || [],
        specifyChanges,
        specifyCount: specifyChanges.length,
        placeholders,
        placeholderCount: placeholders.length,
        autoResolved,
        autoResolvedCount: autoResolved.length,
        requiredEnv,
        requiredEnvCount: requiredEnv.length,
        envExample: requiredEnv.map((e: any) => `${e.name}=`).join('\n'),
        message: `Workflow imported. Jerry made ${specifyChanges.length} clarification${specifyChanges.length === 1 ? '' : 's'}, wired ${autoResolved.length} field${autoResolved.length === 1 ? '' : 's'} to shell env vars (${requiredEnv.length} unique var${requiredEnv.length === 1 ? '' : 's'} required by the runner)${placeholders.length === 0 ? '. Nothing left to fill in.' : `, ${placeholders.length} non-credential placeholder${placeholders.length === 1 ? '' : 's'} still need attention.`}`,
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
