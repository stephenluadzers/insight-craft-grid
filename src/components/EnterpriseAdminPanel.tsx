import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Shield, Users, Activity, Settings, DollarSign, AlertTriangle } from "lucide-react";
import { ScrollArea } from "./ui/scroll-area";

interface EnterpriseAdminPanelProps {
  workspaceId: string;
}

export const EnterpriseAdminPanel = ({ workspaceId }: EnterpriseAdminPanelProps) => {
  const [activeTab, setActiveTab] = useState("overview");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Enterprise Admin</h1>
          <p className="text-muted-foreground">Manage your workspace, team, and subscription</p>
        </div>
        <Badge variant="outline" className="border-primary/50">
          <Shield className="w-4 h-4 mr-2" />
          Enterprise Plan
        </Badge>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="team">Team</TabsTrigger>
          <TabsTrigger value="audit">Audit Logs</TabsTrigger>
          <TabsTrigger value="billing">Billing</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Workflows</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">142</div>
                <p className="text-xs text-muted-foreground">+12% from last month</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Team Members</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">24</div>
                <p className="text-xs text-muted-foreground">Unlimited available</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Executions This Month</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">87.5K</div>
                <p className="text-xs text-muted-foreground">Unlimited executions</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">SLA Uptime</CardTitle>
                <Shield className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">99.97%</div>
                <p className="text-xs text-green-500">Above 99.9% guarantee</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Recent Alerts</CardTitle>
              <CardDescription>Critical events requiring attention</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-start gap-4 p-4 border rounded-lg">
                  <AlertTriangle className="w-5 h-5 text-orange-500 mt-0.5" />
                  <div className="flex-1">
                    <h4 className="font-semibold text-sm">High API Usage Detected</h4>
                    <p className="text-sm text-muted-foreground">
                      Workflow "Payment Processing" exceeded 80% of rate limit
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">2 hours ago</p>
                  </div>
                  <Button variant="outline" size="sm">Review</Button>
                </div>

                <div className="flex items-start gap-4 p-4 border rounded-lg">
                  <Shield className="w-5 h-5 text-blue-500 mt-0.5" />
                  <div className="flex-1">
                    <h4 className="font-semibold text-sm">Security Scan Completed</h4>
                    <p className="text-sm text-muted-foreground">
                      All workflows passed GDPR compliance check
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">5 hours ago</p>
                  </div>
                  <Button variant="outline" size="sm">View Report</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="team" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Team Members</CardTitle>
                  <CardDescription>Manage workspace access and permissions</CardDescription>
                </div>
                <Button>
                  <Users className="w-4 h-4 mr-2" />
                  Invite Member
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                <div className="space-y-3">
                  {[
                    { name: "John Doe", email: "john@company.com", role: "owner", status: "active" },
                    { name: "Jane Smith", email: "jane@company.com", role: "admin", status: "active" },
                    { name: "Bob Johnson", email: "bob@company.com", role: "editor", status: "active" },
                    { name: "Alice Williams", email: "alice@company.com", role: "viewer", status: "invited" },
                  ].map((member, i) => (
                    <div key={i} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex-1">
                        <p className="font-medium">{member.name}</p>
                        <p className="text-sm text-muted-foreground">{member.email}</p>
                      </div>
                      <div className="flex items-center gap-4">
                        <Badge variant={member.status === 'active' ? 'default' : 'secondary'}>
                          {member.status}
                        </Badge>
                        <Badge variant="outline">{member.role}</Badge>
                        <Button variant="ghost" size="sm">Manage</Button>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="audit" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Audit Trail</CardTitle>
              <CardDescription>Complete activity log for compliance and security</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[500px]">
                <div className="space-y-2">
                  {[
                    { action: "Workflow Published", user: "john@company.com", time: "2 min ago", severity: "low" },
                    { action: "User Role Changed", user: "jane@company.com", time: "1 hour ago", severity: "high" },
                    { action: "API Key Created", user: "bob@company.com", time: "3 hours ago", severity: "medium" },
                    { action: "Workflow Deleted", user: "john@company.com", time: "5 hours ago", severity: "high" },
                  ].map((log, i) => (
                    <div key={i} className="flex items-center justify-between p-3 border-b last:border-0">
                      <div className="flex-1">
                        <p className="font-medium text-sm">{log.action}</p>
                        <p className="text-xs text-muted-foreground">by {log.user}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge variant={log.severity === 'high' ? 'destructive' : 'secondary'}>
                          {log.severity}
                        </Badge>
                        <span className="text-xs text-muted-foreground">{log.time}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="billing" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Subscription & Billing</CardTitle>
              <CardDescription>Manage your enterprise subscription</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between p-6 bg-gradient-to-br from-primary/10 to-accent/10 rounded-lg border">
                <div>
                  <h3 className="text-2xl font-bold">Enterprise Plan</h3>
                  <p className="text-muted-foreground">$2,999/month</p>
                  <p className="text-sm text-muted-foreground mt-2">Next billing: Dec 1, 2025</p>
                </div>
                <Button variant="outline">
                  <DollarSign className="w-4 h-4 mr-2" />
                  Manage Billing
                </Button>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 border rounded-lg">
                  <p className="text-sm text-muted-foreground">Plan Features</p>
                  <ul className="mt-2 space-y-1 text-sm">
                    <li className="flex items-center gap-2">
                      <Shield className="w-4 h-4 text-green-500" />
                      Unlimited workflows
                    </li>
                    <li className="flex items-center gap-2">
                      <Shield className="w-4 h-4 text-green-500" />
                      Unlimited team members
                    </li>
                    <li className="flex items-center gap-2">
                      <Shield className="w-4 h-4 text-green-500" />
                      99.9% SLA guarantee
                    </li>
                    <li className="flex items-center gap-2">
                      <Shield className="w-4 h-4 text-green-500" />
                      Dedicated support
                    </li>
                  </ul>
                </div>

                <div className="p-4 border rounded-lg">
                  <p className="text-sm text-muted-foreground">Usage This Month</p>
                  <div className="mt-2 space-y-2">
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Workflows</span>
                        <span className="font-medium">142 / Unlimited</span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-primary w-[14%]" />
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Executions</span>
                        <span className="font-medium">87.5K / Unlimited</span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-primary w-[9%]" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Enterprise Settings</CardTitle>
              <CardDescription>Configure advanced features and integrations</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <h4 className="font-semibold">SSO Authentication</h4>
                    <p className="text-sm text-muted-foreground">Enable SAML 2.0 single sign-on</p>
                  </div>
                  <Button variant="outline">Configure</Button>
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <h4 className="font-semibold">Custom Branding</h4>
                    <p className="text-sm text-muted-foreground">Add your logo and colors</p>
                  </div>
                  <Button variant="outline">Customize</Button>
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <h4 className="font-semibold">API Access</h4>
                    <p className="text-sm text-muted-foreground">Manage API keys and webhooks</p>
                  </div>
                  <Button variant="outline">Manage</Button>
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <h4 className="font-semibold">Data Retention</h4>
                    <p className="text-sm text-muted-foreground">Configure audit log retention (365 days)</p>
                  </div>
                  <Button variant="outline">Configure</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};