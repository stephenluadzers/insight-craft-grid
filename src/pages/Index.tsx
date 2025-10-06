import { WorkflowCanvas } from "@/components/WorkflowCanvas";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { Routes, Route } from "react-router-dom";
import Templates from "./Templates";
import { WorkflowList } from "@/components/WorkflowList";
import { WorkflowNodeData } from "@/components/WorkflowNode";
import { useState } from "react";

const Index = () => {
  const [loadedNodes, setLoadedNodes] = useState<WorkflowNodeData[] | null>(null);

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        
        <div className="flex-1 flex flex-col">
          {/* Header with trigger */}
          <header className="h-12 flex items-center border-b bg-background px-4">
            <SidebarTrigger />
            <h1 className="ml-4 font-semibold">Workflow Automation Platform</h1>
          </header>

          {/* Main content */}
          <main className="flex-1 overflow-hidden">
            <Routes>
              <Route path="/" element={
                <div className="h-full">
                  {/* Show workflow list in a drawer or just the canvas */}
                  <WorkflowCanvas key={loadedNodes ? JSON.stringify(loadedNodes) : 'empty'} initialNodes={loadedNodes || undefined} />
                </div>
              } />
              <Route path="/templates" element={<Templates />} />
              <Route path="*" element={
                <div className="h-full">
                  <WorkflowCanvas />
                </div>
              } />
            </Routes>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default Index;
