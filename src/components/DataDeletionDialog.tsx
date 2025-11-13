import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { usePrivacy } from '@/contexts/PrivacyContext';
import { Trash2, AlertTriangle, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface DataDeletionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DataDeletionDialog({ open, onOpenChange }: DataDeletionDialogProps) {
  const { deleteUserData } = usePrivacy();
  const { toast } = useToast();
  const [isDeleting, setIsDeleting] = useState(false);
  const [options, setOptions] = useState({
    deleteExecutionHistory: false,
    deleteWorkflows: false,
    deleteAccount: false,
  });
  const [confirmText, setConfirmText] = useState('');

  const handleDelete = async () => {
    if (options.deleteAccount && confirmText !== 'DELETE MY ACCOUNT') {
      toast({
        title: 'Confirmation Required',
        description: 'Please type "DELETE MY ACCOUNT" to confirm account deletion',
        variant: 'destructive',
      });
      return;
    }

    if (!options.deleteExecutionHistory && !options.deleteWorkflows && !options.deleteAccount) {
      toast({
        title: 'No Selection',
        description: 'Please select at least one deletion option',
        variant: 'destructive',
      });
      return;
    }

    setIsDeleting(true);

    try {
      await deleteUserData(options);

      toast({
        title: 'Data Deletion Initiated',
        description: options.deleteAccount
          ? 'Your account deletion request has been submitted. You will receive a confirmation email within 24 hours.'
          : 'Selected data has been deleted successfully.',
      });

      onOpenChange(false);
    } catch (error) {
      toast({
        title: 'Deletion Failed',
        description: error instanceof Error ? error.message : 'An error occurred during deletion',
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const toggleOption = (key: keyof typeof options) => {
    setOptions((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <Trash2 className="w-5 h-5" />
            Delete Your Data
          </DialogTitle>
          <DialogDescription>
            Choose what data you want to delete. This action cannot be undone.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>Warning:</strong> Deleted data cannot be recovered. Please be certain before proceeding.
            </AlertDescription>
          </Alert>

          <div className="space-y-3">
            {/* Execution History */}
            <div className="flex items-start space-x-3">
              <Checkbox
                id="deleteExecutionHistory"
                checked={options.deleteExecutionHistory}
                onCheckedChange={() => toggleOption('deleteExecutionHistory')}
              />
              <div className="space-y-1">
                <Label htmlFor="deleteExecutionHistory" className="cursor-pointer font-medium">
                  Delete Execution History
                </Label>
                <p className="text-sm text-muted-foreground">
                  Remove all workflow execution logs and performance data. Your workflows will remain intact.
                </p>
              </div>
            </div>

            {/* Workflows */}
            <div className="flex items-start space-x-3">
              <Checkbox
                id="deleteWorkflows"
                checked={options.deleteWorkflows}
                onCheckedChange={() => toggleOption('deleteWorkflows')}
              />
              <div className="space-y-1">
                <Label htmlFor="deleteWorkflows" className="cursor-pointer font-medium">
                  Delete All Workflows
                </Label>
                <p className="text-sm text-muted-foreground">
                  Permanently delete all your workflows, including drafts and published workflows. Execution history
                  will also be deleted.
                </p>
              </div>
            </div>

            {/* Account */}
            <div className="flex items-start space-x-3">
              <Checkbox
                id="deleteAccount"
                checked={options.deleteAccount}
                onCheckedChange={() => toggleOption('deleteAccount')}
              />
              <div className="space-y-1">
                <Label htmlFor="deleteAccount" className="cursor-pointer font-medium text-destructive">
                  Delete Entire Account
                </Label>
                <p className="text-sm text-muted-foreground">
                  Permanently delete your account and all associated data. You will be logged out immediately and will
                  need to create a new account to use FlowFuse again.
                </p>
              </div>
            </div>
          </div>

          {options.deleteAccount && (
            <div className="space-y-2 pt-4">
              <Label htmlFor="confirmText" className="text-destructive font-semibold">
                Type "DELETE MY ACCOUNT" to confirm
              </Label>
              <input
                id="confirmText"
                type="text"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                className="w-full px-3 py-2 border border-destructive rounded-md focus:outline-none focus:ring-2 focus:ring-destructive"
                placeholder="DELETE MY ACCOUNT"
              />
            </div>
          )}

          <Alert>
            <AlertDescription className="text-xs">
              <strong>Data Retention Policy:</strong> After account deletion, your data will be removed from active
              systems within 24 hours and completely purged from backups within 30 days. You will receive
              confirmation emails at each stage.
            </AlertDescription>
          </Alert>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isDeleting}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleDelete} disabled={isDeleting}>
            {isDeleting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Deleting...
              </>
            ) : (
              <>
                <Trash2 className="mr-2 h-4 w-4" />
                Delete Selected Data
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
