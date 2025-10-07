import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";

interface Workflow {
  id: string;
  name: string;
}

interface CreateWebhookDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onWebhookCreated: () => void;
}

export function CreateWebhookDialog({
  open,
  onOpenChange,
  onWebhookCreated,
}: CreateWebhookDialogProps) {
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [selectedWorkflow, setSelectedWorkflow] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [loadingWorkflows, setLoadingWorkflows] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      loadWorkflows();
    }
  }, [open]);

  const loadWorkflows = async () => {
    try {
      setLoadingWorkflows(true);
      const { data, error } = await supabase
        .from("workflows")
        .select("id, name")
        .eq("status", "published")
        .order("name");

      if (error) throw error;
      setWorkflows(data || []);
    } catch (error: any) {
      toast({
        title: "Error loading workflows",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoadingWorkflows(false);
    }
  };

  const handleCreate = async () => {
    if (!selectedWorkflow) {
      toast({
        title: "Please select a workflow",
        variant: "destructive",
      });
      return;
    }

    try {
      setLoading(true);
      
      // Generate a unique webhook key
      const webhookKey = crypto.randomUUID();

      const { error } = await supabase
        .from("workflow_webhooks")
        .insert({
          workflow_id: selectedWorkflow,
          webhook_key: webhookKey,
          enabled: true,
        });

      if (error) throw error;

      toast({
        title: "Webhook created",
        description: "Your webhook has been created successfully.",
      });

      onWebhookCreated();
      onOpenChange(false);
      setSelectedWorkflow("");
    } catch (error: any) {
      toast({
        title: "Error creating webhook",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Webhook</DialogTitle>
          <DialogDescription>
            Select a workflow to create a webhook trigger for it.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="workflow">Workflow</Label>
            {loadingWorkflows ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : workflows.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No published workflows found. Please publish a workflow first.
              </p>
            ) : (
              <Select value={selectedWorkflow} onValueChange={setSelectedWorkflow}>
                <SelectTrigger id="workflow">
                  <SelectValue placeholder="Select a workflow" />
                </SelectTrigger>
                <SelectContent>
                  {workflows.map((workflow) => (
                    <SelectItem key={workflow.id} value={workflow.id}>
                      {workflow.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleCreate} disabled={loading || !selectedWorkflow}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : (
              "Create Webhook"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
