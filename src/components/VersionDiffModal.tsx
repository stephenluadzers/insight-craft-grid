import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { GitCompareArrows } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface Version {
  id: string;
  version_number: number;
  nodes: any;
  edges: any;
  created_at: string;
}

interface Props {
  workflowId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** Wave 4 — Diff two workflow versions side-by-side. */
export function VersionDiffModal({ workflowId, open, onOpenChange }: Props) {
  const [versions, setVersions] = useState<Version[]>([]);
  const [leftId, setLeftId] = useState<string>("");
  const [rightId, setRightId] = useState<string>("");

  useEffect(() => {
    if (!open) return;
    (async () => {
      const { data } = await supabase
        .from("workflow_versions")
        .select("id, version_number, nodes, edges, created_at")
        .eq("workflow_id", workflowId)
        .order("version_number", { ascending: false })
        .limit(20);
      const list = (data ?? []) as Version[];
      setVersions(list);
      if (list[1]) setLeftId(list[1].id);
      if (list[0]) setRightId(list[0].id);
    })();
  }, [workflowId, open]);

  const left = versions.find((v) => v.id === leftId);
  const right = versions.find((v) => v.id === rightId);

  const diff = useMemo(() => {
    if (!left || !right) return null;
    const lNodes = new Map<string, any>((left.nodes ?? []).map((n: any) => [n.id, n]));
    const rNodes = new Map<string, any>((right.nodes ?? []).map((n: any) => [n.id, n]));
    const added: string[] = [];
    const removed: string[] = [];
    const changed: string[] = [];
    rNodes.forEach((n, id) => {
      if (!lNodes.has(id)) added.push(id);
      else if (JSON.stringify(n) !== JSON.stringify(lNodes.get(id))) changed.push(id);
    });
    lNodes.forEach((_, id) => {
      if (!rNodes.has(id)) removed.push(id);
    });
    return { added, removed, changed };
  }, [left, right]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl backdrop-blur-xl bg-background/80">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <GitCompareArrows className="h-4 w-4" /> Version diff
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-3">
          <VersionPicker
            label="Base"
            versions={versions}
            value={leftId}
            onChange={setLeftId}
          />
          <VersionPicker
            label="Compare"
            versions={versions}
            value={rightId}
            onChange={setRightId}
          />
        </div>

        {diff && (
          <Card className="p-3 space-y-2">
            <div className="flex gap-2 text-xs">
              <Badge className="bg-emerald-500/20 text-emerald-200 border-emerald-500/40">
                +{diff.added.length} added
              </Badge>
              <Badge className="bg-rose-500/20 text-rose-200 border-rose-500/40">
                −{diff.removed.length} removed
              </Badge>
              <Badge className="bg-amber-500/20 text-amber-200 border-amber-500/40">
                ~{diff.changed.length} changed
              </Badge>
            </div>
            <div className="grid grid-cols-3 gap-2 text-xs max-h-72 overflow-auto">
              <DiffList title="Added" items={diff.added} color="text-emerald-300" />
              <DiffList title="Removed" items={diff.removed} color="text-rose-300" />
              <DiffList title="Changed" items={diff.changed} color="text-amber-300" />
            </div>
          </Card>
        )}
      </DialogContent>
    </Dialog>
  );
}

function VersionPicker({
  label,
  versions,
  value,
  onChange,
}: {
  label: string;
  versions: Version[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-1">
      <div className="text-xs text-muted-foreground">{label}</div>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger>
          <SelectValue placeholder="Select version" />
        </SelectTrigger>
        <SelectContent>
          {versions.map((v) => (
            <SelectItem key={v.id} value={v.id}>
              v{v.version_number} — {new Date(v.created_at).toLocaleString()}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function DiffList({
  title,
  items,
  color,
}: {
  title: string;
  items: string[];
  color: string;
}) {
  return (
    <div>
      <div className={`text-[10px] font-medium uppercase mb-1 ${color}`}>{title}</div>
      <div className="space-y-1">
        {items.length === 0 && <div className="text-muted-foreground">—</div>}
        {items.map((id) => (
          <code key={id} className="block truncate">
            {id}
          </code>
        ))}
      </div>
    </div>
  );
}
