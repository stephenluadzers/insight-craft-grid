import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Play, Edit, Trash2, Copy } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface Workflow {
  id: string;
  name: string;
  description: string | null;
  status: string;
  nodes: any;
  created_at: string;
  updated_at: string;
}

interface WorkflowListProps {
  onLoadWorkflow: (nodes: any[]) => void;
}

export const WorkflowList = ({ onLoadWorkflow }: WorkflowListProps) => {
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadWorkflows();
  }, []);

  const loadWorkflows = async () => {
    try {
      const { data, error } = await supabase
        .from('workflows')
        .select('*')
        .order('updated_at', { ascending: false });

      if (error) throw error;
      setWorkflows(data || []);
    } catch (error: any) {
      toast({
        title: "Failed to load workflows",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this workflow?")) return;

    try {
      const { error } = await supabase
        .from('workflows')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Workflow deleted",
        description: "The workflow has been deleted successfully.",
      });
      loadWorkflows();
    } catch (error: any) {
      toast({
        title: "Failed to delete workflow",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleDuplicate = async (workflow: Workflow) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data: profile } = await supabase
        .from('profiles')
        .select('default_workspace_id')
        .eq('id', user.id)
        .single();

      const { error } = await supabase
        .from('workflows')
        .insert({
          name: `${workflow.name} (Copy)`,
          description: workflow.description,
          nodes: workflow.nodes,
          workspace_id: profile?.default_workspace_id,
          created_by: user.id,
          status: 'draft',
        });

      if (error) throw error;

      toast({
        title: "Workflow duplicated",
        description: "A copy of the workflow has been created.",
      });
      loadWorkflows();
    } catch (error: any) {
      toast({
        title: "Failed to duplicate workflow",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return <div className="text-center py-8">Loading workflows...</div>;
  }

  if (workflows.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-muted-foreground">No workflows yet. Create your first workflow on the canvas!</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {workflows.map((workflow) => (
        <Card key={workflow.id} className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <CardTitle className="text-lg">{workflow.name}</CardTitle>
                <CardDescription className="mt-1">
                  {workflow.description || "No description"}
                </CardDescription>
              </div>
              <Badge variant={workflow.status === 'published' ? 'default' : 'secondary'}>
                {workflow.status}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm text-muted-foreground mb-4">
              <p>{workflow.nodes?.length || 0} nodes</p>
              <p>Updated {format(new Date(workflow.updated_at), 'MMM d, yyyy')}</p>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => onLoadWorkflow(workflow.nodes)}
              >
                <Edit className="w-4 h-4 mr-1" />
                Edit
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleDuplicate(workflow)}
              >
                <Copy className="w-4 h-4" />
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={() => handleDelete(workflow.id)}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};