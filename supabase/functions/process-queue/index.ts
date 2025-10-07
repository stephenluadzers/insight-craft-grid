import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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

    // Get pending queue items that are ready to execute
    const { data: queueItems, error: queueError } = await supabase
      .from('workflow_execution_queue')
      .select('*')
      .or('status.eq.pending,and(status.eq.failed,next_retry_at.lte.now())')
      .lte('scheduled_at', new Date().toISOString())
      .order('priority', { ascending: false })
      .order('scheduled_at', { ascending: true })
      .limit(10);

    if (queueError) throw queueError;

    console.log(`Processing ${queueItems?.length || 0} queue items`);

    const results = [];

    for (const item of queueItems || []) {
      try {
        // Check circuit breaker status
        const { data: circuitBreaker } = await supabase
          .from('integration_circuit_breakers')
          .select('*')
          .eq('workspace_id', item.workspace_id)
          .single();

        if (circuitBreaker?.state === 'open') {
          console.log(`Circuit breaker open for workspace ${item.workspace_id}, skipping`);
          continue;
        }

        // Check rate limits
        const { data: rateLimit } = await supabase
          .from('workspace_rate_limits')
          .select('*')
          .eq('workspace_id', item.workspace_id)
          .eq('resource_type', 'workflow_execution')
          .single();

        if (rateLimit) {
          // Reset counters if expired
          const now = new Date();
          if (new Date(rateLimit.minute_reset_at) < now) {
            await supabase
              .from('workspace_rate_limits')
              .update({
                current_minute_count: 0,
                minute_reset_at: new Date(now.getTime() + 60000).toISOString()
              })
              .eq('id', rateLimit.id);
          }

          if (rateLimit.current_minute_count >= rateLimit.limit_per_minute) {
            console.log(`Rate limit exceeded for workspace ${item.workspace_id}`);
            continue;
          }
        }

        // Update status to processing
        await supabase
          .from('workflow_execution_queue')
          .update({
            status: 'processing',
            started_at: new Date().toISOString()
          })
          .eq('id', item.id);

        // Execute workflow
        const startTime = Date.now();
        const { data: execResult, error: execError } = await supabase.functions.invoke('execute-workflow', {
          body: {
            workflowId: item.workflow_id,
            queueItemId: item.id,
            ...item.execution_data
          }
        });

        const executionTime = Date.now() - startTime;

        if (execError) {
          throw execError;
        }

        // Update queue item as completed
        await supabase
          .from('workflow_execution_queue')
          .update({
            status: 'completed',
            completed_at: new Date().toISOString()
          })
          .eq('id', item.id);

        // Update rate limit counter
        if (rateLimit) {
          await supabase
            .from('workspace_rate_limits')
            .update({
              current_minute_count: rateLimit.current_minute_count + 1,
              current_hour_count: rateLimit.current_hour_count + 1,
              current_day_count: rateLimit.current_day_count + 1
            })
            .eq('id', rateLimit.id);
        }

        results.push({
          queue_item_id: item.id,
          status: 'completed',
          execution_time: executionTime
        });

      } catch (error: any) {
        console.error(`Error processing queue item ${item.id}:`, error);

        const newRetryCount = item.retry_count + 1;

        if (newRetryCount >= item.max_retries) {
          // Move to dead letter queue
          await supabase
            .from('workflow_dead_letter_queue')
            .insert({
              queue_item_id: item.id,
              workflow_id: item.workflow_id,
              workspace_id: item.workspace_id,
              failure_count: newRetryCount,
              last_error: error.message || 'Unknown error',
              execution_data: item.execution_data
            });

          await supabase
            .from('workflow_execution_queue')
            .update({
              status: 'dead_letter',
              error_message: error.message
            })
            .eq('id', item.id);
        } else {
          // Schedule retry with exponential backoff
          const baseDelay = 60; // 60 seconds
          const nextRetryDelay = baseDelay * Math.pow(2, newRetryCount);
          const nextRetryAt = new Date(Date.now() + nextRetryDelay * 1000);

          await supabase
            .from('workflow_execution_queue')
            .update({
              status: 'failed',
              retry_count: newRetryCount,
              error_message: error.message,
              next_retry_at: nextRetryAt.toISOString()
            })
            .eq('id', item.id);
        }

        results.push({
          queue_item_id: item.id,
          status: 'failed',
          error: error.message,
          retry_count: newRetryCount
        });
      }
    }

    return new Response(
      JSON.stringify({
        processed: results.length,
        results
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in process-queue:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
