import { motion } from "framer-motion";
import { TrendingUp, Activity, Zap, Clock, CheckCircle2, XCircle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface MetricCardProps {
  label: string;
  value: string | number;
  change?: string;
  icon: React.ElementType;
  color?: string;
}

function MetricCard({ label, value, change, icon: Icon, color = "text-primary" }: MetricCardProps) {
  return (
    <Card className="glass border-border/50 p-4 hover:shadow-glow transition-all duration-300">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-muted-foreground font-medium">{label}</span>
        <Icon className={`w-4 h-4 ${color}`} />
      </div>
      <p className="text-2xl font-bold text-foreground">{value}</p>
      {change && (
        <div className="flex items-center gap-1 mt-1">
          <TrendingUp className="w-3 h-3 text-green-500" />
          <span className="text-xs text-green-500">{change}</span>
        </div>
      )}
    </Card>
  );
}

interface MiniSparklineProps {
  data: number[];
  color?: string;
}

function MiniSparkline({ data, color = "hsl(var(--primary))" }: MiniSparklineProps) {
  if (data.length < 2) return null;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const w = 120;
  const h = 32;

  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w;
    const y = h - ((v - min) / range) * h;
    return `${x},${y}`;
  }).join(" ");

  return (
    <svg width={w} height={h} className="overflow-visible">
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

interface LiveMetricsPanelProps {
  totalExecutions?: number;
  successRate?: number;
  avgDurationMs?: number;
  activeWorkflows?: number;
  recentActivity?: Array<{ type: "success" | "error"; label: string; time: string }>;
  sparklineData?: number[];
}

export function LiveMetricsPanel({
  totalExecutions = 0,
  successRate = 0,
  avgDurationMs = 0,
  activeWorkflows = 0,
  recentActivity = [],
  sparklineData = [],
}: LiveMetricsPanelProps) {
  return (
    <div className="space-y-6">
      {/* Metric cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0 }}>
          <MetricCard label="Total Executions" value={totalExecutions.toLocaleString()} icon={Zap} color="text-accent" change="+12% this week" />
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <MetricCard label="Success Rate" value={`${successRate}%`} icon={CheckCircle2} color="text-green-500" />
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <MetricCard label="Avg Duration" value={avgDurationMs < 1000 ? `${avgDurationMs}ms` : `${(avgDurationMs / 1000).toFixed(1)}s`} icon={Clock} color="text-primary" />
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <MetricCard label="Active Workflows" value={activeWorkflows} icon={Activity} color="text-accent" />
        </motion.div>
      </div>

      {/* Sparkline */}
      {sparklineData.length > 1 && (
        <Card className="glass border-border/50 p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-foreground">Execution Trend (7d)</span>
            <Badge variant="secondary" className="text-xs">Live</Badge>
          </div>
          <MiniSparkline data={sparklineData} />
        </Card>
      )}

      {/* Activity feed */}
      {recentActivity.length > 0 && (
        <Card className="glass border-border/50 p-4">
          <h3 className="text-sm font-medium text-foreground mb-3">Recent Activity</h3>
          <div className="space-y-2">
            {recentActivity.slice(0, 5).map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className="flex items-center gap-2 py-1"
              >
                {item.type === "success" ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-green-500 shrink-0" />
                ) : (
                  <XCircle className="w-3.5 h-3.5 text-destructive shrink-0" />
                )}
                <span className="text-xs text-foreground truncate flex-1">{item.label}</span>
                <span className="text-[10px] text-muted-foreground shrink-0">{item.time}</span>
              </motion.div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
