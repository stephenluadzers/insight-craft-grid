import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Progress } from "@/components/ui/progress";
import {
  Shield,
  Server,
  Cpu,
  MemoryStick,
  HardDrive,
  Clock,
  Lock,
  CheckCircle2,
  AlertTriangle,
  Play,
  Pause,
  RefreshCw,
  Terminal,
  Container,
  Layers,
  Zap,
  Settings2
} from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";

interface TaskRunner {
  id: string;
  name: string;
  status: "running" | "stopped" | "starting" | "error";
  type: "internal" | "external";
  cpuUsage: number;
  memoryUsage: number;
  tasksCompleted: number;
  tasksQueued: number;
  uptime: string;
}

export function TaskRunnerConfiguration() {
  const { toast } = useToast();
  const [taskRunnersEnabled, setTaskRunnersEnabled] = useState(true);
  const [runnerMode, setRunnerMode] = useState<"internal" | "external">("internal");
  
  const [runners, setRunners] = useState<TaskRunner[]>([
    {
      id: "runner-1",
      name: "Primary Runner",
      status: "running",
      type: "internal",
      cpuUsage: 45,
      memoryUsage: 62,
      tasksCompleted: 1247,
      tasksQueued: 3,
      uptime: "5d 12h 34m",
    },
    {
      id: "runner-2",
      name: "Secondary Runner",
      status: "running",
      type: "internal",
      cpuUsage: 28,
      memoryUsage: 41,
      tasksCompleted: 892,
      tasksQueued: 1,
      uptime: "5d 12h 34m",
    },
  ]);

  const [resourceLimits, setResourceLimits] = useState({
    maxCpu: 2,
    maxMemoryMb: 512,
    maxExecutionTimeMs: 30000,
    maxConcurrentTasks: 10,
  });

  const [securitySettings, setSecuritySettings] = useState({
    networkIsolation: true,
    filesystemAccess: false,
    restrictedPaths: "/etc,/var,/root",
    allowedModules: "axios,lodash,moment",
  });

  const handleToggleRunner = (runnerId: string) => {
    setRunners(runners.map(r => {
      if (r.id === runnerId) {
        const newStatus = r.status === "running" ? "stopped" : "starting";
        return { ...r, status: newStatus };
      }
      return r;
    }));

    toast({
      title: "Runner Status Changed",
      description: "Task runner status has been updated.",
    });

    // Simulate starting
    setTimeout(() => {
      setRunners(runners.map(r => {
        if (r.id === runnerId && r.status === "starting") {
          return { ...r, status: "running" };
        }
        return r;
      }));
    }, 2000);
  };

  const handleSaveConfig = () => {
    toast({
      title: "Configuration Saved",
      description: "Task runner settings have been updated.",
    });
  };

  return (
    <div className="space-y-6">
      {/* Overview Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Container className="h-5 w-5 text-primary" />
                Task Runners
              </CardTitle>
              <CardDescription>
                Isolated code execution environment for enhanced security (Required in v2.0)
              </CardDescription>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Label htmlFor="task-runners-enabled">Enable Task Runners</Label>
                <Switch
                  id="task-runners-enabled"
                  checked={taskRunnersEnabled}
                  onCheckedChange={setTaskRunnersEnabled}
                />
              </div>
              <Badge variant={taskRunnersEnabled ? "default" : "secondary"}>
                {taskRunnersEnabled ? "Enabled" : "Disabled"}
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {!taskRunnersEnabled && (
            <div className="p-4 border border-yellow-500/50 bg-yellow-500/10 rounded-lg flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-yellow-500 mt-0.5" />
              <div>
                <h4 className="font-medium text-yellow-700 dark:text-yellow-400">
                  Task Runners Required in v2.0
                </h4>
                <p className="text-sm text-muted-foreground">
                  Task runners will be mandatory in version 2.0. Code execution nodes will fail without them.
                  Enable now to prepare for the upgrade.
                </p>
              </div>
            </div>
          )}

          {taskRunnersEnabled && (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <div className="p-4 border rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Server className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Active Runners</span>
                </div>
                <p className="text-2xl font-bold">
                  {runners.filter(r => r.status === "running").length}/{runners.length}
                </p>
              </div>
              <div className="p-4 border rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Zap className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Tasks Completed</span>
                </div>
                <p className="text-2xl font-bold">
                  {runners.reduce((sum, r) => sum + r.tasksCompleted, 0).toLocaleString()}
                </p>
              </div>
              <div className="p-4 border rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Queued Tasks</span>
                </div>
                <p className="text-2xl font-bold">
                  {runners.reduce((sum, r) => sum + r.tasksQueued, 0)}
                </p>
              </div>
              <div className="p-4 border rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Shield className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Isolation Mode</span>
                </div>
                <p className="text-2xl font-bold capitalize">{runnerMode}</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {taskRunnersEnabled && (
        <>
          {/* Runner Instances */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Runner Instances</CardTitle>
                <Button variant="outline" size="sm">
                  <Server className="h-4 w-4 mr-2" />
                  Add Runner
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {runners.map((runner) => (
                  <div key={runner.id} className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-3 h-3 rounded-full ${
                          runner.status === "running" ? "bg-green-500" :
                          runner.status === "stopped" ? "bg-gray-400" :
                          runner.status === "starting" ? "bg-yellow-500 animate-pulse" :
                          "bg-red-500"
                        }`} />
                        <div>
                          <h4 className="font-medium">{runner.name}</h4>
                          <p className="text-xs text-muted-foreground">
                            {runner.type === "internal" ? "Internal Mode" : "External Docker"} • Uptime: {runner.uptime}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={runner.status === "running" ? "default" : "secondary"}>
                          {runner.status}
                        </Badge>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleToggleRunner(runner.id)}
                        >
                          {runner.status === "running" ? (
                            <Pause className="h-4 w-4" />
                          ) : (
                            <Play className="h-4 w-4" />
                          )}
                        </Button>
                        <Button variant="ghost" size="icon">
                          <RefreshCw className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    <div className="grid gap-4 md:grid-cols-4">
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="flex items-center gap-1">
                            <Cpu className="h-3 w-3" /> CPU
                          </span>
                          <span>{runner.cpuUsage}%</span>
                        </div>
                        <Progress value={runner.cpuUsage} className="h-2" />
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="flex items-center gap-1">
                            <MemoryStick className="h-3 w-3" /> Memory
                          </span>
                          <span>{runner.memoryUsage}%</span>
                        </div>
                        <Progress value={runner.memoryUsage} className="h-2" />
                      </div>
                      <div className="text-sm">
                        <span className="text-muted-foreground">Completed:</span>
                        <span className="ml-2 font-medium">{runner.tasksCompleted.toLocaleString()}</span>
                      </div>
                      <div className="text-sm">
                        <span className="text-muted-foreground">Queued:</span>
                        <span className="ml-2 font-medium">{runner.tasksQueued}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Configuration Tabs */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings2 className="h-5 w-5" />
                Runner Configuration
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="mode">
                <TabsList>
                  <TabsTrigger value="mode">Mode</TabsTrigger>
                  <TabsTrigger value="resources">Resources</TabsTrigger>
                  <TabsTrigger value="security">Security</TabsTrigger>
                  <TabsTrigger value="docker">Docker</TabsTrigger>
                </TabsList>

                {/* Mode Tab */}
                <TabsContent value="mode" className="space-y-4 pt-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div
                      className={`p-4 border rounded-lg cursor-pointer transition-all ${
                        runnerMode === "internal" ? "border-primary bg-primary/5" : "hover:border-primary/50"
                      }`}
                      onClick={() => setRunnerMode("internal")}
                    >
                      <div className="flex items-center gap-3 mb-2">
                        <Layers className="h-6 w-6" />
                        <div>
                          <h4 className="font-medium">Internal Mode</h4>
                          <p className="text-sm text-muted-foreground">
                            Run tasks within the main process
                          </p>
                        </div>
                      </div>
                      <div className="mt-3 space-y-1 text-sm">
                        <p>✓ Simple setup, no Docker required</p>
                        <p>✓ Lower latency</p>
                        <p>⚠️ Less isolation</p>
                      </div>
                    </div>
                    <div
                      className={`p-4 border rounded-lg cursor-pointer transition-all ${
                        runnerMode === "external" ? "border-primary bg-primary/5" : "hover:border-primary/50"
                      }`}
                      onClick={() => setRunnerMode("external")}
                    >
                      <div className="flex items-center gap-3 mb-2">
                        <Container className="h-6 w-6" />
                        <div>
                          <h4 className="font-medium">External Mode (Docker)</h4>
                          <p className="text-sm text-muted-foreground">
                            Run tasks in isolated Docker containers
                          </p>
                        </div>
                      </div>
                      <div className="mt-3 space-y-1 text-sm">
                        <p>✓ Full process isolation</p>
                        <p>✓ Enhanced security</p>
                        <p>✓ Resource limits enforced</p>
                      </div>
                    </div>
                  </div>
                </TabsContent>

                {/* Resources Tab */}
                <TabsContent value="resources" className="space-y-4 pt-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Max CPU Cores</Label>
                      <Input
                        type="number"
                        value={resourceLimits.maxCpu}
                        onChange={(e) => setResourceLimits({ ...resourceLimits, maxCpu: parseInt(e.target.value) })}
                      />
                      <p className="text-xs text-muted-foreground">CPU cores per task</p>
                    </div>
                    <div className="space-y-2">
                      <Label>Max Memory (MB)</Label>
                      <Input
                        type="number"
                        value={resourceLimits.maxMemoryMb}
                        onChange={(e) => setResourceLimits({ ...resourceLimits, maxMemoryMb: parseInt(e.target.value) })}
                      />
                      <p className="text-xs text-muted-foreground">Memory limit per task</p>
                    </div>
                    <div className="space-y-2">
                      <Label>Max Execution Time (ms)</Label>
                      <Input
                        type="number"
                        value={resourceLimits.maxExecutionTimeMs}
                        onChange={(e) => setResourceLimits({ ...resourceLimits, maxExecutionTimeMs: parseInt(e.target.value) })}
                      />
                      <p className="text-xs text-muted-foreground">Timeout for task execution</p>
                    </div>
                    <div className="space-y-2">
                      <Label>Max Concurrent Tasks</Label>
                      <Input
                        type="number"
                        value={resourceLimits.maxConcurrentTasks}
                        onChange={(e) => setResourceLimits({ ...resourceLimits, maxConcurrentTasks: parseInt(e.target.value) })}
                      />
                      <p className="text-xs text-muted-foreground">Tasks running in parallel</p>
                    </div>
                  </div>
                </TabsContent>

                {/* Security Tab */}
                <TabsContent value="security" className="space-y-4 pt-4">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <Label>Network Isolation</Label>
                        <p className="text-sm text-muted-foreground">
                          Prevent tasks from making external network requests
                        </p>
                      </div>
                      <Switch
                        checked={securitySettings.networkIsolation}
                        onCheckedChange={(checked) => setSecuritySettings({ ...securitySettings, networkIsolation: checked })}
                      />
                    </div>

                    <div className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <Label>Filesystem Access</Label>
                        <p className="text-sm text-muted-foreground">
                          Allow tasks to read/write files (dangerous)
                        </p>
                      </div>
                      <Switch
                        checked={securitySettings.filesystemAccess}
                        onCheckedChange={(checked) => setSecuritySettings({ ...securitySettings, filesystemAccess: checked })}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Restricted Paths</Label>
                      <Input
                        value={securitySettings.restrictedPaths}
                        onChange={(e) => setSecuritySettings({ ...securitySettings, restrictedPaths: e.target.value })}
                        placeholder="/etc,/var,/root"
                      />
                      <p className="text-xs text-muted-foreground">Comma-separated list of forbidden paths</p>
                    </div>

                    <div className="space-y-2">
                      <Label>Allowed Node Modules</Label>
                      <Textarea
                        value={securitySettings.allowedModules}
                        onChange={(e) => setSecuritySettings({ ...securitySettings, allowedModules: e.target.value })}
                        placeholder="axios,lodash,moment"
                        className="h-20"
                      />
                      <p className="text-xs text-muted-foreground">
                        Comma-separated list of allowed npm modules. Leave empty to allow all.
                      </p>
                    </div>
                  </div>
                </TabsContent>

                {/* Docker Tab */}
                <TabsContent value="docker" className="space-y-4 pt-4">
                  <div className="p-4 border rounded-lg bg-muted/50">
                    <h4 className="font-medium mb-2 flex items-center gap-2">
                      <Terminal className="h-4 w-4" />
                      Docker Configuration
                    </h4>
                    <p className="text-sm text-muted-foreground mb-4">
                      For external mode, you need to run the Task Runner Docker container.
                    </p>
                    <div className="bg-background p-4 rounded border font-mono text-sm overflow-x-auto">
                      <pre>{`docker run -d \\
  --name n8n-task-runner \\
  -e RUNNER_AUTH_TOKEN=your-auth-token \\
  -e N8N_HOST=http://your-n8n-instance:5678 \\
  -p 5679:5679 \\
  n8nio/runners:latest`}</pre>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Runner Image</Label>
                    <Select defaultValue="n8nio/runners:latest">
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="n8nio/runners:latest">n8nio/runners:latest</SelectItem>
                        <SelectItem value="n8nio/runners:1.0.0">n8nio/runners:1.0.0</SelectItem>
                        <SelectItem value="custom">Custom Image</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Authentication Token</Label>
                    <Input type="password" placeholder="Runner authentication token" />
                    <p className="text-xs text-muted-foreground">
                      Secure token for runner-to-n8n communication
                    </p>
                  </div>
                </TabsContent>
              </Tabs>

              <div className="flex justify-end mt-6 pt-4 border-t">
                <Button onClick={handleSaveConfig}>
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Save Configuration
                </Button>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
