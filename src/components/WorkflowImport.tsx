import { useRef } from "react";
import { Button } from "./ui/button";
import { Upload } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { WorkflowNodeData } from "./WorkflowNode";

interface WorkflowImportProps {
  onImport: (nodes: WorkflowNodeData[]) => void;
}

export const WorkflowImport = ({ onImport }: WorkflowImportProps): JSX.Element => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const data = JSON.parse(text);

      if (!data.nodes || !Array.isArray(data.nodes)) {
        throw new Error('Invalid workflow file format');
      }

      // Validate and restore nodes with their config
      const validatedNodes: WorkflowNodeData[] = data.nodes.map((node: any) => ({
        id: node.id || Date.now().toString(),
        type: node.type,
        title: node.title,
        description: node.description,
        x: node.x,
        y: node.y,
        config: node.config || {},
      }));

      onImport(validatedNodes);

      toast({
        title: "Workflow Imported",
        description: `Successfully loaded ${validatedNodes.length} nodes with configurations`,
      });
    } catch (error: any) {
      toast({
        title: "Import Failed",
        description: error.message,
        variant: "destructive",
      });
    }

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        onChange={handleImport}
        className="hidden"
      />
      <Button
        onClick={() => fileInputRef.current?.click()}
        variant="outline"
        size="sm"
        className="flex items-center gap-2"
      >
        <Upload className="w-4 h-4" />
        Import JSON
      </Button>
    </>
  );
};