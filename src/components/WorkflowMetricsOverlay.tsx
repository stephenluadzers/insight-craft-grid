import { Card } from "./ui/card";
import { Badge } from "./ui/badge";
import { Activity, DollarSign, Shield, Layers } from "lucide-react";
import { WorkflowNodeData } from "@/types/workflow";

interface WorkflowMetricsOverlayProps {
  nodes: WorkflowNodeData[];
  complianceStandards?: string[];
  riskScore?: number;
}

export const WorkflowMetricsOverlay = ({ 
  nodes, 
  complianceStandards = [], 
  riskScore 
}: WorkflowMetricsOverlayProps) => {
  // Calculate estimated runtime cost based on node types and integrations
  const calculateEstimatedCost = () => {
    let cost = 0;
    nodes.forEach(node => {
      // Base cost per node
      cost += 0.001;
      
      // AI nodes are more expensive
      if (node.type === 'ai' || node.title?.toLowerCase().includes('ai')) {
        cost += 0.05;
      }
      
      // External API calls
      if (node.type === 'connector' || node.config?.connector) {
        cost += 0.002;
      }
      
      // Data processing nodes
      if (node.type === 'data' || node.type === 'action') {
        cost += 0.001;
      }
    });
    
    return cost.toFixed(4);
  };

  const getComplianceColor = () => {
    if (!riskScore) return "bg-muted";
    if (riskScore < 30) return "bg-green-500/20 text-green-700 dark:text-green-300";
    if (riskScore < 70) return "bg-yellow-500/20 text-yellow-700 dark:text-yellow-300";
    return "bg-red-500/20 text-red-700 dark:text-red-300";
  };

  const getComplianceLabel = () => {
    if (!riskScore) return "Not Assessed";
    if (riskScore < 30) return "Low Risk";
    if (riskScore < 70) return "Medium Risk";
    return "High Risk";
  };

  return (
    <Card className="fixed bottom-6 right-6 p-4 shadow-lg border-2 bg-background/95 backdrop-blur-sm z-40 max-w-xs">
      <div className="space-y-3">
        <div className="flex items-center justify-between border-b pb-2">
          <h3 className="font-semibold text-sm flex items-center gap-2">
            <Activity className="w-4 h-4" />
            Workflow Metrics
          </h3>
        </div>

        <div className="space-y-2 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground flex items-center gap-2">
              <Layers className="w-3 h-3" />
              Total Nodes
            </span>
            <Badge variant="secondary">{nodes.length}</Badge>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-muted-foreground flex items-center gap-2">
              <DollarSign className="w-3 h-3" />
              Est. Runtime Cost
            </span>
            <Badge variant="secondary">${calculateEstimatedCost()}</Badge>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-muted-foreground flex items-center gap-2">
              <Shield className="w-3 h-3" />
              Compliance
            </span>
            <Badge className={getComplianceColor()}>
              {getComplianceLabel()}
            </Badge>
          </div>

          {complianceStandards.length > 0 && (
            <div className="pt-2 border-t">
              <p className="text-xs text-muted-foreground mb-1">Standards:</p>
              <div className="flex flex-wrap gap-1">
                {complianceStandards.map((standard, idx) => (
                  <Badge key={idx} variant="outline" className="text-xs">
                    {standard}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
};
