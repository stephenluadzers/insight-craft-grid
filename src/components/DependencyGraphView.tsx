import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Workflow as WorkflowIcon, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface Edge {
  parent_id: string;
  parent_name: string;
  child_id: string;
  child_name: string;
}

interface Props {
  workspaceId: string;
}

/** Wave 4 — Visualise cross-workflow dependencies (sub-workflow calls). */
export function DependencyGraphView({ workspaceId }: Props) {
  const [edges, setEdges] = useState<Edge[]>([]);

  useEffect(() => {
    (async () => {
      const { data: wfs } = await supabase
        .from("workflows")
        .select("id, name")
        .eq("workspace_id", workspaceId);
      const nameMap = new Map<string, string>(
        (wfs ?? []).map((w: any) => [w.id, w.name])
      );
      const wfIds = (wfs ?? []).map((w: any) => w.id);
      if (wfIds.length === 0) return;
      const { data: links } = await supabase
        .from("subworkflow_links")
        .select("parent_workflow_id, child_workflow_id")
        .in("parent_workflow_id", wfIds);
      setEdges(
        (links ?? []).map((l: any) => ({
          parent_id: l.parent_workflow_id,
          parent_name: nameMap.get(l.parent_workflow_id) ?? "?",
          child_id: l.child_workflow_id,
          child_name: nameMap.get(l.child_workflow_id) ?? "?",
        }))
      );
    })();
  }, [workspaceId]);

  const byParent = useMemo(() => {
    const map = new Map<string, Edge[]>();
    edges.forEach((e) => {
      const arr = map.get(e.parent_id) ?? [];
      arr.push(e);
      map.set(e.parent_id, arr);
    });
    return Array.from(map.values());
  }, [edges]);

  return (
    <Card className="p-4 space-y-3 backdrop-blur-xl bg-background/60 border-primary/20">
      <div className="flex items-center gap-2">
        <WorkflowIcon className="h-4 w-4 text-primary" />
        <span className="font-medium text-sm">Cross-workflow dependencies</span>
        <Badge variant="secondary">{edges.length}</Badge>
      </div>

      {byParent.length === 0 ? (
        <div className="text-xs text-muted-foreground text-center py-6">
          No sub-workflow links yet.
        </div>
      ) : (
        <div className="space-y-3 max-h-80 overflow-auto">
          {byParent.map((group) => (
            <div key={group[0].parent_id} className="space-y-1">
              <div className="flex items-center gap-2 text-sm font-medium">
                <WorkflowIcon className="h-3 w-3 text-primary" />
                {group[0].parent_name}
              </div>
              <div className="ml-5 space-y-1">
                {group.map((e, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-2 text-xs text-muted-foreground"
                  >
                    <ArrowRight className="h-3 w-3" />
                    {e.child_name}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
