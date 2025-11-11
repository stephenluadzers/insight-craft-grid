import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { CheckCircle, AlertTriangle, XCircle, TrendingUp } from "lucide-react";
import { Progress } from "./ui/progress";

interface SLAMetric {
  name: string;
  target: number;
  actual: number;
  unit: string;
  status: 'met' | 'warning' | 'breach';
}

const SLA_METRICS: SLAMetric[] = [
  { name: 'Uptime', target: 99.9, actual: 99.97, unit: '%', status: 'met' },
  { name: 'Avg Response Time', target: 200, actual: 145, unit: 'ms', status: 'met' },
  { name: 'Error Rate', target: 0.1, actual: 0.03, unit: '%', status: 'met' },
  { name: 'P95 Latency', target: 500, actual: 320, unit: 'ms', status: 'met' },
];

export const SLAMonitoringDashboard = () => {
  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'met':
        return { icon: CheckCircle, color: 'text-green-500', bg: 'bg-green-500/10', badge: 'default' };
      case 'warning':
        return { icon: AlertTriangle, color: 'text-orange-500', bg: 'bg-orange-500/10', badge: 'secondary' };
      case 'breach':
        return { icon: XCircle, color: 'text-red-500', bg: 'bg-red-500/10', badge: 'destructive' };
      default:
        return { icon: CheckCircle, color: 'text-gray-500', bg: 'bg-gray-500/10', badge: 'outline' };
    }
  };

  const calculatePerformance = (target: number, actual: number, isLowerBetter: boolean = false) => {
    if (isLowerBetter) {
      return Math.max(0, Math.min(100, ((target - actual) / target) * 100 + 100));
    }
    return Math.min(100, (actual / target) * 100);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>SLA Performance</CardTitle>
            <CardDescription>Real-time service level agreement monitoring</CardDescription>
          </div>
          <Badge variant="outline" className="border-green-500/50">
            <CheckCircle className="w-4 h-4 mr-2 text-green-500" />
            All SLAs Met
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {SLA_METRICS.map((metric) => {
            const config = getStatusConfig(metric.status);
            const Icon = config.icon;
            const isLowerBetter = metric.name.includes('Time') || metric.name.includes('Error') || metric.name.includes('Latency');
            const performance = calculatePerformance(metric.target, metric.actual, isLowerBetter);

            return (
              <div key={metric.name} className={`p-4 rounded-lg ${config.bg} border`}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <Icon className={`w-5 h-5 ${config.color}`} />
                    <div>
                      <h4 className="font-semibold text-sm">{metric.name}</h4>
                      <p className="text-xs text-muted-foreground">
                        Target: {metric.target}{metric.unit}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold">{metric.actual}{metric.unit}</div>
                    <Badge variant={config.badge as any} className="text-xs mt-1">
                      {metric.status.toUpperCase()}
                    </Badge>
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Performance</span>
                    <span className="font-medium">{Math.round(performance)}%</span>
                  </div>
                  <Progress value={performance} className="h-2" />
                </div>

                {metric.status === 'met' && (
                  <div className="flex items-center gap-2 mt-2 text-xs text-green-500">
                    <TrendingUp className="w-3 h-3" />
                    <span>
                      {isLowerBetter 
                        ? `${Math.abs(metric.target - metric.actual).toFixed(1)}${metric.unit} under target`
                        : `${(metric.actual - metric.target).toFixed(2)}${metric.unit} above target`
                      }
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="mt-6 p-4 bg-muted/50 rounded-lg">
          <p className="text-sm text-muted-foreground">
            <strong>SLA Guarantee:</strong> Enterprise plan includes 99.99% uptime guarantee with 
            financial credits for any downtime. Last incident: None in 180 days.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};
