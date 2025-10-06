import { WorkflowCanvas } from "@/components/WorkflowCanvas";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { useState } from "react";
import { FloatingToolbar } from "@/components/FloatingToolbar";
import { WorkflowNodeData } from "@/components/WorkflowNode";

const Index = (): JSX.Element => {
  const [toolbarCallbacks, setToolbarCallbacks] = useState<{
    onAddNode?: (type: any) => void;
    workflow?: any;
    onOptimized?: (nodes: WorkflowNodeData[]) => void;
    onOpenAIGenerator?: () => void;
    onSave?: () => void;
  }>({});

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        
        <div className="flex-1 flex flex-col">
          <header className="h-14 flex items-center border-b bg-background px-4 gap-4">
            <SidebarTrigger />
            <h1 className="font-semibold">Workflow Automation Platform</h1>
            {toolbarCallbacks.onAddNode && (
              <FloatingToolbar 
                onAddNode={toolbarCallbacks.onAddNode}
                workflow={toolbarCallbacks.workflow || { nodes: [] }}
                onOptimized={toolbarCallbacks.onOptimized || (() => {})}
                onOpenAIGenerator={toolbarCallbacks.onOpenAIGenerator || (() => {})}
                onSave={toolbarCallbacks.onSave || (() => {})}
              />
            )}
          </header>

          <main className="flex-1 overflow-hidden">
            <WorkflowCanvas onToolbarReady={setToolbarCallbacks} />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default Index;
