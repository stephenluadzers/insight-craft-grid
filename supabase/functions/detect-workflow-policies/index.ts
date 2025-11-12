import "https://deno.land/x/xhr@0.1.0/mod.ts";
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
    const { workflow } = await req.json();

    if (!workflow || !workflow.nodes) {
      return new Response(
        JSON.stringify({ error: 'Invalid workflow structure' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    // Prepare workflow context for LLM analysis
    const workflowContext = workflow.nodes
      .map((n: any) => `${n.title || n.type}: ${n.description || ''}`)
      .join('\n');

    const systemPrompt = `You are a compliance and security policy analyzer. Analyze the following workflow and determine:

1. What data types are being processed (PII, PHI, payment data, etc.)
2. What compliance standards apply (GDPR, HIPAA, PCI-DSS, SOC2, etc.)
3. What risks exist in this workflow
4. What guardrails should be applied

Respond with a JSON object containing:
{
  "dataTypes": ["pii", "phi", "payment", "generic"],
  "complianceStandards": ["GDPR", "HIPAA", "PCI-DSS", "SOC2"],
  "risks": [
    {
      "type": "sql_injection",
      "severity": "critical",
      "reasoning": "User input concatenated into database query"
    }
  ],
  "recommendedGuardrails": ["guardrail_sql_injection", "guardrail_gdpr_compliance"],
  "reasoning": "Overall explanation of policy requirements"
}`;

    const userPrompt = `Analyze this workflow for compliance and security requirements:\n\n${workflowContext}`;

    console.log('Calling Lovable AI for policy detection...');

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Lovable AI error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'Insufficient credits. Please add funds to your workspace.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      throw new Error(`Lovable AI request failed: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error('No response from Lovable AI');
    }

    console.log('AI Response:', content);

    // Parse JSON response
    let policyAnalysis;
    try {
      // Try to extract JSON from markdown code blocks if present
      const jsonMatch = content.match(/```(?:json)?\s*(\{[\s\S]*\})\s*```/);
      const jsonStr = jsonMatch ? jsonMatch[1] : content;
      policyAnalysis = JSON.parse(jsonStr);
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError);
      // Fallback response
      policyAnalysis = {
        dataTypes: ['generic'],
        complianceStandards: ['SOC2'],
        risks: [],
        recommendedGuardrails: ['guardrail_input_validation', 'guardrail_output_validation'],
        reasoning: 'Unable to perform detailed analysis. Applied basic guardrails.'
      };
    }

    return new Response(
      JSON.stringify({
        success: true,
        analysis: policyAnalysis
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Error in detect-workflow-policies:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
