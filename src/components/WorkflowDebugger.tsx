import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Bug, Play, Pause, RotateCcw, Terminal, Clock, Database, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface WorkflowDebuggerProps {
  workflowId: string;
  nodes: any[];
}

export function WorkflowDebugger({ workflowId, nodes }: WorkflowDebuggerProps) {
  const [isDebugging, setIsDebugging] = useState(false);
  const [breakpoints, setBreakpoints] = useState<Set<string>>(new Set());
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [executionLog, setExecutionLog] = useState<any[]>([]);
  const [variableInspector, setVariableInspector] = useState<Record<string, any>>({});
  const { toast } = useToast();

  const toggleBreakpoint = (nodeId: string) => {
    const newBreakpoints = new Set(breakpoints);
    if (newBreakpoints.has(nodeId)) {
      newBreakpoints.delete(nodeId);
    } else {
      newBreakpoints.add(nodeId);
    }
    setBreakpoints(newBreakpoints);
  };

  const startDebug = () => {
    setIsDebugging(true);
    setCurrentStep(0);
    setExecutionLog([]);
    toast({
      title: "Debug Mode Started",
      description: "Step through your workflow to identify issues",
    });
  };

  const stepOver = () => {
    if (currentStep < nodes.length) {
      const currentNode = nodes[currentStep];
      setExecutionLog(prev => [...prev, {
        timestamp: new Date().toISOString(),
        nodeId: currentNode.id,
        nodeName: currentNode.data?.label || currentNode.id,
        status: "executing",
        variables: { ...variableInspector }
      }]);
      setCurrentStep(prev => prev + 1);
    }
  };

  const reset = () => {
    setIsDebugging(false);
    setCurrentStep(0);
    setExecutionLog([]);
    setVariableInspector({});
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Bug className="h-5 w-5" />
              Workflow Debugger
            </CardTitle>
            <CardDescription>
              Step through execution and inspect variables at each step
            </CardDescription>
          </div>
          <div className="flex gap-2">
            {!isDebugging ? (
              <Button onClick={startDebug} size="sm">
                <Play className="h-4 w-4 mr-2" />
                Start Debug
              </Button>
            ) : (
              <>
                <Button onClick={stepOver} size="sm" variant="outline">
                  <Play className="h-4 w-4 mr-2" />
                  Step Over
                </Button>
                <Button onClick={reset} size="sm" variant="outline">
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Reset
                </Button>
              </>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="breakpoints">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="breakpoints">Breakpoints</TabsTrigger>
            <TabsTrigger value="logs">Execution Logs</TabsTrigger>
            <TabsTrigger value="variables">Variables</TabsTrigger>
          </TabsList>

          <TabsContent value="breakpoints">
            <ScrollArea className="h-[400px]">
              <div className="space-y-2">
                {nodes.map((node, index) => (
                  <div
                    key={node.id}
                    className={`flex items-center justify-between p-3 rounded-lg border ${
                      currentStep === index && isDebugging ? 'bg-primary/10 border-primary' : ''
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded-full ${
                          breakpoints.has(node.id) ? 'bg-red-500' : 'bg-muted'
                        }`} />
                        <span className="font-medium">{node.data?.label || node.id}</span>
                      </div>
                      <Badge variant="outline">{node.type}</Badge>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => toggleBreakpoint(node.id)}
                    >
                      {breakpoints.has(node.id) ? 'Remove' : 'Add'} Breakpoint
                    </Button>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="logs">
            <ScrollArea className="h-[400px]">
              <div className="space-y-2">
                {executionLog.length === 0 ? (
                  <div className="text-center text-muted-foreground py-8">
                    <Terminal className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>No execution logs yet. Start debugging to see logs.</p>
                  </div>
                ) : (
                  executionLog.map((log, index) => (
                    <div key={index} className="p-3 rounded-lg border">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4" />
                          <span className="text-sm font-medium">{log.nodeName}</span>
                        </div>
                        <Badge>{log.status}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {new Date(log.timestamp).toLocaleTimeString()}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="variables">
            <ScrollArea className="h-[400px]">
              {Object.keys(variableInspector).length === 0 ? (
                <div className="text-center text-muted-foreground py-8">
                  <Database className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>No variables to inspect yet</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {Object.entries(variableInspector).map(([key, value]) => (
                    <div key={key} className="p-3 rounded-lg border">
                      <div className="font-medium text-sm mb-1">{key}</div>
                      <pre className="text-xs bg-muted p-2 rounded">
                        {JSON.stringify(value, null, 2)}
                      </pre>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
