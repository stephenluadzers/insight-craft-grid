import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { TestTube, Play, Plus, Trash2, CheckCircle2, XCircle, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface TestCase {
  id: string;
  name: string;
  description: string;
  input: string;
  expectedOutput: string;
  status?: 'pending' | 'passed' | 'failed';
  duration?: number;
  error?: string;
}

interface WorkflowTestSuiteProps {
  workflowId: string;
  onRunTest: (testCase: TestCase) => Promise<any>;
}

export function WorkflowTestSuite({ workflowId, onRunTest }: WorkflowTestSuiteProps) {
  const [testCases, setTestCases] = useState<TestCase[]>([]);
  const [editingTest, setEditingTest] = useState<TestCase | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const { toast } = useToast();

  const createNewTest = () => {
    setEditingTest({
      id: crypto.randomUUID(),
      name: '',
      description: '',
      input: '{}',
      expectedOutput: '{}',
    });
  };

  const saveTest = () => {
    if (editingTest) {
      const existing = testCases.find(t => t.id === editingTest.id);
      if (existing) {
        setTestCases(testCases.map(t => t.id === editingTest.id ? editingTest : t));
      } else {
        setTestCases([...testCases, editingTest]);
      }
      setEditingTest(null);
      toast({
        title: "Test Saved",
        description: "Your test case has been saved successfully",
      });
    }
  };

  const deleteTest = (id: string) => {
    setTestCases(testCases.filter(t => t.id !== id));
    toast({
      title: "Test Deleted",
      description: "Test case has been removed",
    });
  };

  const runSingleTest = async (testCase: TestCase) => {
    const startTime = Date.now();
    try {
      const result = await onRunTest(testCase);
      const duration = Date.now() - startTime;
      
      const passed = JSON.stringify(result) === testCase.expectedOutput;
      
      setTestCases(testCases.map(t => 
        t.id === testCase.id 
          ? { ...t, status: passed ? 'passed' : 'failed', duration, error: passed ? undefined : 'Output mismatch' }
          : t
      ));

      toast({
        title: passed ? "Test Passed ✓" : "Test Failed ✗",
        description: `Completed in ${duration}ms`,
        variant: passed ? "default" : "destructive",
      });
    } catch (error: any) {
      const duration = Date.now() - startTime;
      setTestCases(testCases.map(t => 
        t.id === testCase.id 
          ? { ...t, status: 'failed', duration, error: error.message }
          : t
      ));
      toast({
        title: "Test Failed",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const runAllTests = async () => {
    setIsRunning(true);
    for (const testCase of testCases) {
      await runSingleTest(testCase);
    }
    setIsRunning(false);
    
    const passed = testCases.filter(t => t.status === 'passed').length;
    const failed = testCases.filter(t => t.status === 'failed').length;
    
    toast({
      title: "Test Suite Complete",
      description: `${passed} passed, ${failed} failed`,
    });
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <TestTube className="h-5 w-5" />
              Workflow Test Suite
            </CardTitle>
            <CardDescription>
              Create and run automated tests for your workflow
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button onClick={createNewTest} size="sm" variant="outline">
              <Plus className="h-4 w-4 mr-2" />
              New Test
            </Button>
            <Button 
              onClick={runAllTests} 
              size="sm" 
              disabled={testCases.length === 0 || isRunning}
            >
              <Play className="h-4 w-4 mr-2" />
              Run All Tests
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {editingTest ? (
          <div className="space-y-4 p-4 border rounded-lg">
            <div className="space-y-2">
              <Label htmlFor="test-name">Test Name</Label>
              <Input
                id="test-name"
                value={editingTest.name}
                onChange={(e) => setEditingTest({ ...editingTest, name: e.target.value })}
                placeholder="e.g., Valid Email Input"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="test-description">Description</Label>
              <Input
                id="test-description"
                value={editingTest.description}
                onChange={(e) => setEditingTest({ ...editingTest, description: e.target.value })}
                placeholder="What does this test verify?"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="test-input">Input Data (JSON)</Label>
              <Textarea
                id="test-input"
                value={editingTest.input}
                onChange={(e) => setEditingTest({ ...editingTest, input: e.target.value })}
                placeholder='{"email": "test@example.com"}'
                className="font-mono text-sm"
                rows={4}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="test-output">Expected Output (JSON)</Label>
              <Textarea
                id="test-output"
                value={editingTest.expectedOutput}
                onChange={(e) => setEditingTest({ ...editingTest, expectedOutput: e.target.value })}
                placeholder='{"status": "success"}'
                className="font-mono text-sm"
                rows={4}
              />
            </div>

            <div className="flex gap-2">
              <Button onClick={saveTest}>Save Test</Button>
              <Button onClick={() => setEditingTest(null)} variant="outline">Cancel</Button>
            </div>
          </div>
        ) : (
          <ScrollArea className="h-[500px]">
            {testCases.length === 0 ? (
              <div className="text-center text-muted-foreground py-12">
                <TestTube className="h-16 w-16 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium mb-2">No Test Cases Yet</p>
                <p className="text-sm">Create your first test to start automated testing</p>
              </div>
            ) : (
              <div className="space-y-3">
                {testCases.map((testCase) => (
                  <Card key={testCase.id}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-semibold">{testCase.name}</h4>
                            {testCase.status && (
                              <Badge 
                                variant={testCase.status === 'passed' ? 'default' : testCase.status === 'failed' ? 'destructive' : 'outline'}
                              >
                                {testCase.status === 'passed' && <CheckCircle2 className="h-3 w-3 mr-1" />}
                                {testCase.status === 'failed' && <XCircle className="h-3 w-3 mr-1" />}
                                {testCase.status}
                              </Badge>
                            )}
                            {testCase.duration && (
                              <span className="text-xs text-muted-foreground flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {testCase.duration}ms
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">{testCase.description}</p>
                          {testCase.error && (
                            <p className="text-sm text-destructive mt-2">Error: {testCase.error}</p>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => runSingleTest(testCase)}
                          >
                            <Play className="h-3 w-3" />
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => setEditingTest(testCase)}
                          >
                            Edit
                          </Button>
                          <Button 
                            size="sm" 
                            variant="ghost"
                            onClick={() => deleteTest(testCase.id)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
