import { WorkflowCanvas } from "@/components/WorkflowCanvas";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";

const Index = (): JSX.Element => {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        
        <div className="flex-1 flex flex-col">
          <header className="h-12 flex items-center border-b bg-background px-4">
            <SidebarTrigger />
            <h1 className="ml-4 font-semibold">Workflow Automation Platform</h1>
          </header>

          <main className="flex-1 overflow-hidden">
            <WorkflowCanvas />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default Index;
