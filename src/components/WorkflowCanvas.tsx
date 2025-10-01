import { useState, useRef, useEffect } from "react";
import { WorkflowNode, WorkflowNodeData, NodeType } from "./WorkflowNode";
import { FloatingToolbar } from "./FloatingToolbar";
import { cn } from "@/lib/utils";

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
  const canvasRef = useRef<HTMLDivElement>(null);

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

  const handleMouseDown = (e: React.MouseEvent, nodeId: string) => {
    e.stopPropagation();
    const node = nodes.find((n) => n.id === nodeId);
    if (!node) return;

    setIsDragging(true);
    setDraggedNodeId(nodeId);
    setSelectedNodeId(nodeId);
    setDragOffset({
      x: e.clientX - node.x,
      y: e.clientY - node.y,
    });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !draggedNodeId) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left - dragOffset.x;
    const y = e.clientY - rect.top - dragOffset.y;

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
  };

  useEffect(() => {
    if (isDragging) {
      document.body.style.cursor = "grabbing";
    } else {
      document.body.style.cursor = "default";
    }
  }, [isDragging]);

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
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
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

      {/* Floating Toolbar */}
      <FloatingToolbar onAddNode={handleAddNode} />

      {/* Status Bar */}
      <div className="fixed top-4 left-1/2 -translate-x-1/2 z-40 animate-fade-in">
        <div className="px-4 py-2 rounded-full bg-card/95 backdrop-blur-xl border border-border shadow-md">
          <p className="text-xs font-medium text-muted-foreground">
            {nodes.length} {nodes.length === 1 ? "node" : "nodes"} • Click and drag to move • Click toolbar to add
          </p>
        </div>
      </div>
    </div>
  );
};
