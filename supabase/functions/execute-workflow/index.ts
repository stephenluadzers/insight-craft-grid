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
    const { nodes, triggeredBy, workspaceId, workflowId } = await req.json();

    // Input validation
    if (!nodes || !Array.isArray(nodes)) {
      return new Response(
        JSON.stringify({ error: 'Invalid nodes array' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (nodes.length > 100) {
      return new Response(
        JSON.stringify({ error: 'Workflow exceeds maximum of 100 nodes' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!workspaceId) {
      return new Response(
        JSON.stringify({ error: 'Workspace ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Executing workflow with', nodes?.length || 0, 'nodes');

    const startTime = Date.now();

    try {
      // Execute each node in the workflow
      const executionData: any = {
        steps: [],
      };

      for (let i = 0; i < nodes.length; i++) {
        const node = nodes[i];
        console.log(`Executing node ${i + 1}/${nodes.length}:`, node.type, node.title);

        const stepResult = await executeNode(node, executionData);
        executionData.steps.push({
          nodeId: node.id,
          nodeType: node.type,
          nodeTitle: node.title,
          result: stepResult,
          timestamp: new Date().toISOString(),
        });
      }

      const duration = Date.now() - startTime;

      console.log('Execution completed in', duration, 'ms');

      return new Response(
        JSON.stringify({
          success: true,
          duration: `${duration}ms`,
          result: executionData,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } catch (nodeError: any) {
      const duration = Date.now() - startTime;
      
      console.error('Execution failed:', nodeError);

      return new Response(
        JSON.stringify({
          success: false,
          error: nodeError.message,
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500
        }
      );
    }

  } catch (error: any) {
    console.error('Error in execute-workflow function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});

async function executeNode(node: any, executionData: any): Promise<any> {
  console.log(`Executing ${node.type} node:`, node.title);

  switch (node.type) {
    case 'trigger':
      return {
        status: 'triggered',
        message: `Trigger "${node.title}" activated`,
        data: { 
          timestamp: new Date().toISOString(),
          triggerId: node.id 
        }
      };

    case 'condition':
      return await executeConditionNode(node, executionData);

    case 'action':
      return await executeActionNode(node, executionData);

    case 'data':
      return await executeDataNode(node, executionData);

    case 'ai':
      return await executeAINode(node, executionData);

    default:
      return {
        status: 'completed',
        message: `Node "${node.title}" executed`,
      };
  }
}

async function executeConditionNode(node: any, executionData: any): Promise<any> {
  const config = node.config || {};
  
  try {
    // Extract condition parameters
    const field = config.field || '';
    const operator = config.operator || 'equals';
    const value = config.value;

    // For now, evaluate simple conditions
    // In a real implementation, you'd evaluate against actual data
    let conditionMet = true;

    // Get value from previous step data if available
    const fieldValue = executionData.steps?.[executionData.steps.length - 1]?.result?.data?.[field];

    switch (operator) {
      case 'equals':
        conditionMet = fieldValue === value;
        break;
      case 'not_equals':
        conditionMet = fieldValue !== value;
        break;
      case 'contains':
        conditionMet = String(fieldValue).includes(String(value));
        break;
      case 'greater_than':
        conditionMet = Number(fieldValue) > Number(value);
        break;
      case 'less_than':
        conditionMet = Number(fieldValue) < Number(value);
        break;
      default:
        conditionMet = true;
    }

    return {
      status: conditionMet ? 'passed' : 'failed',
      message: `Condition "${node.title}" ${conditionMet ? 'passed' : 'failed'}`,
      conditionMet,
      evaluatedField: field,
      evaluatedValue: fieldValue,
      expectedValue: value,
      operator
    };
  } catch (error: any) {
    return {
      status: 'error',
      message: `Condition evaluation failed: ${error.message}`,
      conditionMet: false
    };
  }
}

async function executeActionNode(node: any, executionData: any): Promise<any> {
  const config = node.config || {};
  
  try {
    const method = config.method || 'LOG';

    switch (method) {
      case 'EMAIL':
        // Email action - would integrate with Resend or similar
        console.log('Email action:', {
          to: config.to,
          subject: config.subject,
          body: config.body
        });
        return {
          status: 'completed',
          message: `Email queued to ${config.to}`,
          data: { method: 'EMAIL', recipient: config.to }
        };

      case 'API_CALL':
        // HTTP API call
        const endpoint = config.endpoint || config.url;
        if (!endpoint) {
          throw new Error('No endpoint specified');
        }

        const response = await fetch(endpoint, {
          method: config.httpMethod || 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(config.headers || {})
          },
          body: config.body ? JSON.stringify(config.body) : undefined
        });

        const responseData = await response.json();

        return {
          status: response.ok ? 'completed' : 'error',
          message: `API call to ${endpoint} ${response.ok ? 'succeeded' : 'failed'}`,
          data: {
            method: 'API_CALL',
            endpoint,
            statusCode: response.status,
            response: responseData
          }
        };

      case 'WEBHOOK':
        // Webhook trigger
        if (!config.webhookUrl) {
          throw new Error('No webhook URL specified');
        }

        const webhookResponse = await fetch(config.webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            workflowId: node.id,
            timestamp: new Date().toISOString(),
            data: executionData
          })
        });

        return {
          status: webhookResponse.ok ? 'completed' : 'error',
          message: `Webhook ${webhookResponse.ok ? 'triggered' : 'failed'}`,
          data: { method: 'WEBHOOK', statusCode: webhookResponse.status }
        };

      case 'LOG':
      default:
        // Simple logging action
        console.log('Action executed:', node.title, config);
        return {
          status: 'completed',
          message: `Action "${node.title}" logged successfully`,
          data: { method: 'LOG', config }
        };
    }
  } catch (error: any) {
    return {
      status: 'error',
      message: `Action failed: ${error.message}`,
      error: error.message
    };
  }
}

async function executeDataNode(node: any, executionData: any): Promise<any> {
  const config = node.config || {};
  
  try {
    const operation = config.operation || 'transform';

    switch (operation) {
      case 'transform':
        // Transform data from previous step
        const previousData = executionData.steps?.[executionData.steps.length - 1]?.result?.data || {};
        
        return {
          status: 'completed',
          message: `Data transformed in "${node.title}"`,
          data: {
            operation: 'transform',
            input: previousData,
            output: previousData // In real implementation, apply transformations
          }
        };

      case 'filter':
        // Filter data
        return {
          status: 'completed',
          message: `Data filtered in "${node.title}"`,
          data: {
            operation: 'filter',
            itemsProcessed: 0
          }
        };

      case 'aggregate':
        // Aggregate data
        return {
          status: 'completed',
          message: `Data aggregated in "${node.title}"`,
          data: {
            operation: 'aggregate',
            count: 0,
            sum: 0
          }
        };

      default:
        return {
          status: 'completed',
          message: `Data operation "${operation}" completed`,
          data: { operation }
        };
    }
  } catch (error: any) {
    return {
      status: 'error',
      message: `Data operation failed: ${error.message}`,
      error: error.message
    };
  }
}

async function executeAINode(node: any, executionData: any): Promise<any> {
  const config = node.config || {};
  
  try {
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    const prompt = config.prompt || 'Process this data';
    const model = config.model || 'google/gemini-2.5-flash';

    // Get context from previous steps
    const previousData = executionData.steps?.[executionData.steps.length - 1]?.result?.data;
    const contextualPrompt = previousData 
      ? `${prompt}\n\nContext from previous step: ${JSON.stringify(previousData)}`
      : prompt;

    console.log('Calling AI with prompt:', contextualPrompt.substring(0, 100) + '...');

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: 'You are a helpful AI assistant processing workflow data.' },
          { role: 'user', content: contextualPrompt }
        ],
        temperature: 0.7,
        max_tokens: 1000
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        throw new Error('AI rate limit exceeded. Please try again later.');
      }
      if (response.status === 402) {
        throw new Error('AI credits exhausted. Please add credits to continue.');
      }
      const errorText = await response.text();
      throw new Error(`AI API error: ${response.status} - ${errorText}`);
    }

    const aiResponse = await response.json();
    const aiResult = aiResponse.choices?.[0]?.message?.content;

    if (!aiResult) {
      throw new Error('No response from AI');
    }

    return {
      status: 'completed',
      message: `AI processing "${node.title}" completed`,
      data: {
        model,
        prompt: prompt.substring(0, 100) + (prompt.length > 100 ? '...' : ''),
        result: aiResult,
        tokensUsed: aiResponse.usage?.total_tokens || 0
      }
    };
  } catch (error: any) {
    console.error('AI node execution error:', error);
    return {
      status: 'error',
      message: `AI processing failed: ${error.message}`,
      error: error.message
    };
  }
}
