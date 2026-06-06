import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Shield, AlertTriangle, Info, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { GovernanceEvent, GovernanceSeverity } from "@/types/workflow-governance";
import { formatDistanceToNow } from "date-fns";

interface Props {
  workspaceId: string;
  workflowId?: string;
}

const SEVERITY_ICON: Record<GovernanceSeverity, React.ReactNode> = {
  info: <Info className="h-3 w-3 text-sky-400" />,
  warning: <AlertTriangle className="h-3 w-3 text-amber-400" />,
  critical: <AlertCircle className="h-3 w-3 text-destructive" />,
};

/** Wave 4 — Audit log of governance-relevant events. */
export function GovernanceTimeline({ workspaceId, workflowId }: Props) {
  const [events, setEvents] = useState<GovernanceEvent[]>([]);
  const [filter, setFilter] = useState<GovernanceSeverity | "all">("all");

  const load = async () => {
    let q = supabase
      .from("governance_events")
      .select("*")
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: false })
      .limit(100);
    if (workflowId) q = q.eq("workflow_id", workflowId);
    const { data } = await q;
    setEvents((data ?? []) as GovernanceEvent[]);
  };

  useEffect(() => {
    if (workspaceId) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspaceId, workflowId]);

  const filtered = events.filter((e) => filter === "all" || e.severity === filter);

  return (
    <Card className="p-4 space-y-3 backdrop-blur-xl bg-background/60 border-primary/20">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield className="h-4 w-4 text-primary" />
          <span className="font-medium text-sm">Governance timeline</span>
          <Badge variant="secondary">{events.length}</Badge>
        </div>
        <div className="flex gap-1">
          {(["all", "info", "warning", "critical"] as const).map((sev) => (
            <Button
              key={sev}
              size="sm"
              variant={filter === sev ? "default" : "ghost"}
              className="h-7 text-xs px-2"
              onClick={() => setFilter(sev)}
            >
              {sev}
            </Button>
          ))}
        </div>
      </div>

      <ScrollArea className="h-80">
        <div className="space-y-2">
          {filtered.map((e) => (
            <div
              key={e.id}
              className="flex items-start gap-2 p-2 rounded border bg-background/40"
            >
              <div className="mt-0.5">{SEVERITY_ICON[e.severity]}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 text-xs">
                  <span className="font-medium">{e.event_type}</span>
                  <span className="text-muted-foreground">
                    {formatDistanceToNow(new Date(e.created_at), { addSuffix: true })}
                  </span>
                </div>
                <div className="text-xs text-muted-foreground">{e.summary}</div>
              </div>
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="text-xs text-muted-foreground text-center py-6">
              No governance events.
            </div>
          )}
        </div>
      </ScrollArea>
    </Card>
  );
}
