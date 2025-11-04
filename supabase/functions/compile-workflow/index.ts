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
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { workflowId, nodes, optimizationLevel = 'basic' } = await req.json();

    // Generate version hash
    const encoder = new TextEncoder();
    const data = encoder.encode(JSON.stringify(nodes));
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const versionHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    // Check cache
    const { data: cached } = await supabase
      .from('workflow_compilation_cache')
      .select('*')
      .eq('workflow_id', workflowId)
      .eq('version_hash', versionHash)
      .eq('optimization_level', optimizationLevel)
      .single();

    if (cached) {
      console.log('Using cached compilation');
      return new Response(
        JSON.stringify({ 
          success: true, 
          cached: true,
          compiledPlan: cached.compiled_plan,
          parallelGroups: cached.parallel_groups,
          executionOrder: cached.execution_order
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Build dependency graph
    const graph = buildDependencyGraph(nodes);
    
    // Detect cycles
    const cycles = detectCycles(graph);
    if (cycles.length > 0) {
      return new Response(
        JSON.stringify({ 
          error: 'Workflow contains cycles',
          cycles 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Find parallel execution opportunities
    const parallelGroups = findParallelGroups(graph, nodes);
    
    // Generate optimized execution order
    const executionOrder = topologicalSort(graph);
    
    // Build compiled plan
    const compiledPlan: {
      workflow_id: string;
      version_hash: string;
      nodes: number;
      parallel_groups: number;
      optimization_level: string;
      optimizations_applied: string[];
      cacheable_nodes?: string[];
    } = {
      workflow_id: workflowId,
      version_hash: versionHash,
      nodes: nodes.length,
      parallel_groups: parallelGroups.length,
      optimization_level: optimizationLevel,
      optimizations_applied: []
    };

    // Apply optimizations based on level
    if (optimizationLevel === 'basic' || optimizationLevel === 'aggressive') {
      compiledPlan.optimizations_applied.push('parallel_execution');
      compiledPlan.optimizations_applied.push('dependency_ordering');
    }

    if (optimizationLevel === 'aggressive') {
      // Add caching hints
      const cacheable = identifyCacheableNodes(nodes);
      compiledPlan.optimizations_applied.push('result_caching');
      compiledPlan.cacheable_nodes = cacheable;
    }

    // Estimate duration based on node types
    const estimatedDuration = estimateWorkflowDuration(nodes, parallelGroups);

    // Store in cache
    const { error: cacheError } = await supabase
      .from('workflow_compilation_cache')
      .insert({
        workflow_id: workflowId,
        version_hash: versionHash,
        compiled_plan: compiledPlan,
        optimization_level: optimizationLevel,
        parallel_groups: parallelGroups,
        execution_order: executionOrder,
        estimated_duration_ms: estimatedDuration
      });

    if (cacheError) {
      console.error('Error caching compilation:', cacheError);
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        cached: false,
        compiledPlan,
        parallelGroups,
        executionOrder,
        estimatedDuration
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in compile-workflow:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function buildDependencyGraph(nodes: any[]): Map<string, Set<string>> {
  const graph = new Map<string, Set<string>>();
  
  nodes.forEach(node => {
    if (!graph.has(node.id)) {
      graph.set(node.id, new Set());
    }
    
    if (node.connections) {
      node.connections.forEach((connId: string) => {
        const deps = graph.get(node.id)!;
        deps.add(connId);
      });
    }
  });

  return graph;
}

function detectCycles(graph: Map<string, Set<string>>): string[][] {
  const cycles: string[][] = [];
  const visited = new Set<string>();
  const recStack = new Set<string>();

  function dfs(node: string, path: string[]): void {
    visited.add(node);
    recStack.add(node);
    path.push(node);

    const neighbors = graph.get(node) || new Set();
    for (const neighbor of neighbors) {
      if (!visited.has(neighbor)) {
        dfs(neighbor, [...path]);
      } else if (recStack.has(neighbor)) {
        const cycleStart = path.indexOf(neighbor);
        cycles.push(path.slice(cycleStart));
      }
    }

    recStack.delete(node);
  }

  for (const node of graph.keys()) {
    if (!visited.has(node)) {
      dfs(node, []);
    }
  }

  return cycles;
}

function findParallelGroups(graph: Map<string, Set<string>>, nodes: any[]): string[][] {
  const groups: string[][] = [];
  const processed = new Set<string>();
  
  // Find nodes with no dependencies
  const noDeps = Array.from(graph.keys()).filter(
    nodeId => graph.get(nodeId)!.size === 0
  );
  
  if (noDeps.length > 1) {
    groups.push(noDeps);
    noDeps.forEach(n => processed.add(n));
  }

  // Find nodes that only depend on processed nodes
  let changed = true;
  while (changed) {
    changed = false;
    const parallelizable: string[] = [];
    
    for (const [nodeId, deps] of graph.entries()) {
      if (processed.has(nodeId)) continue;
      
      const allDepsProcessed = Array.from(deps).every(dep => processed.has(dep));
      if (allDepsProcessed) {
        parallelizable.push(nodeId);
        changed = true;
      }
    }
    
    if (parallelizable.length > 1) {
      groups.push(parallelizable);
      parallelizable.forEach(n => processed.add(n));
    } else if (parallelizable.length === 1) {
      processed.add(parallelizable[0]);
    }
  }

  return groups;
}

function topologicalSort(graph: Map<string, Set<string>>): string[] {
  const inDegree = new Map<string, number>();
  const result: string[] = [];
  
  // Calculate in-degrees
  for (const node of graph.keys()) {
    inDegree.set(node, 0);
  }
  
  for (const deps of graph.values()) {
    for (const dep of deps) {
      inDegree.set(dep, (inDegree.get(dep) || 0) + 1);
    }
  }

  // Find nodes with no incoming edges
  const queue: string[] = [];
  for (const [node, degree] of inDegree.entries()) {
    if (degree === 0) {
      queue.push(node);
    }
  }

  while (queue.length > 0) {
    const node = queue.shift()!;
    result.push(node);

    const neighbors = graph.get(node) || new Set();
    for (const neighbor of neighbors) {
      const newDegree = inDegree.get(neighbor)! - 1;
      inDegree.set(neighbor, newDegree);
      if (newDegree === 0) {
        queue.push(neighbor);
      }
    }
  }

  return result;
}

function identifyCacheableNodes(nodes: any[]): string[] {
  return nodes
    .filter(node => {
      // Data transformation and AI nodes are good caching candidates
      if (node.type === 'data' || node.type === 'ai') {
        return true;
      }
      // API calls with GET methods
      if (node.type === 'action' && node.config?.method === 'GET') {
        return true;
      }
      return false;
    })
    .map(node => node.id);
}

function estimateWorkflowDuration(nodes: any[], parallelGroups: string[][]): number {
  const nodeDurations: Record<string, number> = {
    trigger: 100,
    condition: 50,
    action: 500,
    data: 200,
    ai: 2000
  };

  // Sequential execution estimate
  const sequentialTotal = nodes.reduce((sum, node) => {
    return sum + (nodeDurations[node.type] || 300);
  }, 0);

  // With parallelization
  if (parallelGroups.length === 0) {
    return sequentialTotal;
  }

  // Estimate with parallel groups
  let parallelTotal = 0;
  parallelGroups.forEach(group => {
    const groupMax = Math.max(...group.map(nodeId => {
      const node = nodes.find(n => n.id === nodeId);
      return nodeDurations[node?.type || 'action'] || 300;
    }));
    parallelTotal += groupMax;
  });

  return Math.min(sequentialTotal, parallelTotal + (sequentialTotal * 0.2));
}