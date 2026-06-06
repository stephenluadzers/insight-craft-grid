import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Sparkles, Save, Loader2 } from "lucide-react";
import { toast } from "sonner";
import type { AgentWorker, OrchestrationMode } from "@/types/workflow-authoring";

interface AgentOrchestratorPanelProps {
  workflowId: string;
  nodeId: string;
}

const blankWorker = (): AgentWorker => ({
  name: "Worker",
  role: "researcher",
  system_prompt: "You are a helpful research assistant.",
  model: "google/gemini-2.5-flash",
});

/**
 * Wave 2 — Multi-agent orchestration node config.
 * Supervisor + workers, sequential / hierarchical / parallel mode.
 */
export const AgentOrchestratorPanel = ({ workflowId, nodeId }: AgentOrchestratorPanelProps) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [supervisor, setSupervisor] = useState({
    name: "Supervisor",
    system_prompt: "You coordinate a team of agents. Delegate tasks and synthesize their results.",
    model: "google/gemini-2.5-flash",
  });
  const [workers, setWorkers] = useState<AgentWorker[]>([blankWorker()]);
  const [mode, setMode] = useState<OrchestrationMode>("sequential");
  const [maxIter, setMaxIter] = useState(5);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("agent_orchestrations")
        .select("*")
        .eq("workflow_id", workflowId)
        .eq("node_id", nodeId)
        .maybeSingle();
      if (cancelled) return;
      if (data) {
        setSupervisor((data.supervisor_config as any) ?? supervisor);
        setWorkers(((data.worker_configs as any) ?? [blankWorker()]) as AgentWorker[]);
        setMode(data.mode as OrchestrationMode);
        setMaxIter(data.max_iterations);
      }
      setLoading(false);
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workflowId, nodeId]);

  const save = async () => {
    setSaving(true);
    const { error } = await supabase
      .from("agent_orchestrations")
      .upsert(
        {
          workflow_id: workflowId,
          node_id: nodeId,
          supervisor_config: supervisor,
          worker_configs: workers as any,
          mode,
          max_iterations: maxIter,
        },
        { onConflict: "workflow_id,node_id" },
      );
    setSaving(false);
    if (error) toast.error(error.message);
    else toast.success("Orchestration saved");
  };

  if (loading) return <p className="p-4 text-sm text-muted-foreground">Loading…</p>;

  return (
    <div className="space-y-4">
      <Card className="p-4 glass border-border/40 space-y-3">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-primary" />
          <h4 className="font-semibold text-sm">Supervisor</h4>
          <Badge variant="secondary" className="ml-auto">Coordinator</Badge>
        </div>
        <div className="space-y-2">
          <Label className="text-xs">Name</Label>
          <Input value={supervisor.name} onChange={(e) => setSupervisor((s) => ({ ...s, name: e.target.value }))} />
        </div>
        <div className="space-y-2">
          <Label className="text-xs">System prompt</Label>
          <Textarea
            rows={3}
            value={supervisor.system_prompt}
            onChange={(e) => setSupervisor((s) => ({ ...s, system_prompt: e.target.value }))}
          />
        </div>
      </Card>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label className="text-xs">Mode</Label>
          <Select value={mode} onValueChange={(v) => setMode(v as OrchestrationMode)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="sequential">Sequential</SelectItem>
              <SelectItem value="hierarchical">Hierarchical</SelectItem>
              <SelectItem value="parallel">Parallel</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Max iterations</Label>
          <Input type="number" min={1} max={20} value={maxIter} onChange={(e) => setMaxIter(Number(e.target.value))} />
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h4 className="font-semibold text-sm">Workers ({workers.length})</h4>
          <Button size="sm" variant="outline" onClick={() => setWorkers((w) => [...w, blankWorker()])}>
            <Plus className="w-3 h-3 mr-1" /> Add worker
          </Button>
        </div>
        {workers.map((w, idx) => (
          <Card key={idx} className="p-3 glass border-border/40 space-y-2">
            <div className="flex items-center gap-2">
              <Input
                value={w.name}
                onChange={(e) => setWorkers((arr) => arr.map((x, i) => i === idx ? { ...x, name: e.target.value } : x))}
                className="h-8 text-sm"
                placeholder="Worker name"
              />
              <Input
                value={w.role}
                onChange={(e) => setWorkers((arr) => arr.map((x, i) => i === idx ? { ...x, role: e.target.value } : x))}
                className="h-8 text-sm w-32"
                placeholder="role"
              />
              <Button size="icon" variant="ghost" onClick={() => setWorkers((arr) => arr.filter((_, i) => i !== idx))}>
                <Trash2 className="w-4 h-4 text-destructive" />
              </Button>
            </div>
            <Textarea
              rows={2}
              value={w.system_prompt}
              onChange={(e) => setWorkers((arr) => arr.map((x, i) => i === idx ? { ...x, system_prompt: e.target.value } : x))}
              placeholder="System prompt"
              className="text-xs"
            />
          </Card>
        ))}
      </div>

      <Button onClick={save} disabled={saving} className="w-full">
        {saving
          ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving…</>
          : <><Save className="w-4 h-4 mr-2" /> Save orchestration</>}
      </Button>
    </div>
  );
};
