import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { Loader2 } from "lucide-react";

interface SaveWorkflowDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (name: string, description: string) => Promise<void>;
  initialName?: string;
  initialDescription?: string;
}

export const SaveWorkflowDialog = ({ 
  open, 
  onOpenChange, 
  onSave,
  initialName = "",
  initialDescription = ""
}: SaveWorkflowDialogProps) => {
  const [name, setName] = useState(initialName);
  const [description, setDescription] = useState(initialDescription);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) return;
    
    setIsSaving(true);
    try {
      await onSave(name, description);
      onOpenChange(false);
      setName("");
      setDescription("");
    } catch (error) {
      console.error("Error saving workflow:", error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Save Workflow</DialogTitle>
          <DialogDescription>
            Give your workflow a name and description
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="workflow-name">Name</Label>
            <Input
              id="workflow-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="My Automation Workflow"
              disabled={isSaving}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="workflow-description">Description</Label>
            <Textarea
              id="workflow-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe what this workflow does..."
              disabled={isSaving}
              rows={4}
            />
          </div>
        </div>

        <DialogFooter>
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)}
            disabled={isSaving}
          >
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving || !name.trim()}>
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              "Save Workflow"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};