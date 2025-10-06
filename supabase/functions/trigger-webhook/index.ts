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
    const url = new URL(req.url);
    const webhookKey = url.searchParams.get('key');

    if (!webhookKey) {
      return new Response(
        JSON.stringify({ error: 'Webhook key is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Find the webhook
    const { data: webhook, error: webhookError } = await supabase
      .from('workflow_webhooks')
      .select('*, workflows(*)')
      .eq('webhook_key', webhookKey)
      .eq('enabled', true)
      .single();

    if (webhookError || !webhook) {
      return new Response(
        JSON.stringify({ error: 'Webhook not found or disabled' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update last triggered timestamp
    await supabase
      .from('workflow_webhooks')
      .update({ last_triggered_at: new Date().toISOString() })
      .eq('id', webhook.id);

    // Get workflow data
    const workflow = webhook.workflows;
    const triggerData = await req.json().catch(() => ({}));

    // Execute the workflow
    const { data, error } = await supabase.functions.invoke('execute-workflow', {
      body: {
        nodes: workflow.nodes,
        triggeredBy: null, // Webhook trigger
        workspaceId: workflow.workspace_id,
        workflowId: workflow.id,
        triggerData,
      }
    });

    if (error) throw error;

    console.log('Webhook triggered workflow:', workflow.id);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Workflow triggered successfully',
        executionId: data.executionId,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error in trigger-webhook function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});