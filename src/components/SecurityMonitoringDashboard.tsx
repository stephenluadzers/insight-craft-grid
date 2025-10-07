import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Shield, AlertTriangle, XCircle, Clock, CheckCircle } from "lucide-react";
import { ScrollArea } from "./ui/scroll-area";
import { useToast } from "@/hooks/use-toast";

interface SecurityMonitoringDashboardProps {
  workspaceId: string;
}

interface SecurityScan {
  id: string;
  workflow_id: string;
  scan_status: string;
  risk_level: string;
  issues_found: number;
  scanned_at: string;
  approved: boolean;
  scan_results: any;
}

interface DangerousOperation {
  id: string;
  operation_type: string;
  risk_level: string;
  action_taken: string;
  reason: string;
  detected_at: string;
  operation_details: any;
}

interface SuspiciousActivity {
  id: string;
  activity_type: string;
  severity: string;
  detected_at: string;
  investigated: boolean;
  activity_details: any;
}

export const SecurityMonitoringDashboard = ({ workspaceId }: SecurityMonitoringDashboardProps) => {
  const [scans, setScans] = useState<SecurityScan[]>([]);
  const [operations, setOperations] = useState<DangerousOperation[]>([]);
  const [activities, setActivities] = useState<SuspiciousActivity[]>([]);
  const [stats, setStats] = useState({
    total_scans: 0,
    high_risk: 0,
    blocked_operations: 0,
    pending_approvals: 0,
  });
  const { toast } = useToast();

  useEffect(() => {
    loadSecurityData();
    
    // Real-time subscriptions
    const scansChannel = supabase
      .channel('security-scans')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'workflow_security_scans',
        filter: `workspace_id=eq.${workspaceId}`
      }, () => {
        loadSecurityData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(scansChannel);
    };
  }, [workspaceId]);

  const loadSecurityData = async () => {
    try {
      // Load security scans
      const { data: scansData, error: scansError } = await supabase
        .from('workflow_security_scans')
        .select('*')
        .eq('workspace_id', workspaceId)
        .order('scanned_at', { ascending: false })
        .limit(20);

      if (scansError) throw scansError;
      setScans(scansData || []);

      // Load dangerous operations
      const { data: opsData, error: opsError } = await supabase
        .from('dangerous_operations_log')
        .select('*')
        .eq('workspace_id', workspaceId)
        .order('detected_at', { ascending: false })
        .limit(20);

      if (opsError) throw opsError;
      setOperations(opsData || []);

      // Load suspicious activities
      const { data: activitiesData, error: activitiesError } = await supabase
        .from('suspicious_activity_log')
        .select('*')
        .eq('workspace_id', workspaceId)
        .order('detected_at', { ascending: false })
        .limit(20);

      if (activitiesError) throw activitiesError;
      setActivities(activitiesData || []);

      // Calculate stats
      setStats({
        total_scans: scansData?.length || 0,
        high_risk: scansData?.filter(s => s.risk_level === 'high' || s.risk_level === 'critical').length || 0,
        blocked_operations: opsData?.filter(o => o.action_taken === 'blocked').length || 0,
        pending_approvals: scansData?.filter(s => !s.approved && (s.risk_level === 'high' || s.risk_level === 'critical')).length || 0,
      });

    } catch (error) {
      console.error('Error loading security data:', error);
      toast({
        title: "Error",
        description: "Failed to load security monitoring data",
        variant: "destructive"
      });
    }
  };

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'critical': return 'text-red-600 dark:text-red-400';
      case 'high': return 'text-orange-600 dark:text-orange-400';
      case 'medium': return 'text-yellow-600 dark:text-yellow-400';
      case 'low': return 'text-blue-600 dark:text-blue-400';
      default: return 'text-green-600 dark:text-green-400';
    }
  };

  const getRiskBadgeVariant = (level: string): "default" | "destructive" | "outline" | "secondary" => {
    switch (level) {
      case 'critical': return 'destructive';
      case 'high': return 'destructive';
      case 'medium': return 'secondary';
      default: return 'outline';
    }
  };

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Security Scans</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total_scans}</div>
            <p className="text-xs text-muted-foreground">Total scans performed</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">High Risk</CardTitle>
            <AlertTriangle className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{stats.high_risk}</div>
            <p className="text-xs text-muted-foreground">Workflows need attention</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Blocked Operations</CardTitle>
            <XCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.blocked_operations}</div>
            <p className="text-xs text-muted-foreground">Threats prevented</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Approvals</CardTitle>
            <Clock className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats.pending_approvals}</div>
            <p className="text-xs text-muted-foreground">Awaiting review</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs for Different Views */}
      <Tabs defaultValue="scans">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="scans">Security Scans</TabsTrigger>
          <TabsTrigger value="operations">Blocked Operations</TabsTrigger>
          <TabsTrigger value="activity">Suspicious Activity</TabsTrigger>
        </TabsList>

        <TabsContent value="scans" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Security Scans</CardTitle>
              <CardDescription>Workflow security analysis results</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[500px]">
                <div className="space-y-4">
                  {scans.map((scan) => (
                    <div key={scan.id} className="border rounded-lg p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">Workflow: {scan.workflow_id.slice(0, 8)}</p>
                          <p className="text-sm text-muted-foreground">
                            Scanned: {new Date(scan.scanned_at).toLocaleString()}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={getRiskBadgeVariant(scan.risk_level)}>
                            {scan.risk_level}
                          </Badge>
                          {scan.approved && (
                            <Badge variant="outline">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Approved
                            </Badge>
                          )}
                        </div>
                      </div>
                      <p className="text-sm">Issues Found: {scan.issues_found}</p>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="operations" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Dangerous Operations</CardTitle>
              <CardDescription>Security threats detected and blocked</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[500px]">
                <div className="space-y-4">
                  {operations.map((op) => (
                    <div key={op.id} className="border rounded-lg p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">{op.operation_type}</p>
                          <p className="text-sm text-muted-foreground">
                            Detected: {new Date(op.detected_at).toLocaleString()}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={getRiskBadgeVariant(op.risk_level)}>
                            {op.risk_level}
                          </Badge>
                          <Badge variant={op.action_taken === 'blocked' ? 'destructive' : 'outline'}>
                            {op.action_taken}
                          </Badge>
                        </div>
                      </div>
                      <p className="text-sm">{op.reason}</p>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="activity" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Suspicious Activity</CardTitle>
              <CardDescription>Unusual behavior patterns detected</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[500px]">
                <div className="space-y-4">
                  {activities.map((activity) => (
                    <div key={activity.id} className="border rounded-lg p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">{activity.activity_type}</p>
                          <p className="text-sm text-muted-foreground">
                            Detected: {new Date(activity.detected_at).toLocaleString()}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={getRiskBadgeVariant(activity.severity)}>
                            {activity.severity}
                          </Badge>
                          {activity.investigated && (
                            <Badge variant="outline">Investigated</Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
