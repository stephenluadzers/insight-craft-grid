import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { User, Bell, Shield, Loader2, Key, History, Activity, Building2, TrendingUp, AlertTriangle, ShieldCheck, Container, FileText, Brain, Cpu, Network, Sparkles, GitBranch, Zap } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { CredentialsManager } from "@/components/CredentialsManager";
import { ExecutionHistoryPanel } from "@/components/ExecutionHistoryPanel";
import { EnhancedExecutionTimeline } from "@/components/EnhancedExecutionTimeline";
import { ActivityFeed } from "@/components/ActivityFeed";
import { EnterpriseReadinessGuide } from "@/components/EnterpriseReadinessGuide";
import { PerformanceMonitor } from "@/components/PerformanceMonitor";
import { DeadLetterQueuePanel } from "@/components/DeadLetterQueuePanel";
import { CircuitBreakerStatus } from "@/components/CircuitBreakerStatus";
import { ErrorAggregationDashboard } from "@/components/ErrorAggregationDashboard";
import { SecurityMonitoringDashboard } from "@/components/SecurityMonitoringDashboard";
import { SSOConfigurationPanel } from "@/components/SSOConfigurationPanel";
import { MigrationReportDashboard } from "@/components/MigrationReportDashboard";
import { TaskRunnerConfiguration } from "@/components/TaskRunnerConfiguration";
import { RAGAgentNodes } from "@/components/RAGAgentNodes";
import { CrossWorkflowIntelligence } from "@/components/CrossWorkflowIntelligence";
import { RecommendationsEngine } from "@/components/RecommendationsEngine";

export default function Settings(): JSX.Element {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  const [profile, setProfile] = useState({
    full_name: "",
    email: "",
  });
  const [notifications, setNotifications] = useState({
    email_notifications: true,
    workflow_updates: true,
  });
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth");
        return;
      }

      setProfile({
        full_name: user.user_metadata?.full_name || "",
        email: user.email || "",
      });

      // Get default workspace
      const { data: profileData } = await supabase
        .from("profiles")
        .select("default_workspace_id")
        .eq("id", user.id)
        .single();

      if (profileData?.default_workspace_id) {
        setWorkspaceId(profileData.default_workspace_id);
      }
    } catch (error: any) {
      toast({
        title: "Error loading settings",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({
        data: {
          full_name: profile.full_name,
        }
      });

      if (error) throw error;

      toast({
        title: "Profile updated",
        description: "Your profile has been saved successfully.",
      });
    } catch (error: any) {
      toast({
        title: "Failed to update profile",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        
        <div className="flex-1 flex flex-col">
          <header className="h-12 flex items-center border-b bg-background px-4">
            <SidebarTrigger />
            <h1 className="ml-4 font-semibold">Settings</h1>
          </header>

          <main className="flex-1 overflow-auto p-8">
            <div className="max-w-4xl mx-auto space-y-6">
              <div>
                <h2 className="text-3xl font-bold mb-2">Settings</h2>
                <p className="text-muted-foreground">
                  Manage your account settings and preferences
                </p>
              </div>

              <Tabs defaultValue="profile" className="space-y-4">
                <TabsList className="flex flex-wrap gap-1 h-auto p-1">
                  <TabsTrigger value="profile" className="flex items-center justify-center gap-2">
                    <User className="w-4 h-4" />
                    <span className="hidden md:inline">Profile</span>
                  </TabsTrigger>
                  <TabsTrigger value="notifications" className="flex items-center justify-center gap-2">
                    <Bell className="w-4 h-4" />
                    <span className="hidden md:inline">Notifications</span>
                  </TabsTrigger>
                  <TabsTrigger value="credentials" className="flex items-center justify-center gap-2">
                    <Key className="w-4 h-4" />
                    <span className="hidden md:inline">Credentials</span>
                  </TabsTrigger>
                  <TabsTrigger value="history" className="flex items-center justify-center gap-2">
                    <History className="w-4 h-4" />
                    <span className="hidden md:inline">History</span>
                  </TabsTrigger>
                  <TabsTrigger value="activity" className="flex items-center justify-center gap-2">
                    <Activity className="w-4 h-4" />
                    <span className="hidden md:inline">Activity</span>
                  </TabsTrigger>
                  <TabsTrigger value="performance" className="flex items-center justify-center gap-2">
                    <TrendingUp className="w-4 h-4" />
                    <span className="hidden md:inline">Performance</span>
                  </TabsTrigger>
                  <TabsTrigger value="errors" className="flex items-center justify-center gap-2">
                    <AlertTriangle className="w-4 h-4" />
                    <span className="hidden md:inline">Errors</span>
                  </TabsTrigger>
                  <TabsTrigger value="security-monitoring" className="flex items-center justify-center gap-2">
                    <ShieldCheck className="w-4 h-4" />
                    <span className="hidden md:inline">Security</span>
                  </TabsTrigger>
                  <TabsTrigger value="sso" className="flex items-center justify-center gap-2">
                    <Key className="w-4 h-4" />
                    <span className="hidden md:inline">SSO</span>
                  </TabsTrigger>
                  <TabsTrigger value="task-runners" className="flex items-center justify-center gap-2">
                    <Container className="w-4 h-4" />
                    <span className="hidden md:inline">Runners</span>
                  </TabsTrigger>
                  <TabsTrigger value="ai-nodes" className="flex items-center justify-center gap-2">
                    <Brain className="w-4 h-4" />
                    <span className="hidden md:inline">AI Nodes</span>
                  </TabsTrigger>
                  <TabsTrigger value="intelligence" className="flex items-center justify-center gap-2">
                    <Network className="w-4 h-4" />
                    <span className="hidden md:inline">Intelligence</span>
                  </TabsTrigger>
                  <TabsTrigger value="recommendations" className="flex items-center justify-center gap-2">
                    <Sparkles className="w-4 h-4" />
                    <span className="hidden md:inline">AI Recs</span>
                  </TabsTrigger>
                  <TabsTrigger value="migration" className="flex items-center justify-center gap-2">
                    <GitBranch className="w-4 h-4" />
                    <span className="hidden md:inline">Migration</span>
                  </TabsTrigger>
                  <TabsTrigger value="enterprise" className="flex items-center justify-center gap-2">
                    <Building2 className="w-4 h-4" />
                    <span className="hidden md:inline">Enterprise</span>
                  </TabsTrigger>
                  <TabsTrigger value="security" className="flex items-center justify-center gap-2">
                    <Shield className="w-4 h-4" />
                    <span className="hidden md:inline">Account</span>
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="profile">
                  <Card>
                    <CardHeader>
                      <CardTitle>Profile Information</CardTitle>
                      <CardDescription>
                        Update your personal information
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="full_name">Full Name</Label>
                        <Input
                          id="full_name"
                          value={profile.full_name}
                          onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
                          placeholder="Enter your full name"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="email">Email</Label>
                        <Input
                          id="email"
                          type="email"
                          value={profile.email}
                          disabled
                          className="bg-muted"
                        />
                        <p className="text-xs text-muted-foreground">
                          Email cannot be changed here. Contact support if needed.
                        </p>
                      </div>
                      <Button onClick={handleSaveProfile} disabled={saving}>
                        {saving ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Saving...
                          </>
                        ) : (
                          "Save Changes"
                        )}
                      </Button>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="notifications">
                  <Card>
                    <CardHeader>
                      <CardTitle>Notification Preferences</CardTitle>
                      <CardDescription>
                        Manage how you receive notifications
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label>Email Notifications</Label>
                          <p className="text-sm text-muted-foreground">
                            Receive notifications via email
                          </p>
                        </div>
                        <Switch
                          checked={notifications.email_notifications}
                          onCheckedChange={(checked) =>
                            setNotifications({ ...notifications, email_notifications: checked })
                          }
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label>Workflow Updates</Label>
                          <p className="text-sm text-muted-foreground">
                            Get notified when workflows complete
                          </p>
                        </div>
                        <Switch
                          checked={notifications.workflow_updates}
                          onCheckedChange={(checked) =>
                            setNotifications({ ...notifications, workflow_updates: checked })
                          }
                        />
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="credentials">
                  {workspaceId ? (
                    <CredentialsManager workspaceId={workspaceId} />
                  ) : (
                    <Card>
                      <CardHeader>
                        <CardTitle>Credentials</CardTitle>
                        <CardDescription>
                          Manage your API keys and integration credentials
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <p className="text-muted-foreground">No workspace found. Please create a workspace first.</p>
                      </CardContent>
                    </Card>
                  )}
                </TabsContent>

                <TabsContent value="history">
                  {workspaceId ? (
                    <EnhancedExecutionTimeline workspaceId={workspaceId} />
                  ) : (
                    <Card>
                      <CardHeader>
                        <CardTitle>Execution History</CardTitle>
                        <CardDescription>
                          View your workflow execution timeline
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <p className="text-muted-foreground">No workspace found. Please create a workspace first.</p>
                      </CardContent>
                    </Card>
                  )}
                </TabsContent>

                <TabsContent value="activity">
                  {workspaceId ? (
                    <ActivityFeed workspaceId={workspaceId} />
                  ) : (
                    <Card>
                      <CardHeader>
                        <CardTitle>Activity Feed</CardTitle>
                        <CardDescription>
                          Track recent activity in your workspace
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <p className="text-muted-foreground">No workspace found. Please create a workspace first.</p>
                      </CardContent>
                    </Card>
                  )}
                </TabsContent>

                <TabsContent value="performance">
                  {workspaceId ? (
                    <PerformanceMonitor workspaceId={workspaceId} />
                  ) : (
                    <Card>
                      <CardHeader>
                        <CardTitle>Performance Monitoring</CardTitle>
                        <CardDescription>
                          Real-time workflow performance analytics
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <p className="text-muted-foreground">No workspace found. Please create a workspace first.</p>
                      </CardContent>
                    </Card>
                  )}
                </TabsContent>

                <TabsContent value="errors">
                  {workspaceId ? (
                    <div className="space-y-6">
                      <ErrorAggregationDashboard workspaceId={workspaceId} />
                      <DeadLetterQueuePanel workspaceId={workspaceId} />
                      <CircuitBreakerStatus workspaceId={workspaceId} />
                    </div>
                  ) : (
                    <Card>
                      <CardHeader>
                        <CardTitle>Error Monitoring</CardTitle>
                        <CardDescription>
                          Track and resolve workflow errors
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <p className="text-muted-foreground">No workspace found. Please create a workspace first.</p>
                      </CardContent>
                    </Card>
                  )}
                </TabsContent>

                <TabsContent value="security-monitoring">
                  {workspaceId ? (
                    <SecurityMonitoringDashboard workspaceId={workspaceId} />
                  ) : (
                    <Card>
                      <CardHeader>
                        <CardTitle>Security Monitoring</CardTitle>
                        <CardDescription>
                          Real-time security threat detection and prevention
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <p className="text-muted-foreground">No workspace found. Please create a workspace first.</p>
                      </CardContent>
                    </Card>
                  )}
                </TabsContent>

                <TabsContent value="sso">
                  {workspaceId ? (
                    <SSOConfigurationPanel workspaceId={workspaceId} />
                  ) : (
                    <Card>
                      <CardHeader>
                        <CardTitle>SSO Configuration</CardTitle>
                        <CardDescription>Configure enterprise Single Sign-On</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <p className="text-muted-foreground">No workspace found.</p>
                      </CardContent>
                    </Card>
                  )}
                </TabsContent>

                <TabsContent value="task-runners">
                  <TaskRunnerConfiguration />
                </TabsContent>

                <TabsContent value="ai-nodes">
                  <RAGAgentNodes />
                </TabsContent>

                <TabsContent value="intelligence">
                  {workspaceId ? (
                    <CrossWorkflowIntelligence workspaceId={workspaceId} />
                  ) : (
                    <Card>
                      <CardHeader>
                        <CardTitle>Cross-Workflow Intelligence</CardTitle>
                        <CardDescription>AI-powered pattern analysis across workflows</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <p className="text-muted-foreground">No workspace found.</p>
                      </CardContent>
                    </Card>
                  )}
                </TabsContent>

                <TabsContent value="recommendations">
                  {workspaceId ? (
                    <RecommendationsEngine workspaceId={workspaceId} />
                  ) : (
                    <Card>
                      <CardHeader>
                        <CardTitle>AI Recommendations</CardTitle>
                        <CardDescription>Personalized optimization suggestions</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <p className="text-muted-foreground">No workspace found.</p>
                      </CardContent>
                    </Card>
                  )}
                </TabsContent>

                <TabsContent value="migration">
                  {workspaceId ? (
                    <MigrationReportDashboard workspaceId={workspaceId} />
                  ) : (
                    <Card>
                      <CardHeader>
                        <CardTitle>Migration Reports</CardTitle>
                        <CardDescription>Workflow compatibility analysis</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <p className="text-muted-foreground">No workspace found.</p>
                      </CardContent>
                    </Card>
                  )}
                </TabsContent>

                <TabsContent value="enterprise">
                  <EnterpriseReadinessGuide />
                </TabsContent>

                <TabsContent value="security">
                  <Card>
                    <CardHeader>
                      <CardTitle>Security Settings</CardTitle>
                      <CardDescription>
                        Manage your account security
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <Label>Change Password</Label>
                        <p className="text-sm text-muted-foreground">
                          For security reasons, please use the "Forgot Password" option on the login page to reset your password.
                        </p>
                        <Button variant="outline" onClick={() => navigate("/auth")}>
                          Go to Login Page
                        </Button>
                      </div>
                      <div className="pt-4 border-t">
                        <Label className="text-destructive">Danger Zone</Label>
                        <p className="text-sm text-muted-foreground mt-1 mb-3">
                          Once you delete your account, there is no going back.
                        </p>
                        <Button variant="destructive" disabled>
                          Delete Account
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
