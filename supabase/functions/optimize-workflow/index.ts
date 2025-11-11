import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { injectGuardrailNodes, GUARDRAIL_SYSTEM_PROMPT } from "../_shared/guardrails.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  console.log('🚀 optimize-workflow function called');
  console.log('📥 Request method:', req.method);
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const requestBody = await req.json();
    console.log('📦 Request body:', JSON.stringify(requestBody, null, 2));
    
    const { workflow, userContext } = requestBody;
    
    // Input validation
    if (!workflow) {
      return new Response(
        JSON.stringify({ error: 'No workflow provided' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!workflow.nodes || !Array.isArray(workflow.nodes)) {
      return new Response(
        JSON.stringify({ error: 'Invalid workflow structure' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (workflow.nodes.length > 100) {
      return new Response(
        JSON.stringify({ error: 'Workflow exceeds maximum of 100 nodes' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    console.log('🔑 API Key check:', LOVABLE_API_KEY ? 'Present' : 'MISSING');
    
    if (!LOVABLE_API_KEY) {
      console.error('❌ LOVABLE_API_KEY not configured');
      throw new Error('LOVABLE_API_KEY not configured');
    }

    console.log('🤖 Optimizing workflow with AI Genius...');
    console.log('📊 Nodes to optimize:', workflow.nodes?.length || 0);

    // Use Gemini 2.5 Pro for advanced reasoning and optimization
    console.log('🌐 Calling Lovable AI Gateway...');
    
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: `You are a workflow optimization expert. Analyze workflows and provide focused improvements.

${GUARDRAIL_SYSTEM_PROMPT}

Return ONLY valid JSON with this exact structure (no markdown, no code blocks):
{
  "optimizedWorkflow": {
    "nodes": [/* optimized node array */]
  },
  "suggestions": [
    {
      "type": "performance|security|reliability|ux",
      "title": "Brief title",
      "description": "Concise description",
      "impact": "high|medium|low"
    }
  ]
}

Focus on:
- Error handling and retries
- Missing critical steps
- Security improvements
- Performance optimizations

Keep nodes array complete but descriptions brief.`
          },
          {
            role: 'user',
            content: `Optimize this workflow:\n\n${JSON.stringify(workflow, null, 2)}`
          }
        ]
      }),
    });
    
    console.log('📡 AI Gateway response status:', response.status);

    if (!response.ok) {
      console.error('❌ AI Gateway error status:', response.status);
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again in a moment.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'AI credits exhausted. Please add credits to continue.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      const errorText = await response.text();
      console.error('AI Gateway error:', response.status, errorText);
      throw new Error(`AI Gateway error: ${response.status}`);
    }

    const data = await response.json();
    console.log('📨 AI Gateway raw data:', JSON.stringify(data, null, 2));
    
    const content = data.choices?.[0]?.message?.content;
    console.log('📝 AI content length:', content?.length || 0);
    
    if (!content) {
      console.error('❌ No content in AI response');
      throw new Error('No response from AI');
    }

    console.log('✅ AI optimization response received, parsing...');

    // Parse the JSON response with improved extraction
    let optimizationData;
    try {
      // Try to extract JSON from markdown code blocks first
      let jsonStr = content;
      const codeBlockMatch = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
      
      if (codeBlockMatch) {
        jsonStr = codeBlockMatch[1];
      } else {
        // Try to find JSON object boundaries
        const firstBrace = content.indexOf('{');
        const lastBrace = content.lastIndexOf('}');
        if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
          jsonStr = content.substring(firstBrace, lastBrace + 1);
        }
      }

      // Clean up common JSON issues
      jsonStr = jsonStr
        .replace(/,(\s*[}\]])/g, '$1') // Remove trailing commas
        .replace(/\n/g, ' ')           // Remove newlines that might break strings
        .trim();

      optimizationData = JSON.parse(jsonStr);
      
      // Validate required structure
      if (!optimizationData.optimizedWorkflow || !optimizationData.suggestions) {
        throw new Error('Missing required fields in response');
      }

      // Automatically inject guardrail nodes if missing
      if (optimizationData.optimizedWorkflow.nodes) {
        const existingGuardrails = optimizationData.optimizedWorkflow.nodes.filter((n: any) => n.type === 'guardrail').length;
        if (existingGuardrails === 0) {
          optimizationData.optimizedWorkflow.nodes = injectGuardrailNodes(optimizationData.optimizedWorkflow.nodes);
          console.log('Guardrail nodes auto-injected during optimization');
        }
      }
    } catch (parseError) {
      console.error('Failed to parse AI response as JSON:', parseError);
      console.error('Raw content:', content);
      throw new Error('AI returned invalid JSON format. Please try again.');
    }

    return new Response(
      JSON.stringify(optimizationData),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in optimize-workflow:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
