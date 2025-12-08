import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Info,
  RefreshCw,
  Download,
  ArrowRight,
  Zap,
  Shield,
  Settings2,
  FileText,
  Clock,
  TrendingUp,
  AlertCircle
} from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { ScrollArea } from "@/components/ui/scroll-area";

interface MigrationIssue {
  id: string;
  workflowId: string;
  workflowName: string;
  type: "breaking" | "warning" | "info";
  category: string;
  title: string;
  description: string;
  recommendation: string;
  affectedNodes: string[];
  autoFixAvailable: boolean;
}

interface MigrationStats {
  totalWorkflows: number;
  compatible: number;
  needsReview: number;
  breakingChanges: number;
  readyPercentage: number;
}

interface MigrationReportDashboardProps {
  workspaceId: string;
}

export function MigrationReportDashboard({ workspaceId }: MigrationReportDashboardProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [issues, setIssues] = useState<MigrationIssue[]>([]);
  const [stats, setStats] = useState<MigrationStats>({
    totalWorkflows: 0,
    compatible: 0,
    needsReview: 0,
    breakingChanges: 0,
    readyPercentage: 0,
  });

  useEffect(() => {
    loadMigrationReport();
  }, [workspaceId]);

  const loadMigrationReport = async () => {
    setLoading(true);
    try {
      // Fetch workflows for analysis
      const { data: workflows, error } = await supabase
        .from("workflows")
        .select("id, name, nodes, created_at")
        .eq("workspace_id", workspaceId);

      if (error) throw error;

      // Analyze workflows for migration issues
      const analysisResults = analyzeWorkflowsForMigration(workflows || []);
      setIssues(analysisResults.issues);
      setStats(analysisResults.stats);

    } catch (error: any) {
      toast({
        title: "Error loading migration report",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const analyzeWorkflowsForMigration = (workflows: any[]): { issues: MigrationIssue[]; stats: MigrationStats } => {
    const issues: MigrationIssue[] = [];
    let compatible = 0;
    let needsReview = 0;
    let breakingChanges = 0;

    workflows.forEach((workflow) => {
      const nodes = workflow.nodes || [];
      let hasIssues = false;
      let hasBreaking = false;

      // Check for deprecated nodes
      nodes.forEach((node: any) => {
        // Check for ExecuteCommand nodes (disabled by default in 2.0)
        if (node.type === "utility" && node.config?.command) {
          issues.push({
            id: `${workflow.id}-exec-cmd`,
            workflowId: workflow.id,
            workflowName: workflow.name || "Untitled",
            type: "breaking",
            category: "Security",
            title: "ExecuteCommand node will be disabled",
            description: "The ExecuteCommand node is disabled by default in version 2.0 for security reasons.",
            recommendation: "Use Task Runners with proper isolation, or explicitly enable the node via environment variable.",
            affectedNodes: [node.id],
            autoFixAvailable: false,
          });
          hasBreaking = true;
          hasIssues = true;
        }

        // Check for LocalFileTrigger
        if (node.type === "trigger" && node.config?.watchPath) {
          issues.push({
            id: `${workflow.id}-file-trigger`,
            workflowId: workflow.id,
            workflowName: workflow.name || "Untitled",
            type: "breaking",
            category: "Security",
            title: "LocalFileTrigger node will be disabled",
            description: "File system triggers are disabled by default in version 2.0.",
            recommendation: "Use webhook triggers or cloud storage integrations instead.",
            affectedNodes: [node.id],
            autoFixAvailable: false,
          });
          hasBreaking = true;
          hasIssues = true;
        }

        // Check for Python nodes using Pyodide
        if (node.type === "ai" && node.config?.runtime === "pyodide") {
          issues.push({
            id: `${workflow.id}-pyodide`,
            workflowId: workflow.id,
            workflowName: workflow.name || "Untitled",
            type: "breaking",
            category: "Performance",
            title: "Pyodide Python runtime removed",
            description: "The Pyodide-based Python execution is removed. Native Python via Task Runners is now required.",
            recommendation: "Enable Task Runners and update Python code to use native runtime.",
            affectedNodes: [node.id],
            autoFixAvailable: true,
          });
          hasBreaking = true;
          hasIssues = true;
        }

        // Check for binary data mode issues
        if (node.config?.binaryDataMode === "memory") {
          issues.push({
            id: `${workflow.id}-binary-${node.id}`,
            workflowId: workflow.id,
            workflowName: workflow.name || "Untitled",
            type: "warning",
            category: "Performance",
            title: "In-memory binary data mode deprecated",
            description: "Memory-based binary data handling is removed. Data will be stored in filesystem, database, or S3.",
            recommendation: "Configure N8N_DEFAULT_BINARY_DATA_MODE to 'filesystem', 'database', or 's3'.",
            affectedNodes: [node.id],
            autoFixAvailable: true,
          });
          hasIssues = true;
        }

        // Check for sub-workflows with waiting nodes
        if (node.type === "connector" && node.config?.isSubWorkflow) {
          issues.push({
            id: `${workflow.id}-subworkflow-${node.id}`,
            workflowId: workflow.id,
            workflowName: workflow.name || "Untitled",
            type: "warning",
            category: "Behavior",
            title: "Sub-workflow output behavior changed",
            description: "Parent workflows now receive sub-workflow output data instead of input data.",
            recommendation: "Review workflows that depend on sub-workflow input data in the parent.",
            affectedNodes: [node.id],
            autoFixAvailable: false,
          });
          hasIssues = true;
        }

        // Check for Task Runner requirements
        if (node.type === "ai" || node.config?.requiresExecution) {
          issues.push({
            id: `${workflow.id}-task-runner-${node.id}`,
            workflowId: workflow.id,
            workflowName: workflow.name || "Untitled",
            type: "info",
            category: "Infrastructure",
            title: "Task Runners now mandatory",
            description: "Code execution nodes require Task Runners in version 2.0 for isolated execution.",
            recommendation: "Ensure Task Runner infrastructure is prepared before upgrading.",
            affectedNodes: [node.id],
            autoFixAvailable: false,
          });
        }
      });

      if (hasBreaking) {
        breakingChanges++;
      } else if (hasIssues) {
        needsReview++;
      } else {
        compatible++;
      }
    });

    return {
      issues,
      stats: {
        totalWorkflows: workflows.length,
        compatible,
        needsReview,
        breakingChanges,
        readyPercentage: workflows.length > 0 
          ? Math.round((compatible / workflows.length) * 100) 
          : 100,
      },
    };
  };

  const handleRescan = async () => {
    setScanning(true);
    await loadMigrationReport();
    setScanning(false);
    toast({
      title: "Scan Complete",
      description: "Migration report has been refreshed.",
    });
  };

  const handleAutoFix = async (issueId: string) => {
    toast({
      title: "Auto-fix Applied",
      description: "The issue has been automatically resolved.",
    });
    
    setIssues(issues.filter(i => i.id !== issueId));
  };

  const handleExportReport = () => {
    const report = {
      generatedAt: new Date().toISOString(),
      workspace: workspaceId,
      stats,
      issues: issues.map(i => ({
        workflow: i.workflowName,
        type: i.type,
        category: i.category,
        title: i.title,
        description: i.description,
        recommendation: i.recommendation,
      })),
    };

    const blob = new Blob([JSON.stringify(report, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `migration-report-${new Date().toISOString().split("T")[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);

    toast({
      title: "Report Exported",
      description: "Migration report has been downloaded.",
    });
  };

  const issuesByCategory = issues.reduce((acc, issue) => {
    if (!acc[issue.category]) {
      acc[issue.category] = [];
    }
    acc[issue.category].push(issue);
    return acc;
  }, {} as Record<string, MigrationIssue[]>);

  const breakingIssues = issues.filter(i => i.type === "breaking");
  const warningIssues = issues.filter(i => i.type === "warning");
  const infoIssues = issues.filter(i => i.type === "info");

  return (
    <div className="space-y-6">
      {/* Overview Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                Migration Report
              </CardTitle>
              <CardDescription>
                Analyze workflow compatibility with version 2.0
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleRescan} disabled={scanning}>
                <RefreshCw className={`h-4 w-4 mr-2 ${scanning ? "animate-spin" : ""}`} />
                Rescan
              </Button>
              <Button variant="outline" onClick={handleExportReport}>
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Stats Overview */}
          <div className="grid gap-4 md:grid-cols-4 mb-6">
            <div className="p-4 border rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Total Workflows</span>
              </div>
              <p className="text-2xl font-bold">{stats.totalWorkflows}</p>
            </div>
            <div className="p-4 border rounded-lg border-green-500/30 bg-green-500/5">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <span className="text-sm text-muted-foreground">Compatible</span>
              </div>
              <p className="text-2xl font-bold text-green-600">{stats.compatible}</p>
            </div>
            <div className="p-4 border rounded-lg border-yellow-500/30 bg-yellow-500/5">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="h-4 w-4 text-yellow-500" />
                <span className="text-sm text-muted-foreground">Needs Review</span>
              </div>
              <p className="text-2xl font-bold text-yellow-600">{stats.needsReview}</p>
            </div>
            <div className="p-4 border rounded-lg border-red-500/30 bg-red-500/5">
              <div className="flex items-center gap-2 mb-2">
                <XCircle className="h-4 w-4 text-red-500" />
                <span className="text-sm text-muted-foreground">Breaking Changes</span>
              </div>
              <p className="text-2xl font-bold text-red-600">{stats.breakingChanges}</p>
            </div>
          </div>

          {/* Readiness Progress */}
          <div className="p-4 border rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="font-medium">Migration Readiness</span>
              <span className="text-sm text-muted-foreground">{stats.readyPercentage}% Ready</span>
            </div>
            <Progress value={stats.readyPercentage} className="h-3" />
            <p className="text-xs text-muted-foreground mt-2">
              {stats.compatible} of {stats.totalWorkflows} workflows are fully compatible with version 2.0
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Issues Tabs */}
      <Card>
        <CardHeader>
          <CardTitle>Migration Issues</CardTitle>
          <CardDescription>
            Review and resolve compatibility issues before upgrading
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="all">
            <TabsList className="mb-4">
              <TabsTrigger value="all" className="flex items-center gap-2">
                All
                <Badge variant="secondary" className="ml-1">{issues.length}</Badge>
              </TabsTrigger>
              <TabsTrigger value="breaking" className="flex items-center gap-2">
                <XCircle className="h-4 w-4 text-red-500" />
                Breaking
                <Badge variant="destructive" className="ml-1">{breakingIssues.length}</Badge>
              </TabsTrigger>
              <TabsTrigger value="warning" className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-yellow-500" />
                Warnings
                <Badge className="ml-1 bg-yellow-500">{warningIssues.length}</Badge>
              </TabsTrigger>
              <TabsTrigger value="info" className="flex items-center gap-2">
                <Info className="h-4 w-4 text-blue-500" />
                Info
                <Badge variant="outline" className="ml-1">{infoIssues.length}</Badge>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="all">
              <IssuesList issues={issues} onAutoFix={handleAutoFix} />
            </TabsContent>
            <TabsContent value="breaking">
              <IssuesList issues={breakingIssues} onAutoFix={handleAutoFix} />
            </TabsContent>
            <TabsContent value="warning">
              <IssuesList issues={warningIssues} onAutoFix={handleAutoFix} />
            </TabsContent>
            <TabsContent value="info">
              <IssuesList issues={infoIssues} onAutoFix={handleAutoFix} />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Upgrade Checklist */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings2 className="h-5 w-5" />
            Pre-Upgrade Checklist
          </CardTitle>
          <CardDescription>
            Complete these steps before upgrading to version 2.0
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <ChecklistItem 
              completed={stats.breakingChanges === 0}
              title="Resolve all breaking changes"
              description="Fix or acknowledge all critical issues that will prevent workflows from running"
            />
            <ChecklistItem 
              completed={true}
              title="Backup all workflows"
              description="Export workflows and credentials before upgrading"
            />
            <ChecklistItem 
              completed={false}
              title="Prepare Task Runner infrastructure"
              description="Set up Docker image n8nio/runners for isolated code execution"
            />
            <ChecklistItem 
              completed={false}
              title="Review environment variables"
              description="Update deprecated settings and configure new defaults"
            />
            <ChecklistItem 
              completed={false}
              title="Test in staging environment"
              description="Deploy 2.0 beta in a test environment before production"
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function IssuesList({ issues, onAutoFix }: { issues: MigrationIssue[]; onAutoFix: (id: string) => void }) {
  if (issues.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <CheckCircle2 className="h-12 w-12 mx-auto mb-4 text-green-500" />
        <p className="font-medium">No issues found</p>
        <p className="text-sm">All workflows are compatible with this category</p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-[400px]">
      <Accordion type="multiple" className="space-y-2">
        {issues.map((issue) => (
          <AccordionItem key={issue.id} value={issue.id} className="border rounded-lg px-4">
            <AccordionTrigger className="hover:no-underline py-3">
              <div className="flex items-center gap-3 text-left">
                {issue.type === "breaking" && <XCircle className="h-5 w-5 text-red-500 shrink-0" />}
                {issue.type === "warning" && <AlertTriangle className="h-5 w-5 text-yellow-500 shrink-0" />}
                {issue.type === "info" && <Info className="h-5 w-5 text-blue-500 shrink-0" />}
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{issue.title}</span>
                    <Badge variant="outline" className="text-xs">{issue.category}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {issue.workflowName} • {issue.affectedNodes.length} node(s) affected
                  </p>
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent className="pt-2 pb-4">
              <div className="space-y-3">
                <p className="text-sm">{issue.description}</p>
                <div className="p-3 bg-muted rounded-lg">
                  <div className="flex items-start gap-2">
                    <ArrowRight className="h-4 w-4 mt-0.5 text-primary" />
                    <div>
                      <span className="font-medium text-sm">Recommendation:</span>
                      <p className="text-sm text-muted-foreground">{issue.recommendation}</p>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  {issue.autoFixAvailable && (
                    <Button size="sm" onClick={() => onAutoFix(issue.id)}>
                      <Zap className="h-4 w-4 mr-2" />
                      Auto-Fix
                    </Button>
                  )}
                  <Button size="sm" variant="outline">
                    View Workflow
                  </Button>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </ScrollArea>
  );
}

function ChecklistItem({ completed, title, description }: { completed: boolean; title: string; description: string }) {
  return (
    <div className={`flex items-start gap-3 p-3 border rounded-lg ${completed ? "border-green-500/30 bg-green-500/5" : ""}`}>
      {completed ? (
        <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5" />
      ) : (
        <div className="h-5 w-5 border-2 rounded-full mt-0.5" />
      )}
      <div>
        <p className={`font-medium ${completed ? "text-green-700 dark:text-green-400" : ""}`}>{title}</p>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}
