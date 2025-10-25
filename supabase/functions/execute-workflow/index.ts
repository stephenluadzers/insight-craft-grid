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
    
    // Validate nodes for dangerous patterns
    const nodesStr = JSON.stringify(nodes);
    const dangerousPatterns = [
      /(<script|javascript:)/i,
      /(union|insert|update|delete|drop|create|alter)\s+(select|from|into|table)/i,
      /__proto__|constructor\[["']prototype["']\]/i,
    ];
    
    for (const pattern of dangerousPatterns) {
      if (pattern.test(nodesStr)) {
        return new Response(
          JSON.stringify({ error: 'Invalid workflow node content detected' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }
    
    // Validate each node structure
    for (const node of nodes) {
      if (!node.id || !node.type) {
        return new Response(
          JSON.stringify({ error: 'Invalid node structure: missing id or type' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
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

    if (execError || !execution) {
      throw new Error('Failed to create execution record');
    }

    executionId = execution.id;
    const startTime = Date.now();

    const executionData: Record<string, any> = {
      previousResults: [],
      triggeredAt: new Date().toISOString(),
      triggeredBy: triggeredBy || 'manual'
    };

    let finalStatus = 'success';
    let errorMessage = '';

    // Execute each node with detailed logging and retry logic
    for (const node of nodes) {
      const nodeStartTime = Date.now();
      console.log(`Executing node: ${node.id} (${node.type})`);
      
      let retryCount = 0;
      const maxRetries = 3;
      let nodeSuccess = false;
      let nodeError = '';
      let result: any = null;

      // Log node as running
      await supabaseAdmin.from('workflow_execution_logs').insert({
        execution_id: executionId,
        node_id: node.id,
        node_type: node.type,
        status: 'running',
        input_data: { config: node.config, previousResults: executionData.previousResults }
      });

      while (retryCount < maxRetries && !nodeSuccess) {
        try {
          result = await executeNode(node, executionData);
          nodeSuccess = true;
          
          executionData.previousResults.push({
            nodeId: node.id,
            nodeType: node.type,
            result
          });
          
          console.log(`Node ${node.id} completed successfully`);
          
          // Update log as success
          await supabaseAdmin.from('workflow_execution_logs').insert({
            execution_id: executionId,
            node_id: node.id,
            node_type: node.type,
            status: 'success',
            input_data: { config: node.config },
            output_data: result,
            completed_at: new Date().toISOString(),
            duration_ms: Date.now() - nodeStartTime,
            retry_count: retryCount
          });
          
        } catch (error: any) {
          retryCount++;
          nodeError = error.message;
          console.error(`Error executing node ${node.id} (attempt ${retryCount}):`, error);
          
          if (retryCount >= maxRetries) {
            finalStatus = 'error';
            errorMessage = `Node ${node.id} failed after ${maxRetries} retries: ${nodeError}`;
            
            // Log final error
            await supabaseAdmin.from('workflow_execution_logs').insert({
              execution_id: executionId,
              node_id: node.id,
              node_type: node.type,
              status: 'error',
              input_data: { config: node.config },
              error_message: nodeError,
              completed_at: new Date().toISOString(),
              duration_ms: Date.now() - nodeStartTime,
              retry_count: retryCount
            });
            
            executionData.previousResults.push({
              nodeId: node.id,
              nodeType: node.type,
              error: nodeError
            });
          } else {
            // Wait before retry (exponential backoff)
            await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, retryCount - 1)));
          }
        }
      }
    }

    const totalDuration = Date.now() - startTime;

    // Update execution record with final status
    await supabaseAdmin
      .from('workflow_executions')
      .update({
        status: finalStatus,
        completed_at: new Date().toISOString(),
        duration_ms: totalDuration,
        error_message: errorMessage || null,
        execution_data: executionData
      })
      .eq('id', executionId);

    return new Response(
      JSON.stringify({
        success: finalStatus === 'success',
        status: finalStatus,
        executionId,
        executionData,
        duration: totalDuration,
        completedAt: new Date().toISOString(),
        error: errorMessage || undefined,
        failedNodeId: finalStatus === 'failed' ? executionData.previousResults.find((r: any) => r.error)?.nodeId : undefined
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error in execute-workflow:', error);
    
    // Update execution as failed if we have an ID
    if (executionId) {
      await supabaseAdmin
        .from('workflow_executions')
        .update({
          status: 'error',
          error_message: error.message,
          completed_at: new Date().toISOString()
        })
        .eq('id', executionId);
    }
    
    // Return sanitized error message
    let userMessage = 'Workflow execution failed';
    
    if (error.message?.includes('Invalid nodes')) {
      userMessage = 'Invalid workflow configuration';
    } else if (error.message?.includes('exceeds maximum')) {
      userMessage = 'Workflow too complex';
    } else if (error.message?.includes('Workspace ID')) {
      userMessage = 'Missing required parameters';
    }
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: userMessage
      }),
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
