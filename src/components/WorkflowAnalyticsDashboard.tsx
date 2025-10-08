import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart3, TrendingUp, Clock, AlertCircle, CheckCircle2, XCircle } from "lucide-react";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

interface WorkflowAnalyticsDashboardProps {
  workflowId: string;
  timeRange?: '24h' | '7d' | '30d';
}

export function WorkflowAnalyticsDashboard({ workflowId, timeRange = '7d' }: WorkflowAnalyticsDashboardProps) {
  // Mock data - in real app, fetch from backend
  const executionData = [
    { time: '00:00', success: 45, failed: 5 },
    { time: '04:00', success: 52, failed: 3 },
    { time: '08:00', success: 68, failed: 7 },
    { time: '12:00', success: 75, failed: 4 },
    { time: '16:00', success: 82, failed: 6 },
    { time: '20:00', success: 59, failed: 3 },
  ];

  const performanceData = [
    { step: 'Trigger', avgTime: 45 },
    { step: 'Validation', avgTime: 120 },
    { step: 'API Call', avgTime: 850 },
    { step: 'Transform', avgTime: 200 },
    { step: 'Complete', avgTime: 95 },
  ];

  const errorDistribution = [
    { name: 'Timeout', value: 35, color: '#ef4444' },
    { name: 'Invalid Data', value: 28, color: '#f59e0b' },
    { name: 'API Error', value: 22, color: '#eab308' },
    { name: 'Network', value: 15, color: '#84cc16' },
  ];

  const stats = {
    totalExecutions: 1247,
    successRate: 94.2,
    avgDuration: 1310,
    errorRate: 5.8,
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5" />
          Workflow Analytics
        </CardTitle>
        <CardDescription>
          Performance metrics and insights for the last {timeRange}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">Total Executions</span>
                <TrendingUp className="h-4 w-4 text-green-500" />
              </div>
              <p className="text-2xl font-bold">{stats.totalExecutions.toLocaleString()}</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">Success Rate</span>
                <CheckCircle2 className="h-4 w-4 text-green-500" />
              </div>
              <p className="text-2xl font-bold">{stats.successRate}%</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">Avg Duration</span>
                <Clock className="h-4 w-4 text-blue-500" />
              </div>
              <p className="text-2xl font-bold">{stats.avgDuration}ms</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">Error Rate</span>
                <XCircle className="h-4 w-4 text-red-500" />
              </div>
              <p className="text-2xl font-bold">{stats.errorRate}%</p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="executions">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="executions">Executions</TabsTrigger>
            <TabsTrigger value="performance">Performance</TabsTrigger>
            <TabsTrigger value="errors">Errors</TabsTrigger>
          </TabsList>

          <TabsContent value="executions" className="space-y-4">
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={executionData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="time" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="success" stroke="#10b981" strokeWidth={2} />
                  <Line type="monotone" dataKey="failed" stroke="#ef4444" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="flex gap-4 justify-center">
              <Badge variant="outline" className="gap-2">
                <div className="w-3 h-3 rounded-full bg-green-500" />
                Successful
              </Badge>
              <Badge variant="outline" className="gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500" />
                Failed
              </Badge>
            </div>
          </TabsContent>

          <TabsContent value="performance" className="space-y-4">
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={performanceData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="step" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="avgTime" fill="#3b82f6" />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <p className="text-sm text-muted-foreground text-center">
              Average execution time per workflow step (milliseconds)
            </p>
          </TabsContent>

          <TabsContent value="errors" className="space-y-4">
            <div className="h-[300px] flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={errorDistribution}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {errorDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {errorDistribution.map((error) => (
                <div key={error.name} className="flex items-center gap-2">
                  <div 
                    className="w-4 h-4 rounded" 
                    style={{ backgroundColor: error.color }}
                  />
                  <span className="text-sm">{error.name}: {error.value}</span>
                </div>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
