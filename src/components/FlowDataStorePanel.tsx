import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Database, Plus, Trash2, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Row {
  id: string;
  store_key: string;
  value: unknown;
  expires_at: string | null;
  updated_at: string;
}

interface Props {
  workflowId: string;
}

/** Wave 3 — Per-workflow key/value scratch store. */
export function FlowDataStorePanel({ workflowId }: Props) {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [newKey, setNewKey] = useState("");
  const [newValue, setNewValue] = useState("");

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("flow_data_stores")
      .select("id, store_key, value, expires_at, updated_at")
      .eq("workflow_id", workflowId)
      .order("updated_at", { ascending: false });
    if (error) toast.error(error.message);
    setRows((data ?? []) as Row[]);
    setLoading(false);
  };

  useEffect(() => {
    if (workflowId) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workflowId]);

  const addEntry = async () => {
    if (!newKey) return;
    let parsed: unknown = newValue;
    try {
      parsed = JSON.parse(newValue);
    } catch {
      /* keep raw string */
    }
    const { error } = await supabase.from("flow_data_stores").upsert(
      {
        workflow_id: workflowId,
        store_key: newKey,
        value: parsed as any,
      },
      { onConflict: "workflow_id,store_key" }
    );
    if (error) return toast.error(error.message);
    toast.success(`Stored "${newKey}"`);
    setNewKey("");
    setNewValue("");
    load();
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("flow_data_stores").delete().eq("id", id);
    if (error) return toast.error(error.message);
    load();
  };

  return (
    <Card className="p-4 space-y-3 backdrop-blur-xl bg-background/60 border-primary/20">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Database className="h-4 w-4 text-primary" />
          <span className="font-medium text-sm">Workflow Data Store</span>
          <Badge variant="secondary">{rows.length}</Badge>
        </div>
        <Button size="icon" variant="ghost" onClick={load} disabled={loading}>
          <RefreshCw className={loading ? "h-3 w-3 animate-spin" : "h-3 w-3"} />
        </Button>
      </div>

      <div className="space-y-1">
        <Input
          placeholder="Key (e.g. counters.signup)"
          value={newKey}
          onChange={(e) => setNewKey(e.target.value)}
        />
        <Textarea
          placeholder='Value (JSON or string, e.g. {"count": 1})'
          value={newValue}
          onChange={(e) => setNewValue(e.target.value)}
          className="font-mono text-xs min-h-20"
        />
        <Button size="sm" onClick={addEntry} disabled={!newKey}>
          <Plus className="h-3 w-3 mr-1" /> Set value
        </Button>
      </div>

      <div className="space-y-2 max-h-72 overflow-auto">
        {rows.map((r) => (
          <div
            key={r.id}
            className="flex items-start gap-2 p-2 rounded border bg-background/40"
          >
            <div className="flex-1 min-w-0">
              <div className="text-xs font-mono font-semibold">{r.store_key}</div>
              <pre className="text-[10px] text-muted-foreground overflow-x-auto">
                {JSON.stringify(r.value, null, 2)}
              </pre>
            </div>
            <Button
              size="icon"
              variant="ghost"
              className="h-6 w-6"
              onClick={() => remove(r.id)}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        ))}
        {rows.length === 0 && !loading && (
          <div className="text-xs text-muted-foreground text-center py-4">
            No values yet — store anything your workflow needs to remember.
          </div>
        )}
      </div>
    </Card>
  );
}
