import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { WorkflowNodeData } from "./WorkflowNode";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { GuardrailConfigPanel } from "./GuardrailConfigPanel";

const nodeConfigSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(100, "Title must be less than 100 characters"),
  description: z.string().trim().max(500, "Description must be less than 500 characters"),
  config: z.record(z.unknown()),
});

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
  const [errors, setErrors] = useState<Record<string, string>>({});
  const { toast } = useToast();

  const handleSave = () => {
    if (!node) return;
    
    setErrors({});
    
    try {
      const parsedConfig = JSON.parse(config);
      
      // Validate the size of the configuration
      const configSize = new Blob([config]).size;
      if (configSize > 100000) { // 100KB limit
        throw new Error("Configuration too large (max 100KB)");
      }
      
      // Validate input
      const validation = nodeConfigSchema.safeParse({
        title,
        description,
        config: parsedConfig,
      });
      
      if (!validation.success) {
        const fieldErrors: Record<string, string> = {};
        validation.error.errors.forEach((err) => {
          if (err.path[0]) {
            fieldErrors[err.path[0] as string] = err.message;
          }
        });
        setErrors(fieldErrors);
        toast({
          title: "Validation Error",
          description: "Please check the form for errors",
          variant: "destructive",
        });
        return;
      }
      
      onSave({
        ...node,
        title: validation.data.title,
        description: validation.data.description,
        config: validation.data.config,
      });
      onOpenChange(false);
    } catch (error: any) {
      if (error instanceof SyntaxError) {
        setErrors({ config: "Invalid JSON format" });
        toast({
          title: "Invalid Configuration",
          description: "The configuration must be valid JSON",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error",
          description: error.message || "Failed to save configuration",
          variant: "destructive",
        });
      }
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
              maxLength={100}
            />
            {errors.title && <p className="text-xs text-destructive">{errors.title}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Input
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Enter node description"
              maxLength={500}
            />
            {errors.description && <p className="text-xs text-destructive">{errors.description}</p>}
          </div>

          {node.type === 'guardrail' ? (
            <GuardrailConfigPanel
              config={JSON.parse(config)}
              onChange={(newConfig) => setConfig(JSON.stringify(newConfig, null, 2))}
            />
          ) : (
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
              {errors.config && <p className="text-xs text-destructive">{errors.config}</p>}
              <p className="text-xs text-muted-foreground">
                Example for action node: {`{"url": "https://api.example.com", "method": "POST"}`}
              </p>
            </div>
          )}
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