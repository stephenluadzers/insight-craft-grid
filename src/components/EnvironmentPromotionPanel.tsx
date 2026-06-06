import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, GitBranch, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { Environment, WorkflowEnvironment } from "@/types/workflow-governance";

interface Props {
  workflowId: string;
  workspaceId: string;
}

const ENV_ORDER: Environment[] = ["dev", "staging", "prod"];
const ENV_COLOR: Record<Environment, string> = {
  dev: "bg-sky-500/15 text-sky-200 border-sky-500/40",
  staging: "bg-amber-500/15 text-amber-200 border-amber-500/40",
  prod: "bg-emerald-500/15 text-emerald-200 border-emerald-500/40",
};

/** Wave 4 — Promote a workflow version through dev → staging → prod. */
export function EnvironmentPromotionPanel({ workflowId, workspaceId }: Props) {
  const [envs, setEnvs] = useState<Record<Environment, WorkflowEnvironment | null>>({
    dev: null,
    staging: null,
    prod: null,
  });
  const [versionId, setVersionId] = useState<string | null>(null);

  const load = async () => {
    const { data } = await supabase
      .from("workflow_environments")
      .select("*")
      .eq("workflow_id", workflowId);
    const map: Record<Environment, WorkflowEnvironment | null> = {
      dev: null,
      staging: null,
      prod: null,
    };
    (data ?? []).forEach((e: any) => {
      map[e.environment as Environment] = e;
    });
    setEnvs(map);

    const { data: latest } = await supabase
      .from("workflow_versions")
      .select("id")
      .eq("workflow_id", workflowId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    setVersionId(latest?.id ?? null);
  };

  useEffect(() => {
    if (workflowId) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workflowId]);

  const promote = async (target: Environment) => {
    if (!versionId) return toast.error("Save a version first");
    const { data: userData } = await supabase.auth.getUser();
    const { error } = await supabase
      .from("workflow_environments")
      .upsert(
        {
          workflow_id: workflowId,
          workspace_id: workspaceId,
          environment: target,
          version_id: versionId,
          promoted_by: userData.user!.id,
          promoted_at: new Date().toISOString(),
          is_active: true,
        },
        { onConflict: "workflow_id,environment" }
      );
    if (error) return toast.error(error.message);
    await supabase.from("governance_events").insert({
      workspace_id: workspaceId,
      workflow_id: workflowId,
      actor_id: userData.user!.id,
      event_type: "environment.promote",
      severity: target === "prod" ? "warning" : "info",
      summary: `Promoted version to ${target}`,
      metadata: { environment: target, version_id: versionId },
    });
    toast.success(`Promoted to ${target}`);
    load();
  };

  return (
    <Card className="p-4 space-y-3 backdrop-blur-xl bg-background/60 border-primary/20">
      <div className="flex items-center gap-2">
        <GitBranch className="h-4 w-4 text-primary" />
        <span className="font-medium text-sm">Environment promotion</span>
      </div>
      <div className="flex items-stretch gap-2">
        {ENV_ORDER.map((env, idx) => {
          const cur = envs[env];
          return (
            <div key={env} className="flex items-center gap-2 flex-1">
              <Card className={`p-3 flex-1 border ${ENV_COLOR[env]}`}>
                <div className="flex items-center justify-between mb-1">
                  <Badge variant="outline" className="uppercase text-[10px]">
                    {env}
                  </Badge>
                  {cur && <CheckCircle2 className="h-3 w-3 opacity-70" />}
                </div>
                <div className="text-[10px] opacity-80">
                  {cur ? `v${cur.version_id?.slice(0, 8)}` : "—"}
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  className="w-full mt-2 h-7 text-xs"
                  onClick={() => promote(env)}
                >
                  Promote here
                </Button>
              </Card>
              {idx < ENV_ORDER.length - 1 && (
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
              )}
            </div>
          );
        })}
      </div>
    </Card>
  );
}
