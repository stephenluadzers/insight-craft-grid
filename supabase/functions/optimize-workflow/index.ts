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
    const { workflow, userContext } = await req.json();
    
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
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    console.log('Optimizing workflow with AI Genius...');

    // Use Gemini 2.5 Pro for advanced reasoning and optimization
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-pro',
        messages: [
          {
            role: 'system',
            content: `You are the Best Practice & Optimization Engine (BPOE) - an AI Genius that analyzes workflows and enhances them to exceed industry standards.

Your responsibilities:
1. **Completeness Analysis**: Identify missing mandatory steps, error handlers, notifications
2. **Best Practices**: Apply industry-standard patterns and proven methodologies
3. **Performance Optimization**: Suggest parallel processing, caching, batch operations
4. **Resilience**: Add retry logic, fallback mechanisms, circuit breakers
5. **Innovation**: Propose cutting-edge improvements that surpass current standards
6. **Security**: Ensure proper authentication, data validation, encryption where needed
7. **User Experience**: Optimize for cognitive load reduction and intuitive flow

Context: ${userContext || 'General workflow automation'}

CRITICAL: Return ONLY valid JSON. No markdown, no explanations, no code blocks. Just pure JSON.

Format (ensure all strings are properly escaped and no trailing commas):
{
  "optimizedWorkflow": {
    "nodes": [],
    "insights": "string"
  },
  "suggestions": [
    {
      "type": "string",
      "title": "string",
      "description": "string",
      "impact": "string"
    }
  ],
  "innovations": []
}`
          },
          {
            role: 'user',
            content: `Analyze and optimize this workflow. Make it complete, robust, and exceptional:\n\n${JSON.stringify(workflow, null, 2)}`
          }
        ],
        temperature: 0.3,
        max_tokens: 6000
      }),
    });

    if (!response.ok) {
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
    const content = data.choices?.[0]?.message?.content;
    
    if (!content) {
      throw new Error('No response from AI');
    }

    console.log('AI optimization response received');

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
