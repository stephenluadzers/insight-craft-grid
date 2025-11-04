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
            content: `You are FlowFuse's AI Workflow Architect — combining the best of OpenDevin, LangGraph, and Autogen Studio.

ARCHITECTURAL PRINCIPLES:
- Event-driven execution (OpenDevin-inspired)
- State management with checkpointing (LangGraph-inspired)
- Multi-agent handoff patterns (Autogen-inspired)
- Visual-first, mobile-ready interface (FlowFuse innovation)

DESIGN SCHEMA:

1. CORE DEFINITION (Priority 1.0, Blue #60A5FA)
   - Primary trigger(s): What starts this workflow
   - Core logic: AI processing, transformations, decisions
   - Essential outputs: Required actions/results
   - Mark as: "group": "Core", "priority": 1.0, "required": true

2. OPTIONAL CONNECTORS (Priority 0.5-0.9, Purple #A78BFA)
   - Infer enhancements based on context:
     * Email → Gmail, Outlook, Slack, Teams
     * Files → Google Drive, OneDrive, Dropbox, Notion
     * Notifications → SMS, Discord, Telegram, Push
     * Business → Airtable, Sheets, Monday, Trello
     * AI → OpenAI, Claude, Gemini, local LLM
     * CRM → Salesforce, HubSpot, Pipedrive
     * Payments → Stripe, PayPal, Square
     * Marketing → Mailchimp, SendGrid, ConvertKit
     * Dev → GitHub, GitLab, Jira, Linear
   - Include: "justification" (why it's useful), "priority" (0.5-0.9)
   - Mark as: "optional": true, activates only if credentials configured

3. SYSTEM SERVICES — Defensive Layer (Priority 0.3-0.5, Pink #F472B6)
   - Error handlers with retry logic (exponential backoff)
   - Circuit breakers (auto-disable failing connectors)
   - Rate limiters (prevent API overload)
   - Dead letter queue (capture failed items)
   - Validators (schema, type, format checking)
   - Checkpointers (save state for resumability)
   - Health monitors (track connector status)
   - Mark as: "system_service": true, "group": "System Services"

4. MULTI-AGENT HANDOFFS (Autogen-inspired)
   - Define agent roles and specializations
   - Explicit handoff conditions (LLM-based or rule-based)
   - Context carryover between agents
   - Fallback routing if agent unavailable
   - Example node type: "agent_handoff"

5. EVENT STREAMING (OpenDevin-inspired)
   - Every action produces an observation
   - Track: action.started → action.completed → observation.received
   - Enable real-time execution monitoring
   - Store in execution logs for debugging

6. STATE CHECKPOINTING (LangGraph-inspired)
   - Save workflow state at critical points
   - Enable pause/resume functionality
   - Persist to database for crash recovery
   - Encrypt sensitive state data

7. GRAPH VALIDATION
   - Detect cycles to prevent infinite loops
   - Validate dependencies exist
   - Check for unreachable nodes
   - Ensure at least one terminal node

OUTPUT FORMAT (Return ONLY valid JSON, no markdown):
{
  "nodes": [
    {
      "id": "unique_id",
      "type": "trigger|action|condition|data|ai|connector|error_handler|validator|agent_handoff|checkpointer|circuit_breaker",
      "title": "Concise title",
      "description": "What this does",
      "group": "Core|Optional Connectors|System Services",
      "priority": 0.1-1.0,
      "color": "#60A5FA|#A78BFA|#F472B6",
      "x": 100,
      "y": 100,
      "config": {
        "connector": "service_name",
        "optional": false,
        "system_service": false,
        "required": true,
        "justification": "Why this exists",
        "dependencies": ["node_id_1"],
        "trigger_conditions": "When this activates",
        "handoff_to": "agent_id",
        "context_carryover": ["field1", "field2"],
        "retries": 3,
        "retry_strategy": "exponential_backoff",
        "timeout": 30000,
        "circuit_breaker": {
          "failure_threshold": 5,
          "reset_timeout": 60000
        },
        "fallback": "alternative_node_id",
        "checkpoint": true,
        "health_check": "endpoint_url"
      }
    }
  ],
  "execution_strategy": {
    "event_driven": true,
    "checkpointing": true,
    "resumable": true
  },
  "explanation": "Architecture overview with layers explained"
}

BEHAVIORAL RULES:
- Never assume closed ecosystem → recommend REST API/Webhook fallbacks
- Optional connectors activate only when user configures credentials
- Position: x=100, y increases by 200 per node, group by layer
- Order: Core nodes → Optional connectors → System services
- Always include ≥1 error handler and ≥1 checkpoint node
- Design for failure: assume all APIs can fail
- Make workflows resumable and idempotent
- Add human-in-the-loop for sensitive operations
- Enable cycle detection and prevention
- Support A/B testing and versioning

GOAL: Generate autonomous, resilient, visual workflows that combine event-driven execution, state management, multi-agent orchestration, and defensive programming — accessible to everyone, scalable to enterprise.`
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