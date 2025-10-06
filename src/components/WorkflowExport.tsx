import { useState } from "react";
import { Button } from "./ui/button";
import { Download, FileJson, Camera } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { WorkflowNodeData } from "./WorkflowNode";
import html2canvas from "html2canvas";

interface WorkflowExportProps {
  nodes: WorkflowNodeData[];
  workflowName?: string;
}

export const WorkflowExport = ({ nodes, workflowName = "workflow" }: WorkflowExportProps): JSX.Element => {
  const [isExporting, setIsExporting] = useState(false);
  const { toast } = useToast();

  const exportToJSON = () => {
    const workflowData = {
      name: workflowName,
      version: "1.0",
      nodes: nodes.map(node => ({
        id: node.id,
        type: node.type,
        title: node.title,
        description: node.description,
        x: node.x,
        y: node.y,
        config: node.config || {},
      })),
      exportedAt: new Date().toISOString(),
    };

    const blob = new Blob([JSON.stringify(workflowData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${workflowName.replace(/\s+/g, '-').toLowerCase()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      title: "Exported to JSON",
      description: "Workflow configuration downloaded successfully",
    });
  };

  const exportScreenshot = async () => {
    setIsExporting(true);
    try {
      const canvasElement = document.querySelector('.workflow-canvas') as HTMLElement;
      if (!canvasElement) {
        throw new Error('Canvas element not found');
      }

      const canvas = await html2canvas(canvasElement, {
        backgroundColor: '#1a1a1a',
        scale: 2,
        logging: false,
      });

      canvas.toBlob((blob) => {
        if (blob) {
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `${workflowName.replace(/\s+/g, '-').toLowerCase()}-screenshot.png`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);

          toast({
            title: "Screenshot Captured",
            description: "Workflow screenshot downloaded successfully",
          });
        }
      });
    } catch (error: any) {
      toast({
        title: "Screenshot Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="flex gap-2">
      <Button
        onClick={exportToJSON}
        variant="outline"
        size="sm"
        className="flex items-center gap-2"
      >
        <FileJson className="w-4 h-4" />
        Export JSON
      </Button>
      <Button
        onClick={exportScreenshot}
        variant="outline"
        size="sm"
        disabled={isExporting}
        className="flex items-center gap-2"
      >
        <Camera className="w-4 h-4" />
        {isExporting ? "Capturing..." : "Screenshot"}
      </Button>
    </div>
  );
};