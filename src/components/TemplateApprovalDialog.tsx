import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface TemplateApprovalDialogProps {
  isOpen: boolean;
  onClose: () => void;
  templateId: string;
  templateName: string;
  currentStatus: string;
  onStatusChanged: () => void;
}

export const TemplateApprovalDialog = ({
  isOpen,
  onClose,
  templateId,
  templateName,
  currentStatus,
  onStatusChanged,
}: TemplateApprovalDialogProps) => {
  const [reason, setReason] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleApprove = async () => {
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from('workflow_templates')
        .update({
          approval_status: 'approved',
          approved_by: user.id,
          approved_at: new Date().toISOString(),
        })
        .eq('id', templateId);

      if (error) throw error;

      toast({
        title: "Template approved",
        description: "The template is now available for public use.",
      });
      onStatusChanged();
      onClose();
    } catch (error: any) {
      toast({
        title: "Failed to approve template",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleReject = async () => {
    if (!reason.trim()) {
      toast({
        title: "Rejection reason required",
        description: "Please provide a reason for rejection.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('workflow_templates')
        .update({
          approval_status: 'rejected',
          rejection_reason: reason,
        })
        .eq('id', templateId);

      if (error) throw error;

      toast({
        title: "Template rejected",
        description: "The creator will be notified of the rejection.",
      });
      onStatusChanged();
      onClose();
    } catch (error: any) {
      toast({
        title: "Failed to reject template",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRequestChanges = async () => {
    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('workflow_templates')
        .update({
          approval_status: 'draft',
          rejection_reason: reason || 'Changes requested',
        })
        .eq('id', templateId);

      if (error) throw error;

      toast({
        title: "Changes requested",
        description: "The template has been sent back for revisions.",
      });
      onStatusChanged();
      onClose();
    } catch (error: any) {
      toast({
        title: "Failed to request changes",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Review Template: {templateName}</DialogTitle>
          <DialogDescription>
            Current status: <span className="font-semibold">{currentStatus}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="reason">Notes / Rejection Reason (optional)</Label>
            <Textarea
              id="reason"
              placeholder="Provide feedback or reason for rejection..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={4}
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            variant="secondary"
            onClick={handleRequestChanges}
            disabled={isLoading}
          >
            Request Changes
          </Button>
          <Button
            variant="destructive"
            onClick={handleReject}
            disabled={isLoading}
          >
            Reject
          </Button>
          <Button
            onClick={handleApprove}
            disabled={isLoading}
          >
            Approve
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
