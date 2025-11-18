import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { History, RotateCcw, GitBranch } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { WorkflowNodeData } from "@/types/workflow";

interface WorkflowVersion {
  id: string;
  workflow_id: string;
  version_number: number;
  nodes: WorkflowNodeData[];
  notes: string | null;
  created_at: string;
  created_by: string;
}

interface VersionHistoryPanelProps {
  workflowId: string;
  onRestore: (nodes: WorkflowNodeData[]) => void;
}

export const VersionHistoryPanel = ({ workflowId, onRestore }: VersionHistoryPanelProps) => {
  const { toast } = useToast();
  
  const { data: versions, isLoading } = useQuery({
    queryKey: ["workflow-versions", workflowId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("workflow_versions")
        .select("*")
        .eq("workflow_id", workflowId)
        .order("version_number", { ascending: false })
        .limit(20);

      if (error) throw error;
      return data as any as WorkflowVersion[];
    },
    enabled: !!workflowId,
  });

  const handleRestore = async (version: WorkflowVersion) => {
    try {
      onRestore(version.nodes);
      toast({
        title: "Version restored",
        description: `Workflow restored to version ${version.version_number}`,
      });
    } catch (error: any) {
      toast({
        title: "Failed to restore",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <GitBranch className="w-5 h-5" />
          Version History
        </CardTitle>
        <CardDescription>Track changes and restore previous versions</CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[500px]">
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading versions...</div>
          ) : versions && versions.length > 0 ? (
            <div className="space-y-3">
              {versions.map((version, idx) => (
                <div
                  key={version.id}
                  className="border rounded-lg p-4 hover:bg-accent/5 transition-colors"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <Badge variant={idx === 0 ? "default" : "outline"}>
                        v{version.version_number}
                      </Badge>
                      {idx === 0 && (
                        <Badge variant="secondary" className="text-xs">
                          Current
                        </Badge>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(version.created_at), { addSuffix: true })}
                    </span>
                  </div>
                  
                  {version.notes && (
                    <p className="text-sm text-muted-foreground mb-3">{version.notes}</p>
                  )}
                  
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">
                      {version.nodes.length} nodes
                    </span>
                    {idx !== 0 && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleRestore(version)}
                      >
                        <RotateCcw className="w-3 h-3 mr-2" />
                        Restore
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No version history available. Save your workflow to create versions.
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
};
