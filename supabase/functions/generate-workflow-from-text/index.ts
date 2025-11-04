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
            content: `You are FlowFuse's AI Workflow Architect.

ANALYSIS REQUIREMENTS:
1. Identify the primary trigger, action(s), and outcome from the user's request
2. Infer secondary (optional) connectors that would logically enhance the workflow
3. Consider context-specific integrations:
   - Email workflows → Gmail, Outlook, Slack, Teams
   - File operations → Google Drive, OneDrive, Dropbox, Notion
   - Notifications → SMS, Push, Discord, Telegram
   - Business tools → Airtable, Sheets, Monday, Trello, Asana
   - AI analysis → OpenAI, Claude, Gemini, local LLM endpoints
   - CRM → Salesforce, HubSpot, Pipedrive
   - Payments → Stripe, PayPal, Square
   - Marketing → Mailchimp, SendGrid, ConvertKit
   - Development → GitHub, GitLab, Jira, Linear

CONNECTOR CLASSIFICATION:
- Core connectors: Required for the workflow to function (optional: false)
- Optional connectors: Enhance functionality if credentials provided (optional: true)

OUTPUT FORMAT:
Return ONLY valid JSON (no markdown):
{
  "nodes": [
    {
      "id": "1",
      "type": "trigger|action|condition|data|ai|connector",
      "title": "Brief title",
      "description": "Brief description",
      "x": 100,
      "y": 100,
      "config": {
        "connector": "service_name",
        "optional": true|false,
        "purpose": "what this connector adds to the workflow"
      }
    }
  ],
  "explanation": "Brief workflow explanation including optional connectors"
}

RULES:
- Position nodes vertically: x=100, y increases by 200 per node
- Keep descriptions concise but informative
- Include 2-4 optional connectors that would enhance the workflow
- Optional connectors should only activate when credentials are provided
- Each connector must have clear purpose description
- Ensure logical flow from trigger → actions → outcome`
          },
          {
            role: 'user',
            content: description
          }
        ]
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI API error:', response.status, errorText);
      throw new Error(`AI API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices[0].message.content;
    
    // Parse the JSON response
    let parsed;
    try {
      // Extract JSON from markdown code blocks if present
      const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/) || 
                       content.match(/\{[\s\S]*\}/);
      const jsonStr = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : content;
      parsed = JSON.parse(jsonStr);
    } catch (parseError) {
      console.error('Failed to parse AI response as JSON:', parseError);
      throw new Error('AI returned invalid JSON format');
    }

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