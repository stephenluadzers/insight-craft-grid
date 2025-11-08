import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { webhookId, eventType, payload } = await req.json();

    if (!webhookId || !eventType || !payload) {
      return new Response(
        JSON.stringify({ error: 'webhookId, eventType, and payload are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Delivering webhook ${webhookId} for event ${eventType}`);

    // Get webhook and check if subscribed to this event
    const { data: webhook, error: webhookError } = await supabase
      .from('workflow_webhooks')
      .select('*, webhook_event_subscriptions(*)')
      .eq('id', webhookId)
      .eq('enabled', true)
      .single();

    if (webhookError || !webhook) {
      console.error('Webhook not found or disabled:', webhookError);
      return new Response(
        JSON.stringify({ error: 'Webhook not found or disabled' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if subscribed to this event type
    const isSubscribed = webhook.webhook_event_subscriptions?.some(
      (sub: any) => sub.event_type === eventType
    );

    if (!isSubscribed) {
      console.log(`Webhook ${webhookId} not subscribed to event ${eventType}`);
      return new Response(
        JSON.stringify({ success: true, message: 'Not subscribed to this event' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Prepare delivery
    const deliveryPayload = {
      event_type: eventType,
      timestamp: new Date().toISOString(),
      webhook_id: webhookId,
      data: payload,
    };

    // Create delivery log
    const { data: logData, error: logError } = await supabase
      .from('webhook_delivery_logs')
      .insert({
        webhook_id: webhookId,
        event_type: eventType,
        payload: deliveryPayload,
        status: 'pending',
      })
      .select()
      .single();

    if (logError) {
      console.error('Error creating delivery log:', logError);
      throw logError;
    }

    const deliveryLogId = logData.id;

    try {
      // In a real implementation, this would send to an external URL
      // For now, we'll simulate the delivery
      
      // Simulate HTTP request to external endpoint
      const externalUrl = webhook.external_url || null;
      
      if (!externalUrl) {
        throw new Error('No external URL configured for webhook');
      }

      const deliveryResponse = await fetch(externalUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Signature': await generateSignature(webhook.webhook_key, deliveryPayload),
          'X-Webhook-Event': eventType,
        },
        body: JSON.stringify(deliveryPayload),
      });

      const responseBody = await deliveryResponse.text();
      let parsedResponse;
      try {
        parsedResponse = JSON.parse(responseBody);
      } catch {
        parsedResponse = { raw: responseBody };
      }

      // Update delivery log with success
      await supabase
        .from('webhook_delivery_logs')
        .update({
          status: 'success',
          http_status_code: deliveryResponse.status,
          response_body: parsedResponse,
          delivered_at: new Date().toISOString(),
        })
        .eq('id', deliveryLogId);

      console.log(`Webhook ${webhookId} delivered successfully`);

      return new Response(
        JSON.stringify({
          success: true,
          deliveryId: deliveryLogId,
          statusCode: deliveryResponse.status,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } catch (deliveryError: any) {
      console.error('Error delivering webhook:', deliveryError);

      // Update delivery log with failure
      await supabase
        .from('webhook_delivery_logs')
        .update({
          status: 'failed',
          error_message: deliveryError.message,
          delivered_at: new Date().toISOString(),
        })
        .eq('id', deliveryLogId);

      // Schedule retry if not exceeded max retries
      const { data: logRetry } = await supabase
        .from('webhook_delivery_logs')
        .select('retry_count')
        .eq('id', deliveryLogId)
        .single();

      if (logRetry && logRetry.retry_count < 3) {
        // Schedule retry (in production, use a queue)
        await supabase
          .from('webhook_delivery_logs')
          .update({
            status: 'retrying',
            retry_count: logRetry.retry_count + 1,
          })
          .eq('id', deliveryLogId);
      }

      return new Response(
        JSON.stringify({
          success: false,
          error: 'Delivery failed',
          deliveryId: deliveryLogId,
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

  } catch (error: any) {
    console.error('Error in webhook-delivery function:', error);
    
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});

async function generateSignature(secret: string, payload: any): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(JSON.stringify(payload));
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', key, data);
  return Array.from(new Uint8Array(signature))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}
