import { useState, useRef, useEffect } from "react";
import { WorkflowNode, WorkflowNodeData, NodeType } from "./WorkflowNode";
import { FloatingToolbar } from "./FloatingToolbar";
import { AIOptimizer } from "./AIOptimizer";
import { cn } from "@/lib/utils";
import { Trash2 } from "lucide-react";
import { Button } from "./ui/button";

export const WorkflowCanvas = () => {
  const [nodes, setNodes] = useState<WorkflowNodeData[]>([
    {
      id: "1",
      type: "trigger",
      title: "Form Submitted",
      description: "Triggered when a user submits the contact form",
      x: 100,
      y: 100,
    },
    {
      id: "2",
      type: "ai",
      title: "AI Analysis",
      description: "Analyze form content for sentiment and priority",
      x: 100,
      y: 280,
    },
    {
      id: "3",
      type: "action",
      title: "Send Email",
      description: "Notify team via email with AI insights",
      x: 100,
      y: 460,
    },
  ]);

  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [draggedNodeId, setDraggedNodeId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const canvasRef = useRef<HTMLDivElement>(null);
  const nodesContainerRef = useRef<HTMLDivElement>(null);

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

  const handleWorkflowGenerated = (generatedNodes: WorkflowNodeData[]) => {
    // Position nodes in a vertical flow
    const positionedNodes = generatedNodes.map((node, idx) => ({
      ...node,
      x: node.x || 100,
      y: node.y || (100 + idx * 180),
    }));
    setNodes(positionedNodes);
    setSelectedNodeId(null);
  };

  const handleWorkflowOptimized = (optimizedNodes: WorkflowNodeData[]) => {
    // Preserve existing positions where possible
    const updatedNodes = optimizedNodes.map((node, idx) => {
      const existingNode = nodes.find(n => n.id === node.id);
      return {
        ...node,
        x: existingNode?.x || node.x || (100 + (idx % 3) * 300),
        y: existingNode?.y || node.y || (100 + Math.floor(idx / 3) * 180),
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

  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    if (e.target === canvasRef.current || e.target === nodesContainerRef.current) {
      setIsPanning(true);
      setPanStart({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y });
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

  const handleMouseUp = () => {
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
    <div className="relative w-full h-screen overflow-hidden bg-canvas-background">
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
        className="relative w-full h-full"
        onMouseDown={handleCanvasMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
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
          <svg className="absolute inset-0 w-full h-full pointer-events-none">
            {nodes.map((node, index) => {
              if (index === nodes.length - 1) return null;
              const nextNode = nodes[index + 1];
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
                />
              );
            })}
          </svg>

          {/* Nodes */}
          {nodes.map((node) => (
            <div
              key={node.id}
              onMouseDown={(e) => handleMouseDown(e, node.id)}
              className="group"
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
        onWorkflowGenerated={handleWorkflowGenerated}
      />

      {/* AI Features */}
      <AIOptimizer 
        workflow={{ nodes }} 
        onOptimized={handleWorkflowOptimized} 
      />

      {/* Delete Button for Selected Node */}
      {selectedNodeId && (
        <div className="fixed top-20 right-6 z-40 animate-fade-in">
          <Button
            onClick={handleDeleteNode}
            variant="destructive"
            size="sm"
            className="flex items-center gap-2"
          >
            <Trash2 className="w-4 h-4" />
            Delete Node
          </Button>
        </div>
      )}

      {/* Status Bar */}
      <div className="fixed top-4 left-1/2 -translate-x-1/2 z-40 animate-fade-in">
        <div className="px-4 py-2 rounded-full bg-card/95 backdrop-blur-xl border border-border shadow-md">
          <p className="text-xs font-medium text-muted-foreground">
            {nodes.length} {nodes.length === 1 ? "node" : "nodes"} • Drag canvas to pan • Drag nodes to move • Del to delete
          </p>
        </div>
      </div>
    </div>
  );
};
