import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { RefreshCw, Save } from "lucide-react";
import {
  RETRY_ERROR_PRESETS,
  type BackoffStrategy,
  type StepRetryPolicy,
} from "@/types/workflow-debug";

interface RetryPolicyPanelProps {
  workflowId: string;
  nodeId: string;
  nodeTitle?: string;
}

const DEFAULTS: Omit<StepRetryPolicy, "workflow_id" | "node_id"> = {
  max_attempts: 3,
  backoff_strategy: "exponential",
  initial_delay_ms: 1000,
  max_delay_ms: 60000,
  retry_on_errors: ["timeout", "network", "5xx"],
  enabled: true,
};

export const RetryPolicyPanel = ({ workflowId, nodeId, nodeTitle }: RetryPolicyPanelProps) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [policy, setPolicy] = useState<Omit<StepRetryPolicy, "workflow_id" | "node_id">>(DEFAULTS);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("workflow_step_retries")
        .select("*")
        .eq("workflow_id", workflowId)
        .eq("node_id", nodeId)
        .maybeSingle();
      if (cancelled) return;
      if (data) {
        setPolicy({
          max_attempts: data.max_attempts,
          backoff_strategy: data.backoff_strategy as BackoffStrategy,
          initial_delay_ms: data.initial_delay_ms,
          max_delay_ms: data.max_delay_ms,
          retry_on_errors: data.retry_on_errors ?? [],
          enabled: data.enabled,
        });
      }
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [workflowId, nodeId]);

  const toggleError = (err: string) => {
    setPolicy((p) => ({
      ...p,
      retry_on_errors: p.retry_on_errors.includes(err)
        ? p.retry_on_errors.filter((e) => e !== err)
        : [...p.retry_on_errors, err],
    }));
  };

  const save = async () => {
    setSaving(true);
    const { error } = await supabase
      .from("workflow_step_retries")
      .upsert(
        { workflow_id: workflowId, node_id: nodeId, ...policy },
        { onConflict: "workflow_id,node_id" },
      );
    setSaving(false);
    if (error) toast.error(error.message);
    else toast.success("Retry policy saved");
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground p-4">
        <RefreshCw className="w-4 h-4 animate-spin" /> Loading retry policy…
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4 glass rounded-xl border border-border/50">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="font-semibold text-sm">Retry policy</h4>
          {nodeTitle && <p className="text-xs text-muted-foreground">{nodeTitle}</p>}
        </div>
        <Switch
          checked={policy.enabled}
          onCheckedChange={(v) => setPolicy((p) => ({ ...p, enabled: v }))}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label className="text-xs">Max attempts</Label>
          <Input
            type="number"
            min={1}
            max={20}
            value={policy.max_attempts}
            onChange={(e) => setPolicy((p) => ({ ...p, max_attempts: Number(e.target.value) }))}
            disabled={!policy.enabled}
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Backoff</Label>
          <Select
            value={policy.backoff_strategy}
            onValueChange={(v) => setPolicy((p) => ({ ...p, backoff_strategy: v as BackoffStrategy }))}
            disabled={!policy.enabled}
          >
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">None</SelectItem>
              <SelectItem value="linear">Linear</SelectItem>
              <SelectItem value="exponential">Exponential</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Initial delay (ms)</Label>
          <Input
            type="number"
            value={policy.initial_delay_ms}
            onChange={(e) => setPolicy((p) => ({ ...p, initial_delay_ms: Number(e.target.value) }))}
            disabled={!policy.enabled}
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Max delay (ms)</Label>
          <Input
            type="number"
            value={policy.max_delay_ms}
            onChange={(e) => setPolicy((p) => ({ ...p, max_delay_ms: Number(e.target.value) }))}
            disabled={!policy.enabled}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label className="text-xs">Retry on errors</Label>
        <div className="flex flex-wrap gap-2">
          {RETRY_ERROR_PRESETS.map((err) => {
            const on = policy.retry_on_errors.includes(err);
            return (
              <Badge
                key={err}
                variant={on ? "default" : "outline"}
                className="cursor-pointer select-none"
                onClick={() => policy.enabled && toggleError(err)}
              >
                {err}
              </Badge>
            );
          })}
        </div>
      </div>

      <Button onClick={save} disabled={saving} className="w-full" size="sm">
        <Save className="w-4 h-4 mr-2" /> {saving ? "Saving…" : "Save policy"}
      </Button>
    </div>
  );
};
