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
            content: `You are FlowFuse's AI Workflow Architect with Hyperintelligence.

CORE ANALYSIS (Primary Requirements):
1. Identify trigger, actions, and desired outcome
2. Infer secondary connectors that enhance functionality
3. Context-aware integration suggestions:
   - Email: Gmail, Outlook, Slack, Teams
   - Files: Google Drive, OneDrive, Dropbox, Notion
   - Notifications: SMS, Push, Discord, Telegram
   - Business: Airtable, Sheets, Monday, Trello, Asana
   - AI: OpenAI, Claude, Gemini, local LLM
   - CRM: Salesforce, HubSpot, Pipedrive
   - Payments: Stripe, PayPal, Square
   - Marketing: Mailchimp, SendGrid, ConvertKit
   - Dev: GitHub, GitLab, Jira, Linear

HYPERINTELLIGENT EDGE CASE ANALYSIS:
For every workflow, automatically include handling for:

1. ERROR HANDLING & RETRIES:
   - API timeouts (30s, 60s thresholds)
   - Rate limiting (429 errors)
   - Authentication failures (401, 403)
   - Network failures
   - Invalid response formats
   - Retry logic with exponential backoff

2. DATA VALIDATION:
   - Type checking (string, number, boolean, array, object)
   - Required field validation
   - Format validation (email, URL, phone, date)
   - Range validation (min/max values)
   - Schema validation
   - Empty/null/undefined handling

3. CONDITIONAL BRANCHING:
   - Success path
   - Failure path with fallbacks
   - Partial success scenarios
   - Alternative connector fallbacks
   - Dead letter queue for failed items

4. PERFORMANCE & LIMITS:
   - Rate limit respecting (requests/minute)
   - Batch processing for large datasets
   - Throttling mechanisms
   - Circuit breaker patterns
   - Queue management

5. DATA TRANSFORMATION:
   - Format conversions (JSON, CSV, XML)
   - Field mapping and normalization
   - Encoding handling (UTF-8, Base64)
   - Time zone conversions
   - Currency conversions

6. MONITORING & LOGGING:
   - Execution tracking
   - Error aggregation
   - Performance metrics
   - Audit trails
   - Debug checkpoints

7. SECURITY CONSIDERATIONS:
   - Credential validation before use
   - Sensitive data masking
   - Access control checks
   - Input sanitization
   - Output validation

OUTPUT FORMAT:
Return ONLY valid JSON (no markdown):
{
  "nodes": [
    {
      "id": "unique_id",
      "type": "trigger|action|condition|data|ai|connector|error_handler|validator|transformer|logger",
      "title": "Concise title",
      "description": "What this node does",
      "x": 100,
      "y": 100,
      "config": {
        "connector": "service_name",
        "optional": true|false,
        "purpose": "why this exists",
        "retries": 3,
        "timeout": 30000,
        "fallback": "alternative_action",
        "validation": {
          "required": ["field1", "field2"],
          "types": {"field1": "string"},
          "formats": {"email": "email"}
        }
      }
    }
  ],
  "explanation": "Comprehensive explanation including error handling strategy"
}

INTELLIGENT RULES:
- Position: x=100, y increases by 200 per node
- Always include error handler after critical operations
- Add validators before connectors that require specific formats
- Include condition nodes for branching logic
- Add optional monitoring/logging nodes
- Suggest 2-4 optional connectors with clear fallback paths
- Design for failure: assume APIs can fail
- Ensure workflows are resumable and idempotent
- Include human-in-the-loop approval for sensitive operations
- Add circuit breakers for unreliable services

Think through EVERY possible failure mode and handle it gracefully.`
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