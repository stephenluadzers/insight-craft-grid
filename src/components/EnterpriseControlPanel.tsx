import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Activity, Zap, TestTube, Users, LineChart, Cpu, Shield, Bot, DollarSign, Code } from "lucide-react";
import { PerformanceMonitor } from "./PerformanceMonitor";
import { WorkflowAnalyticsDashboard } from "./WorkflowAnalyticsDashboard";
import { IntegrationLibrary } from "./IntegrationLibrary";
import CollaborativeWorkspace from "./CollaborativeWorkspace";
import { WorkflowTestSuite } from "./WorkflowTestSuite";
import { SecurityMonitoringDashboard } from "./SecurityMonitoringDashboard";
import AIAgentBuilder from "./AIAgentBuilder";
import { WorkflowCostEstimator } from "./WorkflowCostEstimator";
import { supabase } from "@/integrations/supabase/client";

export const EnterpriseControlPanel = () => {
  const [workspaceId, setWorkspaceId] = useState<string>("");
  const [activeTab, setActiveTab] = useState("overview");

  useEffect(() => {
    fetchWorkspace();
  }, []);

  const fetchWorkspace = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: profile } = await supabase
      .from('profiles')
      .select('default_workspace_id')
      .eq('id', user.id)
      .single();

    if (profile?.default_workspace_id) {
      setWorkspaceId(profile.default_workspace_id);
    }
  };

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Enterprise Control Panel</h1>
        <p className="text-muted-foreground">Advanced workflow management and analytics</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-5 lg:grid-cols-9">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="integrations">Integrations</TabsTrigger>
          <TabsTrigger value="team">Team</TabsTrigger>
          <TabsTrigger value="testing">Testing</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="ai">AI Agent</TabsTrigger>
          <TabsTrigger value="costs">Costs</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Card className="p-6 cursor-pointer hover:shadow-lg transition-shadow" onClick={() => setActiveTab("performance")}>
              <div className="flex items-center gap-3 mb-4">
                <Activity className="h-6 w-6 text-primary" />
                <h3 className="font-semibold">Real-time Monitoring</h3>
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                Live execution traces, distributed tracing, and performance metrics with OpenTelemetry integration.
              </p>
              <Badge variant="secondary">Active</Badge>
            </Card>

            <Card className="p-6 cursor-pointer hover:shadow-lg transition-shadow" onClick={() => setActiveTab("analytics")}>
              <div className="flex items-center gap-3 mb-4">
                <LineChart className="h-6 w-6 text-primary" />
                <h3 className="font-semibold">Predictive Analytics</h3>
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                ML-powered failure prediction, performance degradation alerts, and auto-optimization suggestions.
              </p>
              <Badge variant="secondary">AI-Powered</Badge>
            </Card>

            <Card className="p-6 cursor-pointer hover:shadow-lg transition-shadow" onClick={() => setActiveTab("performance")}>
              <div className="flex items-center gap-3 mb-4">
                <Cpu className="h-6 w-6 text-primary" />
                <h3 className="font-semibold">Workflow Compilation</h3>
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                Auto-detect parallel execution opportunities, optimize dependency graphs, and cache results.
              </p>
              <Badge variant="secondary">Optimized</Badge>
            </Card>

            <Card className="p-6 cursor-pointer hover:shadow-lg transition-shadow" onClick={() => setActiveTab("testing")}>
              <div className="flex items-center gap-3 mb-4">
                <TestTube className="h-6 w-6 text-primary" />
                <h3 className="font-semibold">Testing Framework</h3>
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                Unit tests, integration tests, and load tests with assertion engine and CI/CD integration.
              </p>
              <Badge variant="secondary">Test Suite</Badge>
            </Card>

            <Card className="p-6 cursor-pointer hover:shadow-lg transition-shadow" onClick={() => setActiveTab("team")}>
              <div className="flex items-center gap-3 mb-4">
                <Users className="h-6 w-6 text-primary" />
                <h3 className="font-semibold">Team Workspaces</h3>
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                Multi-tenant architecture with RBAC, approval workflows, and complete audit logging.
              </p>
              <Badge variant="secondary">Multi-Tenant</Badge>
            </Card>

            <Card className="p-6 cursor-pointer hover:shadow-lg transition-shadow" onClick={() => setActiveTab("integrations")}>
              <div className="flex items-center gap-3 mb-4">
                <Zap className="h-6 w-6 text-primary" />
                <h3 className="font-semibold">Integration Hub</h3>
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                50+ enterprise connectors, custom connector SDK, and API marketplace for monetization.
              </p>
              <Badge variant="secondary">50+ Connectors</Badge>
            </Card>

            <Card className="p-6 cursor-pointer hover:shadow-lg transition-shadow" onClick={() => setActiveTab("security")}>
              <div className="flex items-center gap-3 mb-4">
                <Shield className="h-6 w-6 text-primary" />
                <h3 className="font-semibold">Security Monitoring</h3>
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                Real-time threat detection, vulnerability scanning, and compliance monitoring.
              </p>
              <Badge variant="secondary">Protected</Badge>
            </Card>

            <Card className="p-6 cursor-pointer hover:shadow-lg transition-shadow" onClick={() => setActiveTab("ai")}>
              <div className="flex items-center gap-3 mb-4">
                <Bot className="h-6 w-6 text-primary" />
                <h3 className="font-semibold">AI Agent Builder</h3>
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                Natural language workflow generation with intelligent optimization recommendations.
              </p>
              <Badge variant="secondary">AI-Powered</Badge>
            </Card>

            <Card className="p-6 cursor-pointer hover:shadow-lg transition-shadow" onClick={() => setActiveTab("costs")}>
              <div className="flex items-center gap-3 mb-4">
                <DollarSign className="h-6 w-6 text-primary" />
                <h3 className="font-semibold">Cost Estimator</h3>
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                Projected costs, optimization tips, and budget alerts for your workflows.
              </p>
              <Badge variant="secondary">Financial</Badge>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="performance">
          {workspaceId && <PerformanceMonitor workspaceId={workspaceId} />}
        </TabsContent>

        <TabsContent value="analytics">
          {workspaceId && <div>Select a workflow to view analytics</div>}
        </TabsContent>

        <TabsContent value="integrations">
          <IntegrationLibrary onAddNode={() => {}} />
        </TabsContent>

        <TabsContent value="team">
          {workspaceId && <CollaborativeWorkspace />}
        </TabsContent>

        <TabsContent value="testing">
          <div>Select a workflow to manage test suites</div>
        </TabsContent>

        <TabsContent value="security">
          {workspaceId && <SecurityMonitoringDashboard workspaceId={workspaceId} />}
        </TabsContent>

        <TabsContent value="ai">
          <AIAgentBuilder onWorkflowGenerated={(workflow) => console.log('Generated:', workflow)} />
        </TabsContent>

        <TabsContent value="costs">
          <WorkflowCostEstimator nodes={[]} executionsPerMonth={1000} />
        </TabsContent>
      </Tabs>
    </div>
  );
};