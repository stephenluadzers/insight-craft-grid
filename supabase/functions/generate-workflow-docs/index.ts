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
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );

    const { workflowId, workspaceId, documentationType } = await req.json();

    const { data: workflow } = await supabaseClient
      .from('workflows')
      .select('*')
      .eq('id', workflowId)
      .single();

    if (!workflow) throw new Error('Workflow not found');

    const prompts = {
      overview: 'Generate a comprehensive overview of this workflow including purpose, key features, and business value.',
      setup_guide: 'Create a detailed setup guide with prerequisites, step-by-step instructions, and configuration examples.',
      troubleshooting: 'Generate troubleshooting documentation with common issues, error messages, and solutions.',
      api_reference: 'Create technical API reference documentation for this workflow including all nodes, parameters, and data flows.'
    };

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [{
          role: 'user',
          content: `${prompts[documentationType as keyof typeof prompts]}

Workflow: ${JSON.stringify(workflow)}

Generate well-structured markdown documentation.`
        }]
      })
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limit exceeded' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      throw new Error('AI gateway error');
    }

    const aiData = await aiResponse.json();
    const documentation = aiData.choices[0].message.content;

    // Mark old docs as not current
    await supabaseClient
      .from('workflow_documentation')
      .update({ is_current: false })
      .eq('workflow_id', workflowId)
      .eq('documentation_type', documentationType);

    // Get version number
    const { count } = await supabaseClient
      .from('workflow_documentation')
      .select('*', { count: 'exact', head: true })
      .eq('workflow_id', workflowId)
      .eq('documentation_type', documentationType);

    // Insert new documentation
    await supabaseClient.from('workflow_documentation').insert({
      workflow_id: workflowId,
      workspace_id: workspaceId,
      content: { markdown: documentation },
      documentation_type: documentationType,
      version: (count || 0) + 1,
      is_current: true
    });

    return new Response(JSON.stringify({ documentation }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Documentation generation error:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});