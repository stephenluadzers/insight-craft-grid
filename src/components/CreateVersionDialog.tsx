import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Loader2, Save, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface CreateVersionDialogProps {
  workflowId: string;
  workspaceId: string;
  nodes: any[];
  edges: any[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onVersionCreated?: () => void;
}

export function CreateVersionDialog({
  workflowId,
  workspaceId,
  nodes,
  edges,
  open,
  onOpenChange,
  onVersionCreated,
}: CreateVersionDialogProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [changeSummary, setChangeSummary] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const handleAddTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setTags([...tags, tagInput.trim()]);
      setTagInput("");
    }
  };

  const handleRemoveTag = (tag: string) => {
    setTags(tags.filter(t => t !== tag));
  };

  const handleSave = async () => {
    if (!name.trim()) {
      toast({
        title: "Name required",
        description: "Please enter a version name",
        variant: "destructive",
      });
      return;
    }

    try {
      setSaving(true);

      const { error } = await supabase.rpc('create_workflow_version' as any, {
        p_workflow_id: workflowId,
        p_workspace_id: workspaceId,
        p_name: name.trim(),
        p_description: description.trim() || null,
        p_nodes: nodes,
        p_edges: edges,
        p_config: {},
        p_change_summary: changeSummary.trim() || null,
        p_tags: tags,
      });

      if (error) throw error;

      toast({
        title: "Version created",
        description: "Workflow version has been saved successfully.",
      });

      setName("");
      setDescription("");
      setChangeSummary("");
      setTags([]);
      onOpenChange(false);
      onVersionCreated?.();
    } catch (error: any) {
      toast({
        title: "Error creating version",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Create New Version</DialogTitle>
          <DialogDescription>
            Save the current workflow state as a new version with a description
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="name">Version Name *</Label>
            <Input
              id="name"
              placeholder="e.g., Initial release, Bug fix, Feature update"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={100}
            />
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Describe what changed in this version..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              maxLength={500}
            />
          </div>

          <div>
            <Label htmlFor="changeSummary">Change Summary</Label>
            <Textarea
              id="changeSummary"
              placeholder="Brief summary of changes (e.g., Added email notification node, Fixed timeout issue)"
              value={changeSummary}
              onChange={(e) => setChangeSummary(e.target.value)}
              rows={2}
              maxLength={200}
            />
          </div>

          <div>
            <Label htmlFor="tags">Tags</Label>
            <div className="flex gap-2 mb-2">
              <Input
                id="tags"
                placeholder="Add tag and press Enter"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddTag();
                  }
                }}
                maxLength={20}
              />
              <Button type="button" variant="secondary" onClick={handleAddTag}>
                Add
              </Button>
            </div>
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {tags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="gap-1">
                    {tag}
                    <X
                      className="h-3 w-3 cursor-pointer"
                      onClick={() => handleRemoveTag(tag)}
                    />
                  </Badge>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Create Version
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
