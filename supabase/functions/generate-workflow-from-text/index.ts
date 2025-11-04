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
When generating a workflow, analyze the user's request and produce a structured, ranked, and context-aware automation design.
Your output must include required and optional connectors, grouped by logical importance and type.

DESIGN SCHEMA:

1. CORE DEFINITION
   - Identify the primary purpose of the workflow
   - Define essential trigger(s), AI logic, and core output actions
   - These nodes form the "Core Layer" (group: "Core")

2. OPTIONAL CONNECTORS
   - Infer additional connectors that expand the workflow's value
   - Tag as "optional": true with "priority" score (0.1 to 1.0):
     * 1.0–0.8: Highly relevant (e.g., Slack for notifications)
     * 0.7–0.5: Useful but situational
     * 0.4–0.1: Optional/experimental
   - Include "justification" field explaining why it was chosen
   
   Context-specific suggestions:
   - Email: Gmail, Outlook, Slack, Teams
   - Files: Google Drive, OneDrive, Dropbox, Notion
   - Notifications: SMS, Push, Discord, Telegram
   - Business: Airtable, Sheets, Monday, Trello, Asana
   - AI: OpenAI, Claude, Gemini, local LLM
   - CRM: Salesforce, HubSpot, Pipedrive
   - Payments: Stripe, PayPal, Square
   - Marketing: Mailchimp, SendGrid, ConvertKit
   - Dev: GitHub, GitLab, Jira, Linear

3. SYSTEM SERVICES (Defensive Layer)
   - Add optional self-healing, monitoring, resilience nodes
   - Examples: Error logging, traffic sanitization, context memory
   - Mark as "system_service": true, group: "System Services"
   - Include: Circuit breakers, retry logic, rate limiters, validators

4. GROUPING AND METADATA
   Groups:
   - "group": "Core" → color: "#60A5FA" (blue)
   - "group": "Optional Connectors" → color: "#A78BFA" (purple)
   - "group": "System Services" → color: "#F472B6" (pink)
   
   Each node must have:
   - "description": What it does
   - "dependencies": Array of node IDs it depends on
   - "trigger_conditions": When it activates

5. OUTPUT FORMAT
Return ONLY valid JSON (no markdown):
{
  "nodes": [
    {
      "id": "unique_id",
      "type": "trigger|action|condition|data|ai|connector|error_handler|validator|transformer|logger",
      "title": "Concise title",
      "description": "What this node does",
      "group": "Core|Optional Connectors|System Services",
      "priority": 1.0,
      "color": "#60A5FA",
      "x": 100,
      "y": 100,
      "config": {
        "connector": "service_name",
        "optional": false,
        "system_service": false,
        "justification": "Why this exists",
        "dependencies": ["node_id_1"],
        "trigger_conditions": "When this activates",
        "retries": 3,
        "timeout": 30000,
        "fallback": "alternative_action"
      }
    }
  ],
  "explanation": "Comprehensive workflow explanation with layer breakdown"
}

6. BEHAVIORAL RULES
   - Never assume closed ecosystem
   - When in doubt, recommend open connector (REST API, Webhook, Custom Function)
   - Optional connectors activate only when configured by user
   - Position: x=100, y increases by 200 per node
   - Core nodes first, then optional, then system services
   - Always include at least 1 system service (error handler/logger)
   - Design for failure: assume APIs can fail
   - Ensure workflows are resumable and idempotent

GOAL: Generate flexible, ranked, intelligently grouped AI workflows with visual distinction between core, optional, and defensive system layers — producing modular orchestration ready for simple and enterprise-scale automations.`
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