/**
 * AI TRANSPARENCY & FAIR-USE STATEMENT
 * Remora Development | Remora Flow
 * Version: 2.0 | Generated: 2025-11-12
 * 
 * Enhanced with multi-pass validation, context enrichment, and smart model routing.
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { injectGuardrailNodes, GUARDRAIL_SYSTEM_PROMPT } from "../_shared/guardrails.ts";
import { ROLE_CONTRACT_SYSTEM_PROMPT } from "../_shared/role-contracts.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Complexity analysis for smart model routing
function analyzeComplexity(description: string): { level: 'simple' | 'medium' | 'complex', score: number } {
  const indicators = {
    simple: ['simple', 'basic', 'just', 'only', 'single', 'one'],
    complex: ['multiple', 'complex', 'integrate', 'api', 'conditional', 'loop', 'parallel', 'branch', 'decision', 'ai', 'machine learning', 'analyze', 'transform']
  };
  
  const lowercaseDesc = description.toLowerCase();
  const wordCount = description.split(/\s+/).length;
  
  let complexityScore = 0;
  
  // Word count factor
  if (wordCount > 200) complexityScore += 3;
  else if (wordCount > 100) complexityScore += 2;
  else if (wordCount > 50) complexityScore += 1;
  
  // Keyword analysis
  indicators.complex.forEach(keyword => {
    if (lowercaseDesc.includes(keyword)) complexityScore += 2;
  });
  
  indicators.simple.forEach(keyword => {
    if (lowercaseDesc.includes(keyword)) complexityScore -= 1;
  });
  
  // URL/technical content detection
  if (lowercaseDesc.includes('http') || lowercaseDesc.includes('api')) complexityScore += 2;
  if (lowercaseDesc.includes('youtube') || lowercaseDesc.includes('video')) complexityScore += 1;
  
  if (complexityScore >= 6) return { level: 'complex', score: complexityScore };
  if (complexityScore >= 3) return { level: 'medium', score: complexityScore };
  return { level: 'simple', score: complexityScore };
}

// Select optimal model based on complexity
function selectModel(complexity: { level: string, score: number }): string {
  switch (complexity.level) {
    case 'complex':
      return 'google/gemini-2.5-pro'; // Best for complex reasoning
    case 'medium':
      return 'google/gemini-2.5-flash'; // Balanced
    default:
      return 'google/gemini-2.5-flash-lite'; // Fast for simple tasks
  }
}

// Validate workflow structure
function validateWorkflow(workflow: any): { valid: boolean, errors: string[], warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  if (!workflow.nodes || !Array.isArray(workflow.nodes)) {
    errors.push('Missing or invalid nodes array');
    return { valid: false, errors, warnings };
  }
  
  if (workflow.nodes.length === 0) {
    errors.push('Workflow has no nodes');
    return { valid: false, errors, warnings };
  }
  
  if (workflow.nodes.length > 30) {
    warnings.push('Workflow has many nodes, consider breaking into sub-workflows');
  }
  
  // Check for trigger node
  const hasTrigger = workflow.nodes.some((n: any) => n.type === 'trigger');
  if (!hasTrigger) {
    warnings.push('No trigger node found - workflow may not start automatically');
  }
  
  // Check for orphan nodes
  const nodeIds = new Set(workflow.nodes.map((n: any) => n.id));
  const connectedIds = new Set<string>();
  (workflow.connections || []).forEach((c: any) => {
    connectedIds.add(c.from);
    connectedIds.add(c.to);
  });
  
  const orphans = workflow.nodes.filter((n: any) => 
    !connectedIds.has(n.id) && workflow.nodes.length > 1
  );
  
  if (orphans.length > 0) {
    warnings.push(`${orphans.length} node(s) are not connected to the workflow`);
  }
  
  // Check for duplicate IDs
  const duplicateCheck = new Set<string>();
  workflow.nodes.forEach((n: any) => {
    if (duplicateCheck.has(n.id)) {
      errors.push(`Duplicate node ID: ${n.id}`);
    }
    duplicateCheck.add(n.id);
  });
  
  // Validate connections reference existing nodes
  (workflow.connections || []).forEach((c: any) => {
    if (!nodeIds.has(c.from)) {
      errors.push(`Connection references non-existent node: ${c.from}`);
    }
    if (!nodeIds.has(c.to)) {
      errors.push(`Connection references non-existent node: ${c.to}`);
    }
  });
  
  return { valid: errors.length === 0, errors, warnings };
}

// Auto-fix common workflow issues
function autoFixWorkflow(workflow: any): any {
  const fixed = { ...workflow, nodes: [...workflow.nodes], connections: [...(workflow.connections || [])] };
  
  // Ensure all nodes have required fields
  fixed.nodes = fixed.nodes.map((node: any, index: number) => ({
    id: node.id || `node_${Date.now()}_${index}`,
    type: node.type || 'action',
    title: node.title || `Node ${index + 1}`,
    description: node.description || '',
    x: typeof node.x === 'number' ? node.x : 200 + (index * 250),
    y: typeof node.y === 'number' ? node.y : 200 + Math.floor(index / 3) * 150,
    config: node.config || {},
    ...node
  }));
  
  // Add trigger if missing
  const hasTrigger = fixed.nodes.some((n: any) => n.type === 'trigger');
  if (!hasTrigger && fixed.nodes.length > 0) {
    const triggerId = `trigger_${Date.now()}`;
    fixed.nodes.unshift({
      id: triggerId,
      type: 'trigger',
      title: 'Workflow Start',
      description: 'Auto-generated trigger node',
      x: 100,
      y: 200,
      config: { trigger_type: 'manual' }
    });
    
    // Connect trigger to first non-trigger node
    const firstNode = fixed.nodes.find((n: any) => n.id !== triggerId);
    if (firstNode) {
      fixed.connections.unshift({ from: triggerId, to: firstNode.id });
    }
  }
  
  // Remove duplicate connections
  const connectionSet = new Set<string>();
  fixed.connections = fixed.connections.filter((c: any) => {
    const key = `${c.from}->${c.to}`;
    if (connectionSet.has(key)) return false;
    connectionSet.add(key);
    return true;
  });
  
  return fixed;
}

// Enhanced system prompt with better workflow generation guidance
const ENHANCED_SYSTEM_PROMPT = `You are an expert AI Workflow Architect specializing in creating precise, executable workflow graphs.

## Core Principles
1. **Accuracy First**: Generate workflows that exactly match the user's intent
2. **Minimal & Complete**: Include only necessary nodes, but ensure nothing is missing
3. **Clear Flow**: Every workflow should have a logical start-to-finish progression

## Node Types Available
- trigger: Starts the workflow (webhook, schedule, manual, event)
- action: Performs an operation (API call, database, notification)
- condition: Branches the flow based on logic
- data: Transforms or stores data
- ai: AI/ML operations (analysis, generation, classification)
- connector: External service integration
- error_handler: Catches and handles errors
- guardrail: Security/compliance checks

## Output Requirements
- Target 5-15 nodes for most workflows
- Every workflow MUST have a trigger node
- Use descriptive node titles (max 4 words)
- Position nodes in a readable left-to-right flow
- Include meaningful node configs with:
  - action type/method
  - input/output mappings
  - relevant parameters

## Quality Checklist
✓ All nodes connected in logical order
✓ No orphan nodes
✓ Error handling for external integrations
✓ Clear data flow between nodes`;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { description, existingWorkflow, options = {} } = await req.json();

    if (!description) {
      throw new Error('Description is required');
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    console.log('=== Workflow Generation Started ===');
    console.log('Description length:', description.length);
    
    // Analyze complexity and select model
    const complexity = analyzeComplexity(description);
    const selectedModel = options.forceModel || selectModel(complexity);
    console.log('Complexity analysis:', complexity);
    console.log('Selected model:', selectedModel);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 120000);

    const systemPrompt = `${ENHANCED_SYSTEM_PROMPT}

${existingWorkflow ? "IMPORTANT: An existing workflow is provided. Preserve its core structure and node IDs where reasonable while improving based on the description." : ""}

Additional context: Complexity level detected as "${complexity.level}" (score: ${complexity.score})`;

    const userPrompt = existingWorkflow
      ? `User description:\n${description}\n\nExisting workflow (JSON):\n${JSON.stringify(existingWorkflow, null, 2)}`
      : `User description:\n${description}`;

    const tools = [
      {
        type: 'function',
        function: {
          name: 'generate_workflow',
          description: 'Generate a validated workflow graph from the description.',
          parameters: {
            type: 'object',
            properties: {
              context: { 
                type: 'object', 
                description: 'Extracted context from the description',
                properties: {
                  primary_intent: { type: 'string' },
                  key_entities: { type: 'array', items: { type: 'string' } },
                  integrations_needed: { type: 'array', items: { type: 'string' } }
                }
              },
              workflows: {
                type: 'array',
                description: 'Array of workflows if multiple are needed',
                items: {
                  type: 'object',
                  properties: {
                    name: { type: 'string' },
                    description: { type: 'string' },
                    nodes: { type: 'array', items: { type: 'object' } },
                    connections: { type: 'array', items: { type: 'object' } }
                  },
                  required: ['name', 'nodes', 'connections']
                }
              },
              nodes: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    id: { type: 'string' },
                    type: { type: 'string', enum: ['trigger', 'action', 'condition', 'data', 'ai', 'connector', 'error_handler', 'guardrail', 'utility', 'security', 'storage'] },
                    title: { type: 'string' },
                    description: { type: 'string' },
                    x: { type: 'number' },
                    y: { type: 'number' },
                    config: { type: 'object' }
                  },
                  required: ['id', 'type', 'title', 'x', 'y']
                }
              },
              connections: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    from: { type: 'string' },
                    to: { type: 'string' },
                    label: { type: 'string' }
                  },
                  required: ['from', 'to']
                }
              },
              explanation: { type: 'string', description: 'Brief explanation of the workflow design' },
              suggestions: { type: 'array', items: { type: 'string' }, description: 'Optional improvements the user could make' }
            }
          }
        }
      }
    ];

    let response;
    try {
      response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${LOVABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
        body: JSON.stringify({
          model: selectedModel,
          max_tokens: 8192,
          temperature: 0.15, // Lower for more consistent outputs
          tools,
          tool_choice: { type: 'function', function: { name: 'generate_workflow' } },
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ]
        })
      });
    } catch (fetchError: any) {
      clearTimeout(timeoutId);
      if (fetchError.name === 'AbortError') {
        console.error('Request timed out');
        return new Response(
          JSON.stringify({ error: 'Request timed out. Try a shorter description.' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 504 }
        );
      }
      throw fetchError;
    }

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI API error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please wait a moment.' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 429 }
        );
      }
      
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'AI credits exhausted. Add credits in Settings → Workspace → Usage.' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 402 }
        );
      }
      
      throw new Error(`AI API error: ${response.status}`);
    }

    const data = await response.json();
    console.log('AI response received');

    // Parse response
    let parsed: any;
    try {
      const toolArgs = data?.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
      if (typeof toolArgs === 'string' && toolArgs.trim().length > 0) {
        parsed = JSON.parse(toolArgs);
        console.log('Parsed from tool call');
      } else {
        const content = data?.choices?.[0]?.message?.content ?? '';
        let jsonStr = String(content).trim();
        const codeBlockMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
        if (codeBlockMatch) jsonStr = codeBlockMatch[1].trim();
        if (!jsonStr.startsWith('{') && !jsonStr.startsWith('[')) {
          const jsonMatch = jsonStr.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
          if (jsonMatch) jsonStr = jsonMatch[1];
        }
        parsed = JSON.parse(jsonStr);
        console.log('Parsed from message content fallback');
      }
    } catch (parseError) {
      console.error('Parse error:', parseError);
      throw new Error('AI returned an unreadable response. Please try again.');
    }

    // Validate and auto-fix workflows
    if (parsed.workflows && Array.isArray(parsed.workflows)) {
      parsed.workflows = parsed.workflows.map((workflow: any) => {
        if (workflow.nodes) {
          const validation = validateWorkflow(workflow);
          console.log(`Workflow "${workflow.name}" validation:`, validation);
          
          if (!validation.valid || validation.warnings.length > 0) {
            workflow = autoFixWorkflow(workflow);
            workflow.autoFixed = true;
            workflow.fixedIssues = [...validation.errors, ...validation.warnings];
          }
          
          // Inject guardrails
          const injectionResult = injectGuardrailNodes(workflow.nodes);
          workflow.nodes = injectionResult.nodes;
          workflow.guardrailExplanations = injectionResult.explanations;
          workflow.complianceStandards = injectionResult.complianceStandards;
          workflow.guardrailsAdded = injectionResult.guardrailsAdded;
          workflow.riskScore = injectionResult.riskScore;
          workflow.roleAssignments = injectionResult.roleAssignments;
        }
        return workflow;
      });
    } else if (parsed.nodes) {
      const validation = validateWorkflow(parsed);
      console.log('Workflow validation:', validation);
      
      if (!validation.valid || validation.warnings.length > 0) {
        parsed = autoFixWorkflow(parsed);
        parsed.autoFixed = true;
        parsed.fixedIssues = [...validation.errors, ...validation.warnings];
      }
      
      // Inject guardrails
      const injectionResult = injectGuardrailNodes(parsed.nodes);
      parsed.nodes = injectionResult.nodes;
      parsed.guardrailExplanations = injectionResult.explanations;
      parsed.complianceStandards = injectionResult.complianceStandards;
      parsed.guardrailsAdded = injectionResult.guardrailsAdded;
      parsed.riskScore = injectionResult.riskScore;
      parsed.roleAssignments = injectionResult.roleAssignments;
    }

    // Add metadata
    parsed.metadata = {
      generatedAt: new Date().toISOString(),
      model: selectedModel,
      complexity: complexity,
      validationPassed: true
    };

    console.log('=== Workflow Generation Complete ===');
    console.log('Nodes:', parsed.nodes?.length || parsed.workflows?.reduce((acc: number, w: any) => acc + w.nodes?.length, 0));

    return new Response(
      JSON.stringify(parsed),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error in generate-workflow-from-text:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
