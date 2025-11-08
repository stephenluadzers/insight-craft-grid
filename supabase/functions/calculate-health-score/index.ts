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
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );

    const { workflowId, workspaceId } = await req.json();

    // Gather metrics
    const { data: executions } = await supabaseClient
      .from('workflow_executions')
      .select('status, duration_ms, error_message')
      .eq('workflow_id', workflowId)
      .gte('started_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

    const { data: costData } = await supabaseClient
      .from('workflow_cost_tracking')
      .select('cost_amount_cents')
      .eq('workflow_id', workflowId)
      .gte('recorded_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

    const { data: securityScans } = await supabaseClient
      .from('workflow_security_scans')
      .select('risk_level, issues_found')
      .eq('workflow_id', workflowId)
      .order('scanned_at', { ascending: false })
      .limit(1);

    // Calculate scores
    const totalExecs = executions?.length || 0;
    const successfulExecs = executions?.filter(e => e.status === 'completed').length || 0;
    const reliabilityScore = totalExecs > 0 ? Math.round((successfulExecs / totalExecs) * 100) : 100;

    const avgDuration = totalExecs > 0 ? (executions?.reduce((sum, e) => sum + (e.duration_ms || 0), 0) ?? 0) / totalExecs : 0;
    const efficiencyScore = avgDuration < 5000 ? 100 : Math.max(0, 100 - Math.floor((avgDuration - 5000) / 1000));

    const totalCost = costData?.reduce((sum, c) => sum + c.cost_amount_cents, 0) || 0;
    const costScore = totalCost < 1000 ? 100 : Math.max(0, 100 - Math.floor(totalCost / 100));

    const securityScore = !securityScans?.[0] ? 50 : 
      securityScans[0].risk_level === 'safe' ? 100 :
      securityScans[0].risk_level === 'low' ? 80 :
      securityScans[0].risk_level === 'medium' ? 60 :
      securityScans[0].risk_level === 'high' ? 30 : 10;

    const overallScore = Math.round(
      (reliabilityScore * 0.4) + 
      (efficiencyScore * 0.3) + 
      (costScore * 0.2) + 
      (securityScore * 0.1)
    );

    // Generate recommendations
    const recommendations = [];
    if (reliabilityScore < 90) recommendations.push({ type: 'reliability', message: 'Add error handling and retry logic', priority: 'high' });
    if (efficiencyScore < 70) recommendations.push({ type: 'performance', message: 'Optimize slow nodes', priority: 'medium' });
    if (costScore < 70) recommendations.push({ type: 'cost', message: 'Review expensive API calls', priority: 'medium' });
    if (securityScore < 80) recommendations.push({ type: 'security', message: 'Address security vulnerabilities', priority: 'high' });

    // Get previous score
    const { data: previousScores } = await supabaseClient
      .from('workflow_health_scores')
      .select('overall_score')
      .eq('workflow_id', workflowId)
      .order('calculated_at', { ascending: false })
      .limit(1);

    const previousScore = previousScores?.[0]?.overall_score;
    let trend = 'stable';
    if (previousScore) {
      if (overallScore > previousScore + 5) trend = 'improving';
      else if (overallScore < previousScore - 5) trend = 'declining';
    }

    // Store health score
    await supabaseClient.from('workflow_health_scores').insert({
      workflow_id: workflowId,
      workspace_id: workspaceId,
      overall_score: overallScore,
      reliability_score: reliabilityScore,
      efficiency_score: efficiencyScore,
      cost_score: costScore,
      security_score: securityScore,
      recommendations,
      previous_score: previousScore,
      trend
    });

    return new Response(JSON.stringify({
      overall_score: overallScore,
      reliability_score: reliabilityScore,
      efficiency_score: efficiencyScore,
      cost_score: costScore,
      security_score: securityScore,
      recommendations,
      trend
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Health score error:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});