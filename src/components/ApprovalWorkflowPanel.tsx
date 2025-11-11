import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { CheckCircle, XCircle, Clock, AlertCircle } from "lucide-react";
import { ScrollArea } from "./ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface Approval {
  id: string;
  workflow_name: string;
  requested_by: string;
  approval_type: string;
  status: string;
  created_at: string;
  required_approvers: string[];
  approved_by: string[];
}

export const ApprovalWorkflowPanel = () => {
  const [approvals, setApprovals] = useState<Approval[]>([
    {
      id: '1',
      workflow_name: 'Payment Processing Pipeline',
      requested_by: 'john@company.com',
      approval_type: 'production_deployment',
      status: 'pending',
      created_at: new Date().toISOString(),
      required_approvers: ['admin1@company.com', 'admin2@company.com'],
      approved_by: ['admin1@company.com']
    },
    {
      id: '2',
      workflow_name: 'Customer Data Export',
      requested_by: 'jane@company.com',
      approval_type: 'gdpr_data_access',
      status: 'pending',
      created_at: new Date(Date.now() - 3600000).toISOString(),
      required_approvers: ['compliance@company.com'],
      approved_by: []
    }
  ]);
  const { toast } = useToast();

  const handleApprove = async (approvalId: string) => {
    toast({
      title: "Approval Granted",
      description: "Workflow approved for deployment",
    });
  };

  const handleReject = async (approvalId: string) => {
    toast({
      title: "Approval Rejected",
      description: "Workflow deployment denied",
      variant: "destructive",
    });
  };

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'pending':
        return { icon: Clock, color: 'text-orange-500', bg: 'bg-orange-500/10' };
      case 'approved':
        return { icon: CheckCircle, color: 'text-green-500', bg: 'bg-green-500/10' };
      case 'rejected':
        return { icon: XCircle, color: 'text-red-500', bg: 'bg-red-500/10' };
      default:
        return { icon: AlertCircle, color: 'text-gray-500', bg: 'bg-gray-500/10' };
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Approval Workflows</CardTitle>
        <CardDescription>Review and approve pending workflow changes</CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[600px]">
          <div className="space-y-4">
            {approvals.map((approval) => {
              const config = getStatusConfig(approval.status);
              const Icon = config.icon;
              const progress = (approval.approved_by.length / approval.required_approvers.length) * 100;

              return (
                <div key={approval.id} className={`p-4 rounded-lg border ${config.bg}`}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 flex-1">
                      <Icon className={`w-5 h-5 mt-1 ${config.color}`} />
                      <div className="space-y-2 flex-1">
                        <div>
                          <h4 className="font-semibold">{approval.workflow_name}</h4>
                          <p className="text-sm text-muted-foreground">
                            Requested by {approval.requested_by}
                          </p>
                        </div>

                        <div className="flex items-center gap-2">
                          <Badge variant="outline">{approval.approval_type}</Badge>
                          <Badge variant="secondary" className={config.color}>
                            {approval.status}
                          </Badge>
                        </div>

                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-muted-foreground">
                              Approvals: {approval.approved_by.length} / {approval.required_approvers.length}
                            </span>
                            <span className="font-medium">{Math.round(progress)}%</span>
                          </div>
                          <div className="h-2 bg-muted rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-primary transition-all duration-300"
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                        </div>

                        <div className="text-xs text-muted-foreground">
                          {new Date(approval.created_at).toLocaleString()}
                        </div>
                      </div>
                    </div>

                    {approval.status === 'pending' && (
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-green-500/50 hover:bg-green-500/10"
                          onClick={() => handleApprove(approval.id)}
                        >
                          <CheckCircle className="w-4 h-4 mr-1" />
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-red-500/50 hover:bg-red-500/10"
                          onClick={() => handleReject(approval.id)}
                        >
                          <XCircle className="w-4 h-4 mr-1" />
                          Reject
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {approvals.length === 0 && (
              <div className="text-center py-12">
                <CheckCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No pending approvals</p>
              </div>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};
