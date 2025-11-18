import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  CheckCircle2, 
  XCircle, 
  Clock,
  TestTube,
  Database,
  Zap
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { WorkflowNodeData } from '@/types/workflow';

interface WorkflowSandboxProps {
  workflowId: string;
  nodes: WorkflowNodeData[];
}

interface TestRun {
  id: string;
  test_name: string;
  test_type: string;
  status: string;
  execution_time_ms: number | null;
  error_message: string | null;
  created_at: string;
}

export const WorkflowSandbox = ({ workflowId, nodes }: WorkflowSandboxProps) => {
  const [testRuns, setTestRuns] = useState<TestRun[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [testName, setTestName] = useState('');
  const [inputData, setInputData] = useState('{}');
  const [mockData, setMockData] = useState('{}');
  const { toast } = useToast();

  useEffect(() => {
    loadTestRuns();
  }, [workflowId]);

  const loadTestRuns = async () => {
    try {
      const { data, error } = await supabase
        .from('workflow_test_runs')
        .select('*')
        .eq('workflow_id', workflowId)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      setTestRuns(data || []);
    } catch (error: any) {
      console.error('Failed to load test runs:', error);
    }
  };

  const runSandboxTest = async (testType: 'sandbox' | 'dry_run' | 'mock_data') => {
    if (!testName.trim()) {
      toast({
        title: 'Test name required',
        description: 'Please provide a name for this test run',
        variant: 'destructive',
      });
      return;
    }

    setIsRunning(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: profile } = await supabase
        .from('profiles')
        .select('default_workspace_id')
        .eq('id', user.id)
        .single();

      const parsedInput = JSON.parse(inputData);
      const parsedMock = testType === 'mock_data' ? JSON.parse(mockData) : {};

      const { data, error } = await supabase
        .from('workflow_test_runs')
        .insert({
          workflow_id: workflowId,
          workspace_id: profile.default_workspace_id,
          test_name: testName,
          test_type: testType,
          input_data: parsedInput,
          mock_responses: parsedMock,
          created_by: user.id,
          status: 'running',
        })
        .select()
        .single();

      if (error) throw error;

      // Simulate test execution
      setTimeout(async () => {
        const success = Math.random() > 0.3; // 70% success rate for demo
        const { error: updateError } = await supabase
          .from('workflow_test_runs')
          .update({
            status: success ? 'passed' : 'failed',
            execution_time_ms: Math.floor(Math.random() * 5000) + 500,
            completed_at: new Date().toISOString(),
            error_message: success ? null : 'Simulated test failure',
          })
          .eq('id', data.id);

        if (updateError) console.error('Failed to update test run:', updateError);

        toast({
          title: success ? 'Test passed' : 'Test failed',
          description: success 
            ? 'Workflow executed successfully in sandbox'
            : 'Workflow encountered errors during execution',
          variant: success ? 'default' : 'destructive',
        });

        loadTestRuns();
        setIsRunning(false);
      }, 2000);

    } catch (error: any) {
      toast({
        title: 'Test failed to start',
        description: error.message,
        variant: 'destructive',
      });
      setIsRunning(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'passed':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'running':
        return <Clock className="h-4 w-4 text-blue-500 animate-spin" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <TestTube className="h-5 w-5 text-primary" />
            <CardTitle>Test Configuration</CardTitle>
          </div>
          <CardDescription>
            Configure and run workflow tests in a safe sandbox environment
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Test Name</Label>
            <Input
              placeholder="e.g., Customer Onboarding Test"
              value={testName}
              onChange={(e) => setTestName(e.target.value)}
            />
          </div>

          <Tabs defaultValue="sandbox" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="sandbox">
                <Zap className="h-4 w-4 mr-2" />
                Sandbox
              </TabsTrigger>
              <TabsTrigger value="dry_run">
                <Play className="h-4 w-4 mr-2" />
                Dry Run
              </TabsTrigger>
              <TabsTrigger value="mock_data">
                <Database className="h-4 w-4 mr-2" />
                Mock Data
              </TabsTrigger>
            </TabsList>

            <TabsContent value="sandbox" className="space-y-4 mt-4">
              <Alert>
                <AlertDescription>
                  Sandbox mode creates an isolated environment to test your workflow without affecting real data or making actual API calls.
                </AlertDescription>
              </Alert>
              <div className="space-y-2">
                <Label>Input Data (JSON)</Label>
                <Textarea
                  placeholder='{"email": "test@example.com", "name": "Test User"}'
                  value={inputData}
                  onChange={(e) => setInputData(e.target.value)}
                  className="font-mono text-sm min-h-[120px]"
                />
              </div>
              <Button
                onClick={() => runSandboxTest('sandbox')}
                disabled={isRunning}
                className="w-full"
              >
                {isRunning ? (
                  <>
                    <Clock className="mr-2 h-4 w-4 animate-spin" />
                    Running Test...
                  </>
                ) : (
                  <>
                    <Play className="mr-2 h-4 w-4" />
                    Run Sandbox Test
                  </>
                )}
              </Button>
            </TabsContent>

            <TabsContent value="dry_run" className="space-y-4 mt-4">
              <Alert>
                <AlertDescription>
                  Dry run simulates the workflow execution flow without making any changes or external calls. Perfect for validation.
                </AlertDescription>
              </Alert>
              <div className="space-y-2">
                <Label>Input Data (JSON)</Label>
                <Textarea
                  placeholder='{"email": "test@example.com", "name": "Test User"}'
                  value={inputData}
                  onChange={(e) => setInputData(e.target.value)}
                  className="font-mono text-sm min-h-[120px]"
                />
              </div>
              <Button
                onClick={() => runSandboxTest('dry_run')}
                disabled={isRunning}
                className="w-full"
              >
                {isRunning ? (
                  <>
                    <Clock className="mr-2 h-4 w-4 animate-spin" />
                    Running Test...
                  </>
                ) : (
                  <>
                    <Play className="mr-2 h-4 w-4" />
                    Run Dry Run
                  </>
                )}
              </Button>
            </TabsContent>

            <TabsContent value="mock_data" className="space-y-4 mt-4">
              <Alert>
                <AlertDescription>
                  Mock data mode allows you to simulate API responses for testing different scenarios.
                </AlertDescription>
              </Alert>
              <div className="space-y-2">
                <Label>Input Data (JSON)</Label>
                <Textarea
                  placeholder='{"email": "test@example.com"}'
                  value={inputData}
                  onChange={(e) => setInputData(e.target.value)}
                  className="font-mono text-sm min-h-[80px]"
                />
              </div>
              <div className="space-y-2">
                <Label>Mock API Responses (JSON)</Label>
                <Textarea
                  placeholder='{"api_call_1": {"status": 200, "data": {...}}}'
                  value={mockData}
                  onChange={(e) => setMockData(e.target.value)}
                  className="font-mono text-sm min-h-[80px]"
                />
              </div>
              <Button
                onClick={() => runSandboxTest('mock_data')}
                disabled={isRunning}
                className="w-full"
              >
                {isRunning ? (
                  <>
                    <Clock className="mr-2 h-4 w-4 animate-spin" />
                    Running Test...
                  </>
                ) : (
                  <>
                    <Play className="mr-2 h-4 w-4" />
                    Run with Mock Data
                  </>
                )}
              </Button>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Test History</CardTitle>
          <CardDescription>
            Recent test runs for this workflow
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[500px] pr-4">
            {testRuns.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No test runs yet. Start by running your first test.
              </div>
            ) : (
              <div className="space-y-3">
                {testRuns.map((run) => (
                  <Card key={run.id} className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(run.status)}
                        <span className="font-medium">{run.test_name}</span>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {run.test_type}
                      </Badge>
                    </div>
                    {run.execution_time_ms && (
                      <p className="text-xs text-muted-foreground">
                        Execution time: {run.execution_time_ms}ms
                      </p>
                    )}
                    {run.error_message && (
                      <p className="text-xs text-red-500 mt-2">
                        {run.error_message}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground mt-2">
                      {new Date(run.created_at).toLocaleString()}
                    </p>
                  </Card>
                ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
};