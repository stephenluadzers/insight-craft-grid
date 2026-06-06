import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DollarSign, Zap, Timer, TrendingUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { StepCostMetric } from "@/types/workflow-governance";

interface Props {
  workflowId: string;
}

/** Wave 4 — Per-step cost & performance dashboard. */
export function ObservabilityDashboard({ workflowId }: Props) {
  const [metrics, setMetrics] = useState<StepCostMetric[]>([]);
  const [loading, setLoading] = useState(false);
  const [hours, setHours] = useState(24);

  const load = async () => {
    setLoading(true);
    const since = new Date(Date.now() - hours * 3600 * 1000).toISOString();
    const { data } = await supabase
      .from("step_cost_metrics")
      .select("*")
      .eq("workflow_id", workflowId)
      .gte("recorded_at", since)
      .order("recorded_at", { ascending: false })
      .limit(500);
    setMetrics((data ?? []) as StepCostMetric[]);
    setLoading(false);
  };

  useEffect(() => {
    if (workflowId) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workflowId, hours]);

  const totals = useMemo(() => {
    const t = { cost: 0, tokens: 0, latency: 0, count: metrics.length };
    metrics.forEach((m) => {
      t.cost += Number(m.cost_usd);
      t.tokens += m.input_tokens + m.output_tokens;
      t.latency += m.latency_ms;
    });
    return t;
  }, [metrics]);

  const byNode = useMemo(() => {
    const map = new Map<string, { node: string; cost: number; calls: number; latency: number }>();
    metrics.forEach((m) => {
      const key = m.node_id;
      const cur = map.get(key) ?? { node: key, cost: 0, calls: 0, latency: 0 };
      cur.cost += Number(m.cost_usd);
      cur.calls += 1;
      cur.latency += m.latency_ms;
      map.set(key, cur);
    });
    return Array.from(map.values()).sort((a, b) => b.cost - a.cost);
  }, [metrics]);

  const avgLatency = totals.count ? Math.round(totals.latency / totals.count) : 0;

  return (
    <Card className="p-4 space-y-4 backdrop-blur-xl bg-background/60 border-primary/20">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-primary" />
          <span className="font-medium text-sm">Observability</span>
        </div>
        <div className="flex gap-1">
          {[1, 24, 168].map((h) => (
            <Button
              key={h}
              size="sm"
              variant={hours === h ? "default" : "ghost"}
              className="h-7 text-xs px-2"
              onClick={() => setHours(h)}
            >
              {h === 1 ? "1h" : h === 24 ? "24h" : "7d"}
            </Button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <Stat
          icon={<DollarSign className="h-3 w-3" />}
          label="Total cost"
          value={`$${totals.cost.toFixed(4)}`}
        />
        <Stat
          icon={<Zap className="h-3 w-3" />}
          label="Tokens"
          value={totals.tokens.toLocaleString()}
        />
        <Stat
          icon={<Timer className="h-3 w-3" />}
          label="Avg latency"
          value={`${avgLatency}ms`}
        />
        <Stat
          icon={<TrendingUp className="h-3 w-3" />}
          label="Steps run"
          value={totals.count.toString()}
        />
      </div>

      <div className="space-y-1">
        <div className="text-xs font-medium text-muted-foreground">
          Cost attribution by node
        </div>
        {byNode.length === 0 && !loading && (
          <div className="text-xs text-muted-foreground py-4 text-center">
            No metrics in this window.
          </div>
        )}
        {byNode.map((row) => {
          const pct = totals.cost ? (row.cost / totals.cost) * 100 : 0;
          return (
            <div key={row.node} className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <code className="truncate max-w-[60%]">{row.node}</code>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <span>${row.cost.toFixed(4)}</span>
                  <Badge variant="secondary" className="text-[10px]">
                    {row.calls}×
                  </Badge>
                </div>
              </div>
              <div className="h-1.5 rounded bg-muted overflow-hidden">
                <div
                  className="h-full bg-primary/70"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

function Stat({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <Card className="p-2 bg-background/40 border-primary/10">
      <div className="flex items-center gap-1 text-[10px] text-muted-foreground uppercase">
        {icon} {label}
      </div>
      <div className="text-sm font-semibold">{value}</div>
    </Card>
  );
}
