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
    const { description } = await req.json();

    if (!description) {
      throw new Error('Description is required');
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

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
            content: `You are a workflow automation expert. Convert user descriptions into structured workflow nodes.
            
Return JSON with:
- "nodes": array of workflow nodes with id, type (trigger/action/condition/data/ai), title, description, x, y coordinates, and config object
- "explanation": detailed explanation of the workflow and how it works

Position nodes vertically with 200px spacing. Start at x:100, y:100.
Include meaningful config data for each node (e.g., API endpoints, conditions, data mappings).

Example config for action node: {"url": "https://api.example.com/endpoint", "method": "POST", "headers": {}}
Example config for condition node: {"field": "priority", "operator": "equals", "value": "high"}
Example config for AI node: {"model": "gpt-4", "prompt": "Analyze this data..."}
Example config for data node: {"source": "database", "query": "SELECT * FROM table", "transform": "filter"}

Return only valid JSON, no markdown.`
          },
          {
            role: 'user',
            content: description
          }
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI API error:', response.status, errorText);
      throw new Error(`AI API error: ${response.status}`);
    }

    const data = await response.json();
    let content = data.choices[0].message.content;
    
    // Strip markdown code fences if present
    content = content.trim();
    if (content.startsWith('```json')) {
      content = content.replace(/^```json\n/, '').replace(/\n```$/, '');
    } else if (content.startsWith('```')) {
      content = content.replace(/^```\n/, '').replace(/\n```$/, '');
    }
    
    // Parse the JSON response
    const parsed = JSON.parse(content.trim());

    console.log('Generated workflow:', parsed);

    return new Response(
      JSON.stringify(parsed),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error in generate-workflow-from-text:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});