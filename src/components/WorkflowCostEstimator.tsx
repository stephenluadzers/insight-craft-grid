import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { DollarSign, TrendingUp, TrendingDown, AlertTriangle } from "lucide-react";

interface CostBreakdown {
  category: string;
  cost: number;
  percentage: number;
  unit: string;
}

interface WorkflowCostEstimatorProps {
  nodes: any[];
  executionsPerMonth?: number;
}

export function WorkflowCostEstimator({ nodes, executionsPerMonth = 1000 }: WorkflowCostEstimatorProps) {
  const calculateNodeCost = (node: any): number => {
    const baseCosts: Record<string, number> = {
      'ai': 0.002,       // Per request (AI API calls)
      'action': 0.0001,  // Per execution
      'data': 0.00005,   // Per data operation
      'condition': 0.00001, // Minimal cost
      'webhook': 0.0002, // Per webhook call
      'email': 0.0001,   // Per email sent
      'integration': 0.0003, // Per API call
    };

    return baseCosts[node.type] || 0.0001;
  };

  const costBreakdown: CostBreakdown[] = nodes.reduce((acc, node) => {
    const category = node.type;
    const costPerExecution = calculateNodeCost(node);
    const monthlyCost = costPerExecution * executionsPerMonth;

    const existing = acc.find((item: CostBreakdown) => item.category === category);
    if (existing) {
      existing.cost += monthlyCost;
    } else {
      acc.push({
        category,
        cost: monthlyCost,
        percentage: 0,
        unit: 'execution'
      });
    }
    return acc;
  }, [] as CostBreakdown[]);

  const totalMonthlyCost = costBreakdown.reduce((sum, item) => sum + item.cost, 0);

  costBreakdown.forEach(item => {
    item.percentage = (item.cost / totalMonthlyCost) * 100;
  });

  const costPerExecution = totalMonthlyCost / executionsPerMonth;
  const annualCost = totalMonthlyCost * 12;

  const getCostLevel = (cost: number): { label: string; variant: any; icon: any } => {
    if (cost < 10) return { label: 'Low', variant: 'default', icon: TrendingDown };
    if (cost < 100) return { label: 'Medium', variant: 'secondary', icon: TrendingUp };
    return { label: 'High', variant: 'destructive', icon: AlertTriangle };
  };

  const costLevel = getCostLevel(totalMonthlyCost);
  const Icon = costLevel.icon;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Cost Estimation
            </CardTitle>
            <CardDescription>
              Estimated costs based on {executionsPerMonth.toLocaleString()} executions/month
            </CardDescription>
          </div>
          <Badge variant={costLevel.variant} className="gap-1">
            <Icon className="h-3 w-3" />
            {costLevel.label} Cost
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">Per Execution</p>
            <p className="text-2xl font-bold">${costPerExecution.toFixed(4)}</p>
          </div>
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">Monthly</p>
            <p className="text-2xl font-bold">${totalMonthlyCost.toFixed(2)}</p>
          </div>
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">Annual</p>
            <p className="text-2xl font-bold">${annualCost.toFixed(2)}</p>
          </div>
        </div>

        <div className="space-y-4">
          <h4 className="font-semibold">Cost Breakdown</h4>
          {costBreakdown.map((item) => (
            <div key={item.category} className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="capitalize">{item.category} Nodes</span>
                <span className="font-medium">${item.cost.toFixed(2)}/mo</span>
              </div>
              <Progress value={item.percentage} className="h-2" />
              <p className="text-xs text-muted-foreground">
                {item.percentage.toFixed(1)}% of total cost
              </p>
            </div>
          ))}
        </div>

        <div className="bg-muted/50 p-4 rounded-lg space-y-2">
          <h4 className="font-semibold text-sm">Cost Optimization Tips</h4>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>• Consider caching frequent API calls</li>
            <li>• Batch similar operations together</li>
            <li>• Use conditions to avoid unnecessary node executions</li>
            <li>• Monitor and adjust execution frequency</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
