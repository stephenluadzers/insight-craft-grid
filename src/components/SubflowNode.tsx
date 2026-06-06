import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Workflow as WorkflowIcon, Plus, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface WorkflowOption {
  id: string;
  name: string;
}

interface SubflowNodeProps {
  parentWorkflowId: string;
  parentNodeId: string;
  initialChildId?: string;
  initialInputMapping?: Record<string, string>;
  initialOutputMapping?: Record<string, string>;
  onSave: (cfg: {
    child_workflow_id: string;
    input_mapping: Record<string, string>;
    output_mapping: Record<string, string>;
  }) => void;
}

/** Wave 3 — Configures a sub-workflow call within a parent flow. */
export function SubflowNode({
  parentWorkflowId,
  parentNodeId,
  initialChildId,
  initialInputMapping = {},
  initialOutputMapping = {},
  onSave,
}: SubflowNodeProps) {
  const [workflows, setWorkflows] = useState<WorkflowOption[]>([]);
  const [childId, setChildId] = useState(initialChildId ?? "");
  const [inputs, setInputs] = useState<Array<[string, string]>>(
    Object.entries(initialInputMapping)
  );
  const [outputs, setOutputs] = useState<Array<[string, string]>>(
    Object.entries(initialOutputMapping)
  );

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("workflows")
        .select("id,name")
        .neq("id", parentWorkflowId)
        .order("updated_at", { ascending: false })
        .limit(50);
      setWorkflows((data ?? []) as WorkflowOption[]);
    })();
  }, [parentWorkflowId]);

  const addRow = (set: typeof setInputs) =>
    set((prev) => [...prev, ["", ""]]);
  const removeRow = (set: typeof setInputs, idx: number) =>
    set((prev) => prev.filter((_, i) => i !== idx));
  const updateRow = (
    set: typeof setInputs,
    idx: number,
    side: 0 | 1,
    val: string
  ) =>
    set((prev) =>
      prev.map((row, i) => (i === idx ? (side === 0 ? [val, row[1]] : [row[0], val]) : row))
    );

  return (
    <Card className="p-4 space-y-3 backdrop-blur-xl bg-background/60 border-primary/20">
      <div className="flex items-center gap-2">
        <WorkflowIcon className="h-4 w-4 text-primary" />
        <span className="font-medium text-sm">Sub-workflow</span>
      </div>

      <div className="space-y-1">
        <Label className="text-xs">Child workflow</Label>
        <Select value={childId} onValueChange={setChildId}>
          <SelectTrigger>
            <SelectValue placeholder="Select a workflow…" />
          </SelectTrigger>
          <SelectContent>
            {workflows.map((w) => (
              <SelectItem key={w.id} value={w.id}>
                {w.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Mapping
        title="Input mapping (parent → child)"
        rows={inputs}
        onAdd={() => addRow(setInputs)}
        onRemove={(i) => removeRow(setInputs, i)}
        onUpdate={(i, side, v) => updateRow(setInputs, i, side, v)}
      />
      <Mapping
        title="Output mapping (child → parent)"
        rows={outputs}
        onAdd={() => addRow(setOutputs)}
        onRemove={(i) => removeRow(setOutputs, i)}
        onUpdate={(i, side, v) => updateRow(setOutputs, i, side, v)}
      />

      <Button
        size="sm"
        disabled={!childId}
        onClick={() =>
          onSave({
            child_workflow_id: childId,
            input_mapping: Object.fromEntries(inputs.filter(([k]) => k)),
            output_mapping: Object.fromEntries(outputs.filter(([k]) => k)),
          })
        }
      >
        Save sub-workflow
      </Button>
    </Card>
  );
}

function Mapping({
  title,
  rows,
  onAdd,
  onRemove,
  onUpdate,
}: {
  title: string;
  rows: Array<[string, string]>;
  onAdd: () => void;
  onRemove: (i: number) => void;
  onUpdate: (i: number, side: 0 | 1, v: string) => void;
}) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <Label className="text-xs">{title}</Label>
        <Button size="icon" variant="ghost" className="h-6 w-6" onClick={onAdd}>
          <Plus className="h-3 w-3" />
        </Button>
      </div>
      <div className="space-y-1">
        {rows.map(([k, v], i) => (
          <div key={i} className="flex items-center gap-1">
            <Input
              value={k}
              onChange={(e) => onUpdate(i, 0, e.target.value)}
              placeholder="source.path"
              className="h-7 text-xs"
            />
            <span className="text-xs">→</span>
            <Input
              value={v}
              onChange={(e) => onUpdate(i, 1, e.target.value)}
              placeholder="target.key"
              className="h-7 text-xs"
            />
            <Button
              size="icon"
              variant="ghost"
              className="h-6 w-6"
              onClick={() => onRemove(i)}
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
