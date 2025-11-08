import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { WorkflowAnalyticsDashboard } from "@/components/WorkflowAnalyticsDashboard";
import { WorkflowBIDashboard } from "@/components/WorkflowBIDashboard";
import { WorkflowHealthDashboard } from "@/components/WorkflowHealthDashboard";
import { PerformanceMonitor } from "@/components/PerformanceMonitor";
import { ErrorAggregationDashboard } from "@/components/ErrorAggregationDashboard";
import { SecurityMonitoringDashboard } from "@/components/SecurityMonitoringDashboard";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, BarChart3, TrendingUp, Shield, AlertTriangle, DollarSign, Activity } from "lucide-react";

export default function Analytics() {
  const navigate = useNavigate();
  const [selectedWorkflowId, setSelectedWorkflowId] = useState<string>("demo-workflow-id");
  const [selectedWorkspaceId] = useState<string>("demo-workspace-id");

  return (
    <SidebarProvider>
      <AppSidebar />
      <main className="flex-1 overflow-auto">
        <div className="container mx-auto p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <SidebarTrigger />
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => navigate("/")}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Workflows
              </Button>
            </div>
            <div className="flex items-center gap-4">
              <Select value={selectedWorkflowId} onValueChange={setSelectedWorkflowId}>
                <SelectTrigger className="w-[250px]">
                  <SelectValue placeholder="Select workflow" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="demo-workflow-id">Demo Workflow</SelectItem>
                  <SelectItem value="all">All Workflows</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <h1 className="text-3xl font-bold mb-2">Advanced Analytics</h1>
            <p className="text-muted-foreground">
              Comprehensive analytics, performance metrics, and business intelligence
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Executions</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">12,847</div>
                <p className="text-xs text-muted-foreground">
                  <span className="text-green-500">+18.2%</span> from last month
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">94.2%</div>
                <p className="text-xs text-muted-foreground">
                  <span className="text-green-500">+2.1%</span> from last month
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Cost</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">$2,847</div>
                <p className="text-xs text-muted-foreground">
                  <span className="text-red-500">+12.3%</span> from last month
                </p>
              </CardContent>
            </Card>
          </div>

          <Tabs defaultValue="performance" className="space-y-6">
            <TabsList className="grid w-full grid-cols-6">
              <TabsTrigger value="performance">
                <BarChart3 className="h-4 w-4 mr-2" />
                Performance
              </TabsTrigger>
              <TabsTrigger value="executions">
                <Activity className="h-4 w-4 mr-2" />
                Executions
              </TabsTrigger>
              <TabsTrigger value="health">
                <TrendingUp className="h-4 w-4 mr-2" />
                Health
              </TabsTrigger>
              <TabsTrigger value="business">
                <DollarSign className="h-4 w-4 mr-2" />
                Business
              </TabsTrigger>
              <TabsTrigger value="errors">
                <AlertTriangle className="h-4 w-4 mr-2" />
                Errors
              </TabsTrigger>
              <TabsTrigger value="security">
                <Shield className="h-4 w-4 mr-2" />
                Security
              </TabsTrigger>
            </TabsList>

            <TabsContent value="performance" className="space-y-6">
              <PerformanceMonitor workspaceId={selectedWorkspaceId} />
            </TabsContent>

            <TabsContent value="executions" className="space-y-6">
              <WorkflowAnalyticsDashboard 
                workflowId={selectedWorkflowId}
                timeRange="7d"
              />
            </TabsContent>

            <TabsContent value="health" className="space-y-6">
              <WorkflowHealthDashboard
                workflowId={selectedWorkflowId}
                workspaceId={selectedWorkspaceId}
              />
            </TabsContent>

            <TabsContent value="business" className="space-y-6">
              <WorkflowBIDashboard
                workflowId={selectedWorkflowId}
                workspaceId={selectedWorkspaceId}
              />
            </TabsContent>

            <TabsContent value="errors" className="space-y-6">
              <ErrorAggregationDashboard workspaceId={selectedWorkspaceId} />
            </TabsContent>

            <TabsContent value="security" className="space-y-6">
              <SecurityMonitoringDashboard workspaceId={selectedWorkspaceId} />
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </SidebarProvider>
  );
}
