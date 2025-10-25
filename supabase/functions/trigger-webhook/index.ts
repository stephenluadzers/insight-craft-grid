import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-webhook-key, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get webhook key from header or query param
    let webhookKey = req.headers.get('x-webhook-key');
    
    // Also support query parameter for easier testing
    if (!webhookKey) {
      const url = new URL(req.url);
      webhookKey = url.searchParams.get('key');
    }

    if (!webhookKey) {
      return new Response(
        JSON.stringify({ error: 'Webhook key is required in X-Webhook-Key header or key query parameter' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate webhook key format
    if (typeof webhookKey !== 'string' || webhookKey.length < 32) {
      return new Response(
        JSON.stringify({ error: 'Invalid webhook key format' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
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

    // Get client IP for audit logging
    const clientIp = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';

    // Log webhook access
    await supabase
      .from('webhook_access_logs')
      .insert({
        webhook_id: webhook.id,
        action: 'triggered',
        ip_address: clientIp,
        accessed_at: new Date().toISOString(),
      });

    // Update last triggered timestamp
    await supabase
      .from('workflow_webhooks')
      .update({ last_triggered_at: new Date().toISOString() })
      .eq('id', webhook.id);

    // Get workflow data
    const workflow = webhook.workflows;
    
    // Parse and validate trigger data
    let triggerData = {};
    try {
      const contentType = req.headers.get('content-type');
      if (contentType?.includes('application/json')) {
        triggerData = await req.json();
        
        // Limit payload size
        const payloadStr = JSON.stringify(triggerData);
        if (payloadStr.length > 1024 * 1024) { // 1MB limit
          throw new Error('Payload exceeds maximum size of 1MB');
        }
        
        // Validate payload doesn't contain dangerous patterns
        const dangerousPatterns = [
          /(<script|javascript:)/i,
          /(union|insert|update|delete|drop|create|alter)\s+(select|from|into|table)/i,
          /__proto__|constructor\[["']prototype["']\]/i,
        ];
        
        for (const pattern of dangerousPatterns) {
          if (pattern.test(payloadStr)) {
            throw new Error('Invalid payload content detected');
          }
        }
        
        // Sanitize payload
        const sanitizeValue = (val: any, depth = 0): any => {
          if (depth > 10) return null; // Prevent deep nesting attacks
          if (typeof val === 'string') return val.slice(0, 10000);
          if (Array.isArray(val)) return val.slice(0, 100).map(v => sanitizeValue(v, depth + 1));
          if (val && typeof val === 'object') {
            const sanitized: Record<string, any> = {};
            Object.keys(val).slice(0, 50).forEach(key => {
              sanitized[key] = sanitizeValue(val[key], depth + 1);
            });
            return sanitized;
          }
          return val;
        };
        
        triggerData = sanitizeValue(triggerData);
      }
    } catch (parseError) {
      console.warn('Failed to parse or validate trigger data:', parseError);
      return new Response(
        JSON.stringify({ error: 'Invalid payload data' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

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