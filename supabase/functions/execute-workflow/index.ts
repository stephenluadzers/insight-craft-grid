import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  let executionId: string | null = null;

  try {
    const { nodes, edges, triggeredBy, workspaceId, workflowId, context: workflowContext } = await req.json();

    // Input validation
    if (!nodes || !Array.isArray(nodes)) {
      return new Response(JSON.stringify({ error: 'Invalid nodes array' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    if (nodes.length > 100) {
      return new Response(JSON.stringify({ error: 'Workflow exceeds maximum of 100 nodes' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    if (!workspaceId) {
      return new Response(JSON.stringify({ error: 'Workspace ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Validate nodes for dangerous patterns
    const nodesStr = JSON.stringify(nodes);
    const dangerousPatterns = [
      /(<script|javascript:)/i,
      /(union|insert|update|delete|drop|create|alter)\s+(select|from|into|table)/i,
      /__proto__|constructor\[["']prototype["']\]/i,
    ];
    for (const pattern of dangerousPatterns) {
      if (pattern.test(nodesStr)) {
        return new Response(JSON.stringify({ error: 'Invalid workflow node content detected' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
    }
    for (const node of nodes) {
      if (!node.id || !node.type) {
        return new Response(JSON.stringify({ error: 'Invalid node structure: missing id or type' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
    }

    console.log('Starting workflow execution:', { nodeCount: nodes.length, workspaceId, workflowId });

    // Create execution record
    const { data: execution, error: execError } = await supabaseAdmin
      .from('workflow_executions')
      .insert({
        workflow_id: workflowId,
        workspace_id: workspaceId,
        triggered_by: triggeredBy,
        status: 'running',
        execution_data: { triggeredAt: new Date().toISOString() }
      })
      .select()
      .single();

    if (execError || !execution) throw new Error('Failed to create execution record');
    executionId = execution.id;
    const startTime = Date.now();

    // Process context placeholders in node configs
    const processedNodes = nodes.map((node: any) => {
      if (node.data?.config) {
        const processedConfig = JSON.parse(
          JSON.stringify(node.data.config).replace(
            /\{\{context\.(\w+)\}\}/g,
            (_: string, key: string) => (workflowContext || {})[key] || `{{context.${key}}}`
          )
        );
        return { ...node, data: { ...node.data, config: processedConfig } };
      }
      return node;
    });

    // Build dependency graph from edges
    const edgeList: Array<{ source: string; target: string }> = edges || [];
    const dependencyMap = new Map<string, Set<string>>();
    const nodeMap = new Map<string, any>();

    for (const node of processedNodes) {
      nodeMap.set(node.id, node);
      dependencyMap.set(node.id, new Set());
    }
    for (const edge of edgeList) {
      dependencyMap.get(edge.target)?.add(edge.source);
    }

    // Topological execution with parallelism
    const completed = new Set<string>();
    const results: Record<string, any> = {};
    let finalStatus = 'success';
    let errorMessage = '';

    const isReady = (nodeId: string) => {
      const deps = dependencyMap.get(nodeId) || new Set();
      return [...deps].every((d) => completed.has(d));
    };

    const executeOneNode = async (node: any): Promise<void> => {
      const nodeStartTime = Date.now();
      await logNode(executionId!, node, 'running', {});

      let retryCount = 0;
      const maxRetries = 3;

      while (retryCount < maxRetries) {
        try {
          const result = await executeNode(node, results);
          results[node.id] = result;
          completed.add(node.id);

          await logNode(executionId!, node, 'success', {
            output_data: result,
            duration_ms: Date.now() - nodeStartTime,
            retry_count: retryCount,
          });
          return;
        } catch (error: any) {
          retryCount++;
          if (retryCount >= maxRetries) {
            finalStatus = 'error';
            errorMessage = `Node ${node.id} failed after ${maxRetries} retries: ${error.message}`;
            completed.add(node.id); // mark done to unblock graph
            results[node.id] = { status: 'error', error: error.message };

            await logNode(executionId!, node, 'error', {
              error_message: error.message,
              duration_ms: Date.now() - nodeStartTime,
              retry_count: retryCount,
            });
            return;
          }
          await new Promise((r) => setTimeout(r, 1000 * Math.pow(2, retryCount - 1)));
        }
      }
    };

    // Execute in waves — all ready nodes run in parallel
    while (completed.size < processedNodes.length) {
      const readyNodes = processedNodes.filter(
        (n: any) => !completed.has(n.id) && isReady(n.id)
      );

      if (readyNodes.length === 0) {
        // Deadlock or all remaining have unmet deps
        const remaining = processedNodes.filter((n: any) => !completed.has(n.id)).map((n: any) => n.id);
        errorMessage = `Deadlock: nodes ${remaining.join(', ')} have unresolvable dependencies`;
        finalStatus = 'error';
        break;
      }

      // Run all ready nodes in parallel
      await Promise.all(readyNodes.map(executeOneNode));
    }

    const totalDuration = Date.now() - startTime;

    await supabaseAdmin
      .from('workflow_executions')
      .update({
        status: finalStatus,
        completed_at: new Date().toISOString(),
        duration_ms: totalDuration,
        error_message: errorMessage || null,
        execution_data: { results, triggeredAt: new Date().toISOString(), triggeredBy: triggeredBy || 'manual' }
      })
      .eq('id', executionId);

    return new Response(
      JSON.stringify({
        success: finalStatus === 'success',
        status: finalStatus,
        executionId,
        results,
        duration: totalDuration,
        completedAt: new Date().toISOString(),
        error: errorMessage || undefined,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Error in execute-workflow:', error);
    if (executionId) {
      await supabaseAdmin.from('workflow_executions').update({
        status: 'error',
        error_message: error.message,
        completed_at: new Date().toISOString()
      }).eq('id', executionId);
    }
    return new Response(
      JSON.stringify({ success: false, error: 'Workflow execution failed' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});

// --- Helper: log node status ---
async function logNode(executionId: string, node: any, status: string, extra: Record<string, any>) {
  await supabaseAdmin.from('workflow_execution_logs').insert({
    execution_id: executionId,
    node_id: node.id,
    node_type: node.type,
    status,
    input_data: { config: node.data?.config || node.config },
    ...extra,
  });
}

// --- Node execution dispatcher ---
async function executeNode(node: any, previousResults: Record<string, any>): Promise<any> {
  const config = node.data?.config || node.config || {};
  switch (node.type) {
    case 'trigger':
      return { status: 'triggered', message: `Trigger "${node.data?.title || node.title}" activated`, data: { timestamp: new Date().toISOString() } };
    case 'condition':
      return executeCondition(node, config, previousResults);
    case 'action':
      return executeAction(node, config, previousResults);
    case 'data':
      return executeData(node, config, previousResults);
    case 'ai':
      return executeAI(node, config, previousResults);
    case 'loop':
      return executeLoop(node, config, previousResults);
    case 'guardrail':
      return executeGuardrail(node, config, previousResults);
    default:
      return { status: 'completed', message: `Node "${node.data?.title || node.title}" executed` };
  }
}

// --- Condition ---
function executeCondition(node: any, config: any, prev: Record<string, any>) {
  const field = config.field || '';
  const operator = config.operator || 'equals';
  const value = config.value;
  const sourceNodeId = config.sourceNode;
  const fieldValue = sourceNodeId ? prev[sourceNodeId]?.data?.[field] : undefined;

  let conditionMet = true;
  switch (operator) {
    case 'equals': conditionMet = fieldValue === value; break;
    case 'not_equals': conditionMet = fieldValue !== value; break;
    case 'contains': conditionMet = String(fieldValue).includes(String(value)); break;
    case 'greater_than': conditionMet = Number(fieldValue) > Number(value); break;
    case 'less_than': conditionMet = Number(fieldValue) < Number(value); break;
  }
  return { status: conditionMet ? 'passed' : 'failed', conditionMet, evaluatedField: field, operator };
}

// --- Action ---
async function executeAction(_node: any, config: any, _prev: Record<string, any>) {
  const method = config.method || 'LOG';
  switch (method) {
    case 'API_CALL': {
      const endpoint = config.endpoint || config.url;
      if (!endpoint) throw new Error('No endpoint specified');
      const resp = await fetch(endpoint, {
        method: config.httpMethod || 'POST',
        headers: { 'Content-Type': 'application/json', ...(config.headers || {}) },
        body: config.body ? JSON.stringify(config.body) : undefined,
      });
      const data = await resp.json();
      return { status: resp.ok ? 'completed' : 'error', data: { endpoint, statusCode: resp.status, response: data } };
    }
    case 'WEBHOOK': {
      if (!config.webhookUrl) throw new Error('No webhook URL specified');
      const resp = await fetch(config.webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ timestamp: new Date().toISOString() }),
      });
      return { status: resp.ok ? 'completed' : 'error', data: { statusCode: resp.status } };
    }
    default:
      return { status: 'completed', message: 'Action logged', data: { method: 'LOG', config } };
  }
}

// --- Data ---
function executeData(_node: any, config: any, _prev: Record<string, any>) {
  return { status: 'completed', message: `Data ${config.operation || 'transform'} completed`, data: { operation: config.operation || 'transform' } };
}

// --- AI ---
async function executeAI(node: any, config: any, prev: Record<string, any>) {
  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
  if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY not configured');

  const prompt = config.prompt || 'Process this data';
  const model = config.model || 'google/gemini-3-flash-preview';

  const sourceData = config.sourceNode ? prev[config.sourceNode] : null;
  const contextualPrompt = sourceData
    ? `${prompt}\n\nContext: ${JSON.stringify(sourceData)}`
    : prompt;

  const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${LOVABLE_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: 'You are a helpful AI assistant processing workflow data.' },
        { role: 'user', content: contextualPrompt },
      ],
      temperature: 0.7,
      max_tokens: 1000,
    }),
  });

  if (!response.ok) {
    if (response.status === 429) throw new Error('AI rate limit exceeded');
    if (response.status === 402) throw new Error('AI credits exhausted');
    throw new Error(`AI API error: ${response.status}`);
  }

  const aiResponse = await response.json();
  const result = aiResponse.choices?.[0]?.message?.content;
  if (!result) throw new Error('No response from AI');

  return { status: 'completed', message: `AI "${node.data?.title || node.title}" completed`, data: { model, result, tokensUsed: aiResponse.usage?.total_tokens || 0 } };
}

// --- Loop/Iterator ---
async function executeLoop(node: any, config: any, prev: Record<string, any>) {
  const sourceNodeId = config.sourceNode;
  const items = sourceNodeId ? (prev[sourceNodeId]?.data?.items || prev[sourceNodeId]?.data || []) : (config.items || []);

  if (!Array.isArray(items)) {
    return { status: 'completed', message: 'Loop: no iterable data', data: { processed: 0 } };
  }

  const maxItems = Math.min(items.length, config.maxIterations || 50);
  const results: any[] = [];

  for (let i = 0; i < maxItems; i++) {
    results.push({ index: i, item: items[i], processed: true });
  }

  return {
    status: 'completed',
    message: `Loop processed ${results.length} items`,
    data: { items: results, totalProcessed: results.length },
  };
}

// --- Guardrail ---
function executeGuardrail(node: any, config: any, prev: Record<string, any>) {
  const type = config.guardrailType || 'validation';
  const sourceData = config.sourceNode ? prev[config.sourceNode] : {};

  switch (type) {
    case 'rate_limit': {
      const limit = config.limit || 100;
      const count = sourceData?.requestCount || 0;
      if (count >= limit) throw new Error(`Rate limit exceeded: ${count}/${limit}`);
      return { status: 'passed', message: `Rate limit OK: ${count}/${limit}` };
    }
    case 'input_validation': {
      const rules = config.rules || {};
      const data = sourceData?.data || sourceData;
      const errors: string[] = [];
      for (const [field, rule] of Object.entries(rules) as [string, any][]) {
        const val = data[field];
        if (rule.required && !val) errors.push(`"${field}" required`);
        if (rule.type && typeof val !== rule.type) errors.push(`"${field}" must be ${rule.type}`);
      }
      if (errors.length) throw new Error(`Validation failed: ${errors.join(', ')}`);
      return { status: 'passed', message: 'Validation passed', data };
    }
    case 'security_check': {
      const dataStr = JSON.stringify(sourceData);
      if (/(<script|javascript:|onerror=)/i.test(dataStr)) throw new Error('XSS detected');
      if (/(\b(SELECT|INSERT|UPDATE|DELETE|DROP|UNION|ALTER)\b)/i.test(dataStr)) throw new Error('SQL injection detected');
      return { status: 'passed', message: 'Security checks passed' };
    }
    default:
      return { status: 'passed', message: `Guardrail "${node.data?.title || node.title}" passed` };
  }
}
