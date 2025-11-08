import { useState, useRef, useEffect, useImperativeHandle, forwardRef } from "react";
import { WorkflowNode, WorkflowNodeData, NodeType } from "./WorkflowNode";
import { ExecutionPanel } from "./ExecutionPanel";
import { SaveWorkflowDialog } from "./SaveWorkflowDialog";
import { NodeConfigDialog } from "./NodeConfigDialog";
import { WorkflowGenerationDialog } from "./WorkflowGenerationDialog";
import { WorkflowValidationDialog } from "./WorkflowValidationDialog";
import { ExecutionErrorDialog } from "./ExecutionErrorDialog";
import { IntegrationSetupDialog } from "./IntegrationSetupDialog";
import { cn } from "@/lib/utils";
import { Trash2, Settings } from "lucide-react";
import { Button } from "./ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { SidebarTrigger } from "./ui/sidebar";
import { validateWorkflow, ValidationResult } from "@/lib/workflowValidation";
import { useWorkflowPersistence } from "@/hooks/useWorkflowPersistence";

interface WorkflowCanvasProps {
  initialNodes?: WorkflowNodeData[];
  onWorkflowChange?: (workflow: { nodes: WorkflowNodeData[] }) => void;
  onOptimizingChange?: (isOptimizing: boolean) => void;
}

export const WorkflowCanvas = forwardRef<any, WorkflowCanvasProps>(({ initialNodes = [], onWorkflowChange, onOptimizingChange }, ref) => {
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
  const [showValidationDialog, setShowValidationDialog] = useState(false);
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [showErrorDialog, setShowErrorDialog] = useState(false);
  const [executionError, setExecutionError] = useState<{
    nodeTitle: string;
    nodeType: string;
    errorMessage: string;
    fullLog?: string;
  } | null>(null);
  const [showIntegrationSetup, setShowIntegrationSetup] = useState(false);
  const [requiredIntegrations, setRequiredIntegrations] = useState<any[]>([]);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const canvasRef = useRef<HTMLDivElement>(null);
  const nodesContainerRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  // Workflow persistence
  const { saveWorkflow } = useWorkflowPersistence({
    workflowId: currentWorkflowId || undefined,
    nodes,
    workflowName: currentWorkflowName,
    onWorkflowLoaded: (loadedNodes, loadedId) => {
      setNodes(loadedNodes);
      setCurrentWorkflowId(loadedId);
    }
  });

  // Notify parent of workflow changes
  useEffect(() => {
    console.log('📊 Workflow changed, notifying parent. Nodes:', nodes.length);
    onWorkflowChange?.({ nodes });
  }, [nodes, onWorkflowChange]);

  // Notify parent of optimization state changes
  useEffect(() => {
    console.log('⚙️ Optimization state changed:', isOptimizing);
    onOptimizingChange?.(isOptimizing);
  }, [isOptimizing, onOptimizingChange]);

  const handleGitHubImport = (importedNodes: WorkflowNodeData[], name: string) => {
    console.log('📥 Importing workflow from GitHub:', name, importedNodes.length, 'nodes');
    setNodes(importedNodes);
    toast({
      title: "Workflow Imported",
      description: `${name} loaded with ${importedNodes.length} nodes`,
    });
  };

  // Expose methods to parent via ref
  useImperativeHandle(ref, () => ({
    handleAddNode,
    workflow: { nodes },
    handleWorkflowOptimized,
    handleOpenAIGenerator: () => setShowTextGeneration(true),
    handleSave: saveWorkflow,
    handleGitHubImport,
    isOptimizing,
    loadWorkflow: (loadedNodes: WorkflowNodeData[]) => {
      setNodes(loadedNodes);
      toast({
        title: "Workflow Loaded",
        description: `Loaded ${loadedNodes.length} nodes`,
      });
    },
    handleOptimize: async () => {
      console.log('🚀 AI Optimize button clicked');
      
      if (!nodes?.length) {
        console.warn('⚠️ No nodes to optimize');
        toast({
          title: "No workflow",
          description: "Create some nodes first to optimize",
          variant: "destructive",
        });
        return;
      }

      console.log(`📊 Optimizing ${nodes.length} nodes...`);
      setIsOptimizing(true);
      
      try {
        console.log('📡 Calling optimize-workflow edge function with', nodes.length, 'nodes');
        console.log('🔍 Workflow data:', JSON.stringify({ nodes }, null, 2));

        const { data, error } = await supabase.functions.invoke('optimize-workflow', {
          body: { 
            workflow: { nodes },
            userContext: "General workflow automation"
          }
        });
        
        console.log('📨 Raw edge function response:', JSON.stringify({ data, error }, null, 2));

        console.log('✅ Edge function response:', { data, error });

        if (error) {
          console.error('❌ Edge function error:', error);
          throw new Error(error.message || 'Failed to call optimization service');
        }

        if (data?.error) {
          console.error('❌ AI error:', data.error);
          throw new Error(data.error);
        }

        if (data?.optimizedWorkflow?.nodes) {
          console.log('✨ Optimization successful! New nodes:', data.optimizedWorkflow.nodes.length);
          handleWorkflowOptimized(data.optimizedWorkflow.nodes);
          toast({
            title: "Workflow Optimized!",
            description: data.optimizedWorkflow.insights || "AI Genius enhanced your workflow",
          });
          
          if (data.suggestions && data.suggestions.length > 0) {
            console.log('💡 Suggestions:', data.suggestions);
            setTimeout(() => {
              toast({
                title: "Optimization Suggestions",
                description: `${data.suggestions.length} improvements identified`,
              });
            }, 1500);
          }
        } else {
          console.warn('⚠️ No optimized workflow in response');
          throw new Error('No optimized workflow returned from AI');
        }
      } catch (error: any) {
        console.error('💥 Optimization failed:', error);
        console.error('📍 Error stack:', error.stack);
        toast({
          title: "Optimization Failed",
          description: error.message || "Unknown error occurred. Check browser console.",
          variant: "destructive",
        });
      } finally {
        setIsOptimizing(false);
        console.log('🏁 Optimization complete, isOptimizing set to false');
      }
    },
    handleDownload: async () => {
      console.log('⬇️ Download workflow package');
      try {
        const { exportWorkflowForBusiness } = await import('@/lib/workflowExport');
        const blob = await exportWorkflowForBusiness(nodes, currentWorkflowName, {
          platform: 'supabase-function',
          includeDocs: true,
          includeTests: false,
        });
        
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${currentWorkflowName.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_complete_export.zip`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        toast({
          title: "Package Downloaded!",
          description: "Workflow package with ROI analysis ready",
        });
      } catch (error: any) {
        console.error('Download failed:', error);
        toast({
          title: "Download Failed",
          description: error.message,
          variant: "destructive",
        });
      }
    }
  }));

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

    if (!workspaceId) {
      toast({
        title: "Workspace not found",
        description: "Please ensure you have a workspace set up",
        variant: "destructive",
      });
      return;
    }

    // Run validation check first
    const validation = validateWorkflow(nodes);
    setValidationResult(validation);

    if (!validation.isValid) {
      setShowValidationDialog(true);
      return;
    }

    // Security scan before execution
    const { scanWorkflowSecurity } = await import("@/lib/securityScanner");
    const securityScan = scanWorkflowSecurity(nodes);
    
    if (securityScan.risk_level === 'critical') {
      toast({
        title: "Critical Security Risk",
        description: "This workflow contains critical security vulnerabilities and cannot be executed.",
        variant: "destructive",
      });
      return;
    }

    if (securityScan.risk_level === 'high') {
      toast({
        title: "High Security Risk",
        description: "This workflow contains high security risks. Please review or request admin approval.",
        variant: "destructive",
      });
      return;
    }

    if (securityScan.risk_level === 'medium') {
      toast({
        title: "Medium Security Risk",
        description: `${securityScan.issues.length} security issue(s) detected. Proceeding with caution.`,
      });
    }

    // Execute directly if valid and safe
    executeWorkflow();
  };

  const executeWorkflow = async () => {
    setIsExecuting(true);
    setShowValidationDialog(false);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data, error } = await supabase.functions.invoke('execute-workflow', {
        body: {
          nodes: nodes,
          triggeredBy: user?.id,
          workspaceId: workspaceId,
          workflowId: currentWorkflowId,
        }
      });

      if (error) throw error;

      if (data.status === 'failed') {
        // Show detailed error dialog
        const failedNode = nodes.find(n => n.id === data.failedNodeId);
        setExecutionError({
          nodeTitle: failedNode?.title || 'Unknown Node',
          nodeType: failedNode?.type || 'unknown',
          errorMessage: data.error || 'Unknown error occurred',
          fullLog: JSON.stringify(data.executionData, null, 2),
        });
        setShowErrorDialog(true);
      } else {
        toast({
          title: "Workflow executed!",
          description: `Completed in ${data.duration}ms`,
        });
      }
    } catch (error: any) {
      // Network or other errors
      setExecutionError({
        nodeTitle: 'Execution Error',
        nodeType: 'system',
        errorMessage: error.message || 'Failed to execute workflow',
        fullLog: error.stack,
      });
      setShowErrorDialog(true);
    } finally {
      setIsExecuting(false);
    }
  };

  const handleAddNode = (type: NodeType, title?: string, config?: any) => {
    const newNode: WorkflowNodeData = {
      id: Date.now().toString(),
      type,
      title: title || `New ${type.charAt(0).toUpperCase() + type.slice(1)}`,
      description: `Configure your ${type} node`,
      x: Math.random() * 300 + 100,
      y: Math.random() * 300 + 100,
      config: config || {},
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
    
    // Clear current workflow ID to force "Save As New" for optimized workflow
    setCurrentWorkflowId(null);
    // Append "-optimized" to the name to differentiate
    if (currentWorkflowName) {
      setCurrentWorkflowName(currentWorkflowName + " (Optimized)");
    }
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
        initialName={currentWorkflowName}
        nodes={nodes}
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

      <WorkflowValidationDialog
        open={showValidationDialog}
        onOpenChange={setShowValidationDialog}
        validation={validationResult}
        onRunAnyway={executeWorkflow}
        onFixIssues={() => {
          setShowValidationDialog(false);
          toast({
            title: "Fix node configurations",
            description: "Configure nodes by clicking Configure button",
          });
        }}
      />

      <ExecutionErrorDialog
        open={showErrorDialog}
        onOpenChange={setShowErrorDialog}
        error={executionError}
        onRetry={executeWorkflow}
        onReconfigure={() => {
          setShowErrorDialog(false);
          if (executionError) {
            const failedNode = nodes.find(n => n.title === executionError.nodeTitle);
            if (failedNode) {
              setSelectedNodeId(failedNode.id);
              setConfiguredNode(failedNode);
              setShowNodeConfig(true);
            }
          }
        }}
      />

      <IntegrationSetupDialog
        open={showIntegrationSetup}
        onOpenChange={setShowIntegrationSetup}
        requiredIntegrations={requiredIntegrations}
        onSetupLater={() => {
          setShowIntegrationSetup(false);
          toast({
            title: "Integration setup skipped",
            description: "You can configure integrations later in Settings",
          });
        }}
      />
    </div>
    </>
  );
});
