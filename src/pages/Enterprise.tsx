import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { EnterpriseAdminPanel } from "@/components/EnterpriseAdminPanel";
import { ApprovalWorkflowPanel } from "@/components/ApprovalWorkflowPanel";
import { SLAMonitoringDashboard } from "@/components/SLAMonitoringDashboard";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function Enterprise() {
  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <AppSidebar />
        <main className="flex-1 p-6">
          <Tabs defaultValue="admin" className="space-y-6">
            <TabsList>
              <TabsTrigger value="admin">Admin Panel</TabsTrigger>
              <TabsTrigger value="approvals">Approvals</TabsTrigger>
              <TabsTrigger value="sla">SLA Monitoring</TabsTrigger>
            </TabsList>

            <TabsContent value="admin">
              <EnterpriseAdminPanel workspaceId="default" />
            </TabsContent>

            <TabsContent value="approvals">
              <ApprovalWorkflowPanel />
            </TabsContent>

            <TabsContent value="sla">
              <SLAMonitoringDashboard />
            </TabsContent>
          </Tabs>
        </main>
      </div>
    </SidebarProvider>
  );
}
