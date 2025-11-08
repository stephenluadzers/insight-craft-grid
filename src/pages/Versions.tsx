import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { WorkflowVersionHistory } from "@/components/WorkflowVersionHistory";
import { WorkflowVersionDiff } from "@/components/WorkflowVersionDiff";
import { CreateVersionDialog } from "@/components/CreateVersionDialog";
import { ArrowLeft, Plus, GitBranch } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function Versions() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [selectedWorkflowId] = useState<string>(searchParams.get("workflow") || "demo-workflow-id");
  const [selectedWorkspaceId] = useState<string>("demo-workspace-id");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [compareFromId, setCompareFromId] = useState<string | null>(null);
  const [compareToId, setCompareToId] = useState<string | null>(null);
  const [showDiff, setShowDiff] = useState(false);

  const handleViewDiff = (versionId: string) => {
    if (!compareFromId) {
      setCompareFromId(versionId);
    } else {
      setCompareToId(versionId);
      setShowDiff(true);
    }
  };

  const clearComparison = () => {
    setCompareFromId(null);
    setCompareToId(null);
    setShowDiff(false);
  };

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
              <Select value={selectedWorkflowId}>
                <SelectTrigger className="w-[250px]">
                  <SelectValue placeholder="Select workflow" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="demo-workflow-id">Demo Workflow</SelectItem>
                </SelectContent>
              </Select>
              <Button onClick={() => setCreateDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create Version
              </Button>
            </div>
          </div>

          <div>
            <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
              <GitBranch className="h-8 w-8" />
              Version Control
            </h1>
            <p className="text-muted-foreground">
              Manage workflow versions, compare changes, and rollback to previous states
            </p>
          </div>

          {compareFromId && !showDiff && (
            <Card className="border-primary">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge>Comparison Mode</Badge>
                    <span className="text-sm">
                      Select another version to compare with the selected version
                    </span>
                  </div>
                  <Button variant="outline" size="sm" onClick={clearComparison}>
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <WorkflowVersionHistory
              workflowId={selectedWorkflowId}
              workspaceId={selectedWorkspaceId}
              onViewDiff={handleViewDiff}
              onRollback={() => {
                // Refresh page after rollback
                window.location.reload();
              }}
            />

            {showDiff && compareFromId && compareToId ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold">Version Comparison</h2>
                  <Button variant="outline" size="sm" onClick={clearComparison}>
                    Clear Comparison
                  </Button>
                </div>
                <WorkflowVersionDiff
                  fromVersionId={compareFromId}
                  toVersionId={compareToId}
                />
              </div>
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle>Compare Versions</CardTitle>
                  <CardDescription>
                    Select two versions from the history to view a detailed comparison
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-12 text-muted-foreground">
                    <GitBranch className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Click "View Diff" on two different versions to compare them</p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          <CreateVersionDialog
            workflowId={selectedWorkflowId}
            workspaceId={selectedWorkspaceId}
            nodes={[]} // In real app, get from workflow state
            edges={[]}
            open={createDialogOpen}
            onOpenChange={setCreateDialogOpen}
            onVersionCreated={() => {
              // Refresh version history
              window.location.reload();
            }}
          />
        </div>
      </main>
    </SidebarProvider>
  );
}
