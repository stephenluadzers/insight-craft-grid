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

    const { testSuiteId, workflowId } = await req.json();

    // Get test suite
    const { data: testSuite, error: suiteError } = await supabase
      .from('workflow_test_suites')
      .select('*')
      .eq('id', testSuiteId)
      .single();

    if (suiteError || !testSuite) {
      return new Response(
        JSON.stringify({ error: 'Test suite not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get workflow
    const { data: workflow, error: workflowError } = await supabase
      .from('workflows')
      .select('*')
      .eq('id', workflowId)
      .single();

    if (workflowError || !workflow) {
      return new Response(
        JSON.stringify({ error: 'Workflow not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const testCases = testSuite.test_cases || [];
    const results = [];
    let passedCount = 0;
    let failedCount = 0;

    // Run each test case
    for (const testCase of testCases) {
      console.log(`Running test: ${testCase.name}`);
      
      const result: {
        test_name: string;
        status: string;
        started_at: string;
        completed_at: string | null;
        duration_ms: number;
        assertions: any[];
        error: string | null;
      } = {
        test_name: testCase.name,
        status: 'running',
        started_at: new Date().toISOString(),
        completed_at: null,
        duration_ms: 0,
        assertions: [],
        error: null
      };

      const startTime = Date.now();

      try {
        // Execute workflow with test input
        const { data: execData, error: execError } = await supabase.functions.invoke(
          'execute-workflow',
          {
            body: {
              workflow: {
                id: workflow.id,
                name: workflow.name,
                nodes: workflow.nodes
              },
              triggerData: testCase.input || {}
            }
          }
        );

        result.duration_ms = Date.now() - startTime;
        result.completed_at = new Date().toISOString();

        if (execError) {
          result.status = 'failed';
          result.error = execError instanceof Error ? execError.message : 'Execution failed';
          failedCount++;
        } else {
          // Run assertions
          const assertions = testCase.assertions || [];
          let allPassed = true;

          for (const assertion of assertions) {
            const assertionResult = evaluateAssertion(
              assertion,
              execData,
              testCase.input
            );
            
            result.assertions.push(assertionResult);
            
            if (!assertionResult.passed) {
              allPassed = false;
            }
          }

          result.status = allPassed ? 'passed' : 'failed';
          if (allPassed) {
            passedCount++;
          } else {
            failedCount++;
          }
        }
      } catch (error) {
        result.status = 'failed';
        result.error = error instanceof Error ? error.message : 'Unknown error';
        result.duration_ms = Date.now() - startTime;
        result.completed_at = new Date().toISOString();
        failedCount++;
      }

      results.push(result);
    }

    // Update test suite with results
    const overallStatus = failedCount === 0 ? 'passed' : (passedCount > 0 ? 'partial' : 'failed');
    
    await supabase
      .from('workflow_test_suites')
      .update({
        last_run_at: new Date().toISOString(),
        last_run_status: overallStatus,
        last_run_results: {
          passed: passedCount,
          failed: failedCount,
          total: testCases.length,
          results
        }
      })
      .eq('id', testSuiteId);

    return new Response(
      JSON.stringify({
        success: true,
        overall_status: overallStatus,
        passed: passedCount,
        failed: failedCount,
        total: testCases.length,
        results
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in run-workflow-tests:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function evaluateAssertion(assertion: any, executionData: any, testInput: any): any {
  const { type, field, operator, expected } = assertion;
  
  let actual;
  
  // Get actual value based on field path
  if (field.startsWith('output.')) {
    const path = field.substring(7).split('.');
    actual = path.reduce((obj: any, key: string) => obj?.[key], executionData.result);
  } else if (field.startsWith('input.')) {
    const path = field.substring(6).split('.');
    actual = path.reduce((obj: any, key: string) => obj?.[key], testInput);
  } else if (field === 'status') {
    actual = executionData.status;
  } else if (field === 'duration_ms') {
    actual = executionData.result?.duration_ms;
  }

  let passed = false;
  let message = '';

  switch (operator) {
    case 'equals':
      passed = actual === expected;
      message = passed 
        ? `✓ ${field} equals ${expected}`
        : `✗ ${field} expected ${expected}, got ${actual}`;
      break;
    
    case 'not_equals':
      passed = actual !== expected;
      message = passed
        ? `✓ ${field} does not equal ${expected}`
        : `✗ ${field} should not equal ${expected}`;
      break;
    
    case 'contains':
      passed = String(actual).includes(String(expected));
      message = passed
        ? `✓ ${field} contains "${expected}"`
        : `✗ ${field} does not contain "${expected}"`;
      break;
    
    case 'greater_than':
      passed = Number(actual) > Number(expected);
      message = passed
        ? `✓ ${field} (${actual}) > ${expected}`
        : `✗ ${field} (${actual}) is not > ${expected}`;
      break;
    
    case 'less_than':
      passed = Number(actual) < Number(expected);
      message = passed
        ? `✓ ${field} (${actual}) < ${expected}`
        : `✗ ${field} (${actual}) is not < ${expected}`;
      break;
    
    case 'exists':
      passed = actual !== undefined && actual !== null;
      message = passed
        ? `✓ ${field} exists`
        : `✗ ${field} does not exist`;
      break;
    
    case 'type':
      const actualType = Array.isArray(actual) ? 'array' : typeof actual;
      passed = actualType === expected;
      message = passed
        ? `✓ ${field} is ${expected}`
        : `✗ ${field} expected type ${expected}, got ${actualType}`;
      break;
    
    default:
      passed = false;
      message = `✗ Unknown operator: ${operator}`;
  }

  return {
    type,
    field,
    operator,
    expected,
    actual,
    passed,
    message
  };
}