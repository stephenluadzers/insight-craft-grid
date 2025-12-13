import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Shield, 
  Eye, 
  Zap, 
  Bell, 
  GitBranch, 
  CheckCircle, 
  Shuffle, 
  Lock,
  AlertTriangle,
  XCircle
} from "lucide-react";

interface RoleAssignment {
  nodeId: string;
  nodeType: string;
  assignedRole: string;
  justification: string;
  constraints: string[];
  requiresApproval: boolean;
  approvalChain: string[];
}

interface RoleViolation {
  nodeId: string;
  role: string;
  attemptedAction: string;
  permission: string;
  severity: 'warning' | 'error' | 'critical';
  message: string;
  timestamp: string;
  blocked: boolean;
}

interface RoleContractPanelProps {
  roleAssignments?: RoleAssignment[];
  roleViolations?: RoleViolation[];
  roleContractExplanation?: string;
}

const roleIcons: Record<string, React.ReactNode> = {
  analyzer: <Eye className="h-4 w-4" />,
  executor: <Zap className="h-4 w-4" />,
  auditor: <Shield className="h-4 w-4" />,
  notifier: <Bell className="h-4 w-4" />,
  orchestrator: <GitBranch className="h-4 w-4" />,
  validator: <CheckCircle className="h-4 w-4" />,
  transformer: <Shuffle className="h-4 w-4" />,
  guardian: <Lock className="h-4 w-4" />
};

const roleColors: Record<string, string> = {
  analyzer: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  executor: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  auditor: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  notifier: 'bg-green-500/20 text-green-400 border-green-500/30',
  orchestrator: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
  validator: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  transformer: 'bg-pink-500/20 text-pink-400 border-pink-500/30',
  guardian: 'bg-red-500/20 text-red-400 border-red-500/30'
};

const roleDescriptions: Record<string, string> = {
  analyzer: 'Read-only access with AI capabilities',
  executor: 'Executes actions, requires approval for high-risk',
  auditor: 'Monitors operations, maintains audit trail',
  notifier: 'Sends notifications only, no data access',
  orchestrator: 'Coordinates workflow, delegates tasks',
  validator: 'Validates data and approves operations',
  transformer: 'Transforms data, no external calls',
  guardian: 'Ultimate authority, can block any operation'
};

export function RoleContractPanel({ 
  roleAssignments = [], 
  roleViolations = [],
  roleContractExplanation 
}: RoleContractPanelProps) {
  // Group assignments by role
  const roleGroups = roleAssignments.reduce((acc, assignment) => {
    const role = assignment.assignedRole;
    if (!acc[role]) acc[role] = [];
    acc[role].push(assignment);
    return acc;
  }, {} as Record<string, RoleAssignment[]>);

  const hasViolations = roleViolations.length > 0;

  return (
    <Card className="bg-background/60 backdrop-blur-sm border-border/50">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Shield className="h-5 w-5 text-primary" />
          Role Contract Enforcement
          {hasViolations && (
            <Badge variant="destructive" className="ml-2">
              {roleViolations.length} Violation{roleViolations.length > 1 ? 's' : ''} Blocked
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Role Summary */}
        <div className="grid grid-cols-4 gap-2">
          {Object.entries(roleGroups).map(([role, assignments]) => (
            <div 
              key={role} 
              className={`p-2 rounded-lg border ${roleColors[role] || 'bg-muted'} flex flex-col items-center`}
            >
              {roleIcons[role] || <Shield className="h-4 w-4" />}
              <span className="text-xs font-medium mt-1 capitalize">{role}</span>
              <span className="text-xs opacity-70">{assignments.length} nodes</span>
            </div>
          ))}
        </div>

        {/* Violations Alert */}
        {hasViolations && (
          <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-3">
            <h4 className="text-sm font-semibold text-destructive flex items-center gap-2 mb-2">
              <XCircle className="h-4 w-4" />
              Privilege Creep Blocked
            </h4>
            <ScrollArea className="max-h-32">
              {roleViolations.map((violation, index) => (
                <div key={index} className="text-xs text-muted-foreground mb-2 last:mb-0">
                  <Badge 
                    variant={violation.severity === 'critical' ? 'destructive' : 'outline'}
                    className="mr-2"
                  >
                    {violation.severity}
                  </Badge>
                  {violation.message}
                </div>
              ))}
            </ScrollArea>
          </div>
        )}

        {/* Role Assignments Detail */}
        <ScrollArea className="max-h-64">
          <div className="space-y-2">
            {Object.entries(roleGroups).map(([role, assignments]) => (
              <div key={role} className="space-y-1">
                <div className="flex items-center gap-2 text-sm font-medium">
                  {roleIcons[role]}
                  <span className="capitalize">{role}</span>
                  <span className="text-xs text-muted-foreground">
                    — {roleDescriptions[role]}
                  </span>
                </div>
                <div className="ml-6 space-y-1">
                  {assignments.map((assignment) => (
                    <div 
                      key={assignment.nodeId} 
                      className="flex items-center gap-2 text-xs text-muted-foreground"
                    >
                      <span className="font-mono bg-muted px-1 rounded">
                        {assignment.nodeType}
                      </span>
                      {assignment.requiresApproval && (
                        <Badge variant="outline" className="text-[10px] py-0">
                          <AlertTriangle className="h-2 w-2 mr-1" />
                          Requires Approval
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>

        {/* Security Boundaries */}
        <div className="border-t border-border/50 pt-3">
          <h4 className="text-sm font-medium mb-2">Security Boundaries Enforced</h4>
          <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <CheckCircle className="h-3 w-3 text-green-500" />
              Analyzers: Read-only
            </div>
            <div className="flex items-center gap-1">
              <CheckCircle className="h-3 w-3 text-green-500" />
              Executors: Approval required
            </div>
            <div className="flex items-center gap-1">
              <CheckCircle className="h-3 w-3 text-green-500" />
              Auditors: Immutable logs
            </div>
            <div className="flex items-center gap-1">
              <CheckCircle className="h-3 w-3 text-green-500" />
              Guardians: Veto power
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
