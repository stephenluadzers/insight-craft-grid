import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, GitBranch, Clock, User, Tag, RotateCcw, Eye } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface WorkflowVersion {
  id: string;
  version_number: number;
  name: string;
  description: string | null;
  created_at: string;
  created_by: string | null;
  is_current: boolean;
  change_summary: string | null;
  tags: string[];
  nodes: any;
}

interface WorkflowVersionHistoryProps {
  workflowId: string;
  workspaceId: string;
  onViewDiff?: (versionId: string) => void;
  onRollback?: () => void;
}

export function WorkflowVersionHistory({ 
  workflowId, 
  workspaceId, 
  onViewDiff,
  onRollback 
}: WorkflowVersionHistoryProps) {
  const [versions, setVersions] = useState<WorkflowVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [rollbackVersionId, setRollbackVersionId] = useState<string | null>(null);
  const [rolling, setRolling] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadVersions();

    // Set up realtime subscription
    const channel = supabase
      .channel(`workflow_versions_${workflowId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'workflow_versions',
          filter: `workflow_id=eq.${workflowId}`
        },
        () => {
          loadVersions();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [workflowId]);

  const loadVersions = async () => {
    try {
      const { data, error } = await supabase
        .from('workflow_versions')
        .select('id, version_number, name, description, nodes, created_at, created_by, is_current, change_summary, tags')
        .eq('workflow_id', workflowId)
        .order('version_number', { ascending: false });

      if (error) throw error;
      setVersions((data as any) || []);
    } catch (error: any) {
      toast({
        title: "Error loading versions",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRollback = async () => {
    if (!rollbackVersionId) return;

    try {
      setRolling(true);

      const { error } = await supabase.rpc('rollback_workflow_version' as any, {
        p_workflow_id: workflowId,
        p_version_id: rollbackVersionId,
      });

      if (error) throw error;

      toast({
        title: "Rollback successful",
        description: "Workflow has been restored to the selected version.",
      });

      setRollbackVersionId(null);
      loadVersions();
      onRollback?.();
    } catch (error: any) {
      toast({
        title: "Rollback failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setRolling(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GitBranch className="h-5 w-5" />
            Version History
          </CardTitle>
          <CardDescription>
            {versions.length} version{versions.length !== 1 ? 's' : ''} available
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[500px]">
            {versions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No versions saved yet
              </div>
            ) : (
              <div className="space-y-3">
                {versions.map((version) => (
                  <div
                    key={version.id}
                    className={`p-4 border rounded-lg space-y-3 ${
                      version.is_current ? 'border-primary bg-primary/5' : ''
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-semibold">v{version.version_number}</h4>
                          {version.is_current && (
                            <Badge>Current</Badge>
                          )}
                          {version.tags?.map((tag) => (
                            <Badge key={tag} variant="secondary" className="gap-1">
                              <Tag className="h-3 w-3" />
                              {tag}
                            </Badge>
                          ))}
                        </div>
                        <p className="text-sm font-medium">{version.name}</p>
                        {version.description && (
                          <p className="text-sm text-muted-foreground mt-1">
                            {version.description}
                          </p>
                        )}
                        {version.change_summary && (
                          <p className="text-xs text-muted-foreground mt-2 p-2 bg-muted rounded">
                            {version.change_summary}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {new Date(version.created_at).toLocaleString()}
                      </span>
                      {version.created_by && (
                        <span className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          User
                        </span>
                      )}
                    </div>

                    {!version.is_current && (
                      <div className="flex gap-2 pt-2 border-t">
                        {onViewDiff && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onViewDiff(version.id)}
                          >
                            <Eye className="h-3 w-3 mr-1" />
                            View Diff
                          </Button>
                        )}
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => setRollbackVersionId(version.id)}
                        >
                          <RotateCcw className="h-3 w-3 mr-1" />
                          Rollback to this version
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>

      <AlertDialog open={!!rollbackVersionId} onOpenChange={() => setRollbackVersionId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Rollback Workflow</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to rollback to this version? This will replace the current
              workflow configuration. A new version will be created automatically.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleRollback} disabled={rolling}>
              {rolling ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Rolling back...
                </>
              ) : (
                'Confirm Rollback'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
