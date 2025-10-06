import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { WorkflowNodeData } from "./WorkflowNode";

interface NodeConfigDialogProps {
  node: WorkflowNodeData | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (node: WorkflowNodeData) => void;
}

export const NodeConfigDialog = ({ node, open, onOpenChange, onSave }: NodeConfigDialogProps) => {
  const [title, setTitle] = useState(node?.title || "");
  const [description, setDescription] = useState(node?.description || "");
  const [config, setConfig] = useState(JSON.stringify(node?.config || {}, null, 2));

  const handleSave = () => {
    if (!node) return;
    
    try {
      const parsedConfig = JSON.parse(config);
      onSave({
        ...node,
        title,
        description,
        config: parsedConfig,
      });
      onOpenChange(false);
    } catch (error) {
      alert("Invalid JSON configuration");
    }
  };

  if (!node) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Configure Node</DialogTitle>
          <DialogDescription>
            Update the node's title, description, and configuration
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter node title"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Input
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Enter node description"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="config">Configuration (JSON)</Label>
            <Textarea
              id="config"
              value={config}
              onChange={(e) => setConfig(e.target.value)}
              placeholder='{"key": "value"}'
              className="font-mono text-sm"
              rows={10}
            />
            <p className="text-xs text-muted-foreground">
              Example for action node: {`{"url": "https://api.example.com", "method": "POST"}`}
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave}>Save Changes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};