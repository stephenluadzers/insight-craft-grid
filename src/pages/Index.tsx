import { WorkflowCanvas } from "@/components/WorkflowCanvas";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";

const Index = (): JSX.Element => {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        
        <div className="flex-1 flex flex-col">
          <WorkflowCanvas />
        </div>
      </div>
    </SidebarProvider>
  );
};

export default Index;
