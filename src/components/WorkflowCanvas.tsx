import { useState, useRef, useEffect } from "react";
import { WorkflowNode, WorkflowNodeData, NodeType } from "./WorkflowNode";
import { FloatingToolbar } from "./FloatingToolbar";
import { ExecutionPanel } from "./ExecutionPanel";
import { SaveWorkflowDialog } from "./SaveWorkflowDialog";
import { NodeConfigDialog } from "./NodeConfigDialog";
import { WorkflowGenerationDialog } from "./WorkflowGenerationDialog";
import { cn } from "@/lib/utils";
import { Trash2, Settings } from "lucide-react";
import { Button } from "./ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { SidebarTrigger } from "./ui/sidebar";

interface WorkflowCanvasProps {
  initialNodes?: WorkflowNodeData[];
}

export const WorkflowCanvas = ({ initialNodes = [] }: WorkflowCanvasProps) => {
  const defaultNodes: WorkflowNodeData[] = [
    {
      id: "1",
      type: "trigger" as const,
      title: "Form Submitted",
      description: "Triggered when a user submits the contact form",
      x: 100,
      y: 100,
    },
    {
      id: "2",
      type: "ai" as const,
      title: "AI Analysis",
      description: "Analyze form content for sentiment and priority",
      x: 100,
      y: 280,
    },
    {
      id: "3",
      type: "action" as const,
      title: "Send Email",
      description: "Notify team via email with AI insights",
      x: 100,
      y: 460,
    },
  ];

  const [nodes, setNodes] = useState<WorkflowNodeData[]>(
    initialNodes.length > 0 ? initialNodes : defaultNodes
  );

  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [draggedNodeId, setDraggedNodeId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [isExecuting, setIsExecuting] = useState(false);
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  const [currentWorkflowId, setCurrentWorkflowId] = useState<string | null>(null);
  const [currentWorkflowName, setCurrentWorkflowName] = useState<string>("Untitled Workflow");
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [showNodeConfig, setShowNodeConfig] = useState(false);
  const [showTextGeneration, setShowTextGeneration] = useState(false);
  const [configuredNode, setConfiguredNode] = useState<WorkflowNodeData | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const nodesContainerRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    // Get user's default workspace
    const fetchWorkspace = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('default_workspace_id')
          .eq('id', user.id)
          .single();
        
        if (profile?.default_workspace_id) {
          setWorkspaceId(profile.default_workspace_id);
        }
      }
    };
    fetchWorkspace();
  }, []);

  const handleExecuteWorkflow = async () => {
    if (nodes.length === 0) {
      toast({
        title: "No workflow to execute",
        description: "Add some nodes first",
        variant: "destructive",
      });
      return;
    }

    setIsExecuting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data, error } = await supabase.functions.invoke('execute-workflow', {
        body: {
          nodes: nodes,
          triggeredBy: user?.id,
          workspaceId: workspaceId,
        }
      });

      if (error) throw error;

      toast({
        title: "Workflow executed!",
        description: `Completed in ${data.duration}ms`,
      });
    } catch (error: any) {
      toast({
        title: "Execution failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsExecuting(false);
    }
  };

  const handleAddNode = (type: NodeType) => {
    const newNode: WorkflowNodeData = {
      id: Date.now().toString(),
      type,
      title: `New ${type.charAt(0).toUpperCase() + type.slice(1)}`,
      description: `Configure your ${type} node`,
      x: Math.random() * 300 + 100,
      y: Math.random() * 300 + 100,
    };
    setNodes([...nodes, newNode]);
  };

  const handleWorkflowGenerated = (generatedNodes: WorkflowNodeData[]): void => {
    // Position nodes in visible area, accounting for toolbar at bottom
    // Center horizontally in viewport, start from top with spacing
    const viewportWidth = window.innerWidth;
    const startX = Math.max(100, (viewportWidth - 280) / 2); // Center nodes (280px node width + padding)
    const startY = 120; // Below status bar
    
    const positionedNodes = generatedNodes.map((node, idx) => ({
      ...node,
      x: node.x || startX,
      y: node.y || (startY + idx * 200), // 200px spacing between nodes
    }));
    setNodes(positionedNodes);
    setSelectedNodeId(null);
    
    // Reset pan to show the nodes
    setPanOffset({ x: 0, y: 0 });
  };

  const handleWorkflowOptimized = (optimizedNodes: WorkflowNodeData[]): void => {
    // Position new/updated nodes in visible area
    const viewportWidth = window.innerWidth;
    const startX = Math.max(100, (viewportWidth - 280) / 2);
    const startY = 120;
    
    const updatedNodes = optimizedNodes.map((node, idx) => {
      const existingNode = nodes.find(n => n.id === node.id);
      return {
        ...node,
        x: existingNode?.x || node.x || startX,
        y: existingNode?.y || node.y || (startY + idx * 200),
      };
    });
    setNodes(updatedNodes);
    setSelectedNodeId(null);
  };

  const handleDeleteNode = () => {
    if (!selectedNodeId) return;
    setNodes(nodes.filter(n => n.id !== selectedNodeId));
    setSelectedNodeId(null);
  };

  const handleConfigureNode = () => {
    if (!selectedNodeId) return;
    const node = nodes.find(n => n.id === selectedNodeId);
    if (node) {
      setConfiguredNode(node);
      setShowNodeConfig(true);
    }
  };

  const handleSaveNodeConfig = (updatedNode: WorkflowNodeData): void => {
    setNodes(nodes.map(n => n.id === updatedNode.id ? updatedNode : n));
    setConfiguredNode(null);
  };

  const handleSaveWorkflow = async (name: string, description: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const workflowData: any = {
        name,
        description,
        nodes: nodes,
        workspace_id: workspaceId,
        updated_by: user.id,
      };

      if (currentWorkflowId) {
        // Update existing
        const { error } = await supabase
          .from('workflows')
          .update(workflowData)
          .eq('id', currentWorkflowId);

        if (error) throw error;

        setCurrentWorkflowName(name);
        toast({
          title: "Workflow updated",
          description: "Your workflow has been saved successfully.",
        });
      } else {
        // Create new
        workflowData.created_by = user.id;
        workflowData.status = 'draft';

        const { data, error } = await supabase
          .from('workflows')
          .insert(workflowData)
          .select()
          .single();

        if (error) throw error;

        setCurrentWorkflowId(data.id);
        setCurrentWorkflowName(name);
        toast({
          title: "Workflow created",
          description: "Your workflow has been created successfully.",
        });
      }
    } catch (error: any) {
      toast({
        title: "Failed to save workflow",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleImportWorkflow = (importedNodes: WorkflowNodeData[]): void => {
    setNodes(importedNodes);
    setSelectedNodeId(null);
    setPanOffset({ x: 0, y: 0 });
    setShowTextGeneration(false); // Close the dialog
    toast({
      title: "Workflow Loaded",
      description: "All node configurations have been restored",
    });
  };

  const handleMouseDown = (e: React.MouseEvent, nodeId: string) => {
    e.stopPropagation();
    const node = nodes.find((n) => n.id === nodeId);
    if (!node) return;

    setIsDragging(true);
    setDraggedNodeId(nodeId);
    setSelectedNodeId(nodeId);
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    
    setDragOffset({
      x: e.clientX - rect.left - node.x - panOffset.x,
      y: e.clientY - rect.top - node.y - panOffset.y,
    });
  };

  const handleTouchStart = (e: React.TouchEvent, nodeId: string) => {
    e.stopPropagation();
    const node = nodes.find((n) => n.id === nodeId);
    if (!node) return;

    setIsDragging(true);
    setDraggedNodeId(nodeId);
    setSelectedNodeId(nodeId);
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const touch = e.touches[0];
    
    setDragOffset({
      x: touch.clientX - rect.left - node.x - panOffset.x,
      y: touch.clientY - rect.top - node.y - panOffset.y,
    });
  };

  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    if (e.target === canvasRef.current || e.target === nodesContainerRef.current) {
      setIsPanning(true);
      setPanStart({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y });
      setSelectedNodeId(null);
    }
  };

  const handleCanvasTouchStart = (e: React.TouchEvent) => {
    if (e.target === canvasRef.current || e.target === nodesContainerRef.current) {
      const touch = e.touches[0];
      setIsPanning(true);
      setPanStart({ x: touch.clientX - panOffset.x, y: touch.clientY - panOffset.y });
      setSelectedNodeId(null);
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isPanning) {
      setPanOffset({
        x: e.clientX - panStart.x,
        y: e.clientY - panStart.y,
      });
      return;
    }

    if (!isDragging || !draggedNodeId) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left - dragOffset.x - panOffset.x;
    const y = e.clientY - rect.top - dragOffset.y - panOffset.y;

    setNodes(
      nodes.map((node) =>
        node.id === draggedNodeId
          ? { ...node, x: Math.max(0, x), y: Math.max(0, y) }
          : node
      )
    );
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    
    if (isPanning) {
      setPanOffset({
        x: touch.clientX - panStart.x,
        y: touch.clientY - panStart.y,
      });
      return;
    }

    if (!isDragging || !draggedNodeId) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = touch.clientX - rect.left - dragOffset.x - panOffset.x;
    const y = touch.clientY - rect.top - dragOffset.y - panOffset.y;

    setNodes(
      nodes.map((node) =>
        node.id === draggedNodeId
          ? { ...node, x: Math.max(0, x), y: Math.max(0, y) }
          : node
      )
    );
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    setDraggedNodeId(null);
    setIsPanning(false);
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
    setDraggedNodeId(null);
    setIsPanning(false);
  };

  useEffect(() => {
    if (isDragging) {
      document.body.style.cursor = "grabbing";
    } else if (isPanning) {
      document.body.style.cursor = "grab";
    } else {
      document.body.style.cursor = "default";
    }
  }, [isDragging, isPanning]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.key === "Delete" || e.key === "Backspace") && selectedNodeId) {
        handleDeleteNode();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedNodeId]);

  return (
    <>
      {/* Header integrated into canvas */}
      <header className="h-14 flex items-center border-b bg-background px-4 gap-4 relative z-50">
        <SidebarTrigger />
        <h1 className="font-semibold">FlowFuse</h1>
        
        {/* Node count and execution controls */}
        <div className="ml-auto flex items-center gap-3">
          <p className="text-xs font-medium text-muted-foreground">
            {nodes.length} {nodes.length === 1 ? "node" : "nodes"}
          </p>
          <div className="h-4 w-px bg-border" />
          <ExecutionPanel
            workspaceId={workspaceId || undefined}
            workflowId={currentWorkflowId || undefined}
            onExecute={handleExecuteWorkflow}
            isExecuting={isExecuting}
          />
        </div>
      </header>

      <div className="relative w-full h-[calc(100vh-3.5rem)] bg-canvas-background overflow-hidden">
      {/* Grid Background */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: `
            radial-gradient(circle, hsl(var(--canvas-grid)) 1px, transparent 1px),
            radial-gradient(circle, hsl(var(--canvas-grid)) 1px, transparent 1px)
          `,
          backgroundSize: "40px 40px",
          backgroundPosition: "0 0, 20px 20px",
        }}
      />

      {/* Canvas */}
      <div
        ref={canvasRef}
        className="relative w-full h-full touch-none workflow-canvas"
        onMouseDown={handleCanvasMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchStart={handleCanvasTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{ cursor: isPanning ? "grabbing" : "default" }}
      >
        {/* Nodes Container with pan transform */}
        <div
          ref={nodesContainerRef}
          style={{
            transform: `translate(${panOffset.x}px, ${panOffset.y}px)`,
            position: "absolute",
            inset: 0,
          }}
        >
          {/* Connection Lines */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 1 }}>
            {nodes.map((node, index) => {
              if (index === nodes.length - 1) return null;
              const nextNode = nodes[index + 1];
              
              // Debug log to verify line data
              console.log('Drawing line from', node.id, 'to', nextNode.id, {
                from: { x: node.x + 128, y: node.y + 60 },
                to: { x: nextNode.x + 128, y: nextNode.y }
              });
              
              return (
                <line
                  key={`line-${node.id}`}
                  x1={node.x + 128}
                  y1={node.y + 60}
                  x2={nextNode.x + 128}
                  y2={nextNode.y}
                  stroke="hsl(var(--connection-line))"
                  strokeWidth="2"
                  strokeDasharray="5,5"
                  className="animate-pulse"
                  opacity="1"
                />
              );
            })}
          </svg>

          {/* Nodes */}
          {nodes.map((node) => (
            <div
              key={node.id}
              onMouseDown={(e) => handleMouseDown(e, node.id)}
              onTouchStart={(e) => handleTouchStart(e, node.id)}
              className="group touch-none"
              style={{ position: 'relative', zIndex: 10 }}
            >
              <WorkflowNode
                data={node}
                isSelected={selectedNodeId === node.id}
                onSelect={() => setSelectedNodeId(node.id)}
                isDragging={isDragging && draggedNodeId === node.id}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Floating Toolbar */}
      <FloatingToolbar 
        onAddNode={handleAddNode} 
        workflow={{ nodes }}
        onOptimized={handleWorkflowOptimized}
        onOpenAIGenerator={() => setShowTextGeneration(true)}
        onSave={() => setShowSaveDialog(true)}
      />

      {/* Action Buttons for Selected Node */}
      {selectedNodeId && (
        <div className="fixed top-20 right-6 z-40 animate-fade-in flex gap-2">
          <Button
            onClick={handleConfigureNode}
            variant="outline"
            size="sm"
            className="flex items-center gap-2"
          >
            <Settings className="w-4 h-4" />
            Configure
          </Button>
          <Button
            onClick={handleDeleteNode}
            variant="destructive"
            size="sm"
            className="flex items-center gap-2"
          >
            <Trash2 className="w-4 h-4" />
            Delete
          </Button>
        </div>
      )}

      {/* Dialogs */}
      <SaveWorkflowDialog
        open={showSaveDialog}
        onOpenChange={setShowSaveDialog}
        onSave={handleSaveWorkflow}
      />
      
      <NodeConfigDialog
        node={configuredNode}
        open={showNodeConfig}
        onOpenChange={setShowNodeConfig}
        onSave={handleSaveNodeConfig}
      />

      <WorkflowGenerationDialog
        open={showTextGeneration}
        onOpenChange={setShowTextGeneration}
        onWorkflowGenerated={handleWorkflowGenerated}
        nodes={nodes}
        workflowName={currentWorkflowName}
      />
    </div>
    </>
  );
};
