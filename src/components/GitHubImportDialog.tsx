import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Loader2, Github } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface GitHubImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImport: (nodes: any[], name: string) => void;
}

export function GitHubImportDialog({ open, onOpenChange, onImport }: GitHubImportDialogProps) {
  const [url, setUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleImport = async () => {
    if (!url.trim()) {
      toast({
        title: "Error",
        description: "Please enter a GitHub URL",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      console.log('Importing workflow from GitHub:', url);
      
      const { data, error } = await supabase.functions.invoke('import-github-workflow', {
        body: { url }
      });

      if (error) throw error;

      if (!data?.nodes || !Array.isArray(data.nodes)) {
        throw new Error('Invalid workflow format');
      }

      toast({
        title: "Success",
        description: `Imported workflow: ${data.name || 'GitHub Workflow'}`,
      });

      onImport(data.nodes, data.name || 'Imported from GitHub');
      onOpenChange(false);
      setUrl("");
    } catch (error: any) {
      console.error('GitHub import error:', error);
      toast({
        title: "Import Failed",
        description: error.message || "Failed to import workflow from GitHub",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Github className="h-5 w-5" />
            Import from GitHub
          </DialogTitle>
          <DialogDescription>
            Enter the URL to a workflow.json file or GitHub repository containing a workflow
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="github-url">GitHub URL</Label>
            <Input
              id="github-url"
              placeholder="https://github.com/user/repo/blob/main/workflow.json"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !isLoading && handleImport()}
            />
            <p className="text-xs text-muted-foreground">
              Supports: raw file URLs, blob URLs, or repo URLs (will look for workflow.json)
            </p>
          </div>

          <Button 
            onClick={handleImport} 
            disabled={isLoading || !url.trim()}
            className="w-full"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Importing...
              </>
            ) : (
              <>
                <Github className="mr-2 h-4 w-4" />
                Import Workflow
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
