import { Home, Workflow, Clock, Webhook, BookTemplate, Settings, LogOut, CreditCard, Key, FileCode, Terminal, BarChart3, GitBranch } from "lucide-react";
import { NavLink, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";

const items = [
  { title: "Workflows", url: "/", icon: Home },
  { title: "Templates", url: "/templates", icon: BookTemplate },
  { title: "Schedules", url: "/schedules", icon: Clock },
  { title: "Webhooks", url: "/webhooks", icon: Webhook },
  { title: "Versions", url: "/versions", icon: GitBranch },
  { title: "API Keys", url: "/api-keys", icon: Key },
  { title: "API Docs", url: "/api-docs", icon: FileCode },
  { title: "CLI Tool", url: "/cli", icon: Terminal },
  { title: "Analytics", url: "/analytics", icon: BarChart3 },
  { title: "Billing", url: "/billing", icon: CreditCard },
  { title: "Settings", url: "/settings", icon: Settings },
];

export function AppSidebar() {
  const { open } = useSidebar();
  const navigate = useNavigate();
  const { toast } = useToast();
  const collapsed = !open;

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast({
      title: "Signed out",
      description: "You have been signed out successfully.",
    });
    navigate("/auth");
  };

  return (
    <Sidebar className={collapsed ? "w-14" : "w-60"}>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className={collapsed ? "sr-only" : ""}>
            Workflow Automation
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink 
                      to={item.url}
                      end
                      className={({ isActive }) => 
                        isActive ? "bg-muted text-primary font-medium" : "hover:bg-muted/50"
                      }
                    >
                      <item.icon className={collapsed ? "" : "mr-2"} />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <div className="mt-auto p-4">
          <Button
            variant="ghost"
            className="w-full justify-start"
            onClick={handleLogout}
          >
            <LogOut className={collapsed ? "" : "mr-2"} />
            {!collapsed && <span>Sign Out</span>}
          </Button>
        </div>
      </SidebarContent>
    </Sidebar>
  );
}