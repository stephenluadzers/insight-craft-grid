import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Shield, Plus, Trash2, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { PiiScrubRule } from "@/types/workflow-governance";

interface Props {
  workspaceId: string;
}

const PRESETS: Array<{ name: string; pattern: string }> = [
  { name: "Email", pattern: "[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}" },
  { name: "US SSN", pattern: "\\b\\d{3}-\\d{2}-\\d{4}\\b" },
  { name: "Credit card", pattern: "\\b(?:\\d[ -]*?){13,16}\\b" },
  { name: "Phone (intl)", pattern: "\\+?[0-9]{1,3}[-. ]?\\(?[0-9]{1,4}\\)?[-. ]?[0-9]{3,4}[-. ]?[0-9]{4}" },
  { name: "API key-like", pattern: "(sk|pk|api|key)[-_][A-Za-z0-9]{16,}" },
];

/** Wave 4 — Manage regex-based PII redaction rules for logs and exports. */
export function PiiScrubbingPanel({ workspaceId }: Props) {
  const [rules, setRules] = useState<PiiScrubRule[]>([]);
  const [name, setName] = useState("");
  const [pattern, setPattern] = useState("");

  const load = async () => {
    const { data } = await supabase
      .from("pii_scrubbing_rules")
      .select("*")
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: false });
    setRules((data ?? []) as PiiScrubRule[]);
  };

  useEffect(() => {
    if (workspaceId) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspaceId]);

  const addRule = async (n: string, p: string) => {
    if (!n || !p) return;
    try {
      // Validate regex client-side
      new RegExp(p);
    } catch {
      return toast.error("Invalid regular expression");
    }
    const { error } = await supabase.from("pii_scrubbing_rules").insert({
      workspace_id: workspaceId,
      name: n,
      pattern: p,
    });
    if (error) return toast.error(error.message);
    toast.success(`Added "${n}" rule`);
    setName("");
    setPattern("");
    load();
  };

  const toggle = async (r: PiiScrubRule) => {
    await supabase
      .from("pii_scrubbing_rules")
      .update({ is_active: !r.is_active })
      .eq("id", r.id);
    load();
  };

  const remove = async (id: string) => {
    await supabase.from("pii_scrubbing_rules").delete().eq("id", id);
    load();
  };

  return (
    <Card className="p-4 space-y-3 backdrop-blur-xl bg-background/60 border-primary/20">
      <div className="flex items-center gap-2">
        <Shield className="h-4 w-4 text-primary" />
        <span className="font-medium text-sm">PII scrubbing rules</span>
        <Badge variant="secondary">{rules.filter((r) => r.is_active).length} active</Badge>
      </div>

      <div className="space-y-1">
        <Label className="text-xs">Quick presets</Label>
        <div className="flex flex-wrap gap-1">
          {PRESETS.map((p) => (
            <Button
              key={p.name}
              size="sm"
              variant="outline"
              className="h-7 text-xs"
              onClick={() => addRule(p.name, p.pattern)}
            >
              <ShieldCheck className="h-3 w-3 mr-1" /> {p.name}
            </Button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Input
          placeholder="Rule name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <Input
          placeholder="Regex pattern"
          value={pattern}
          onChange={(e) => setPattern(e.target.value)}
          className="font-mono text-xs"
        />
      </div>
      <Button size="sm" onClick={() => addRule(name, pattern)} disabled={!name || !pattern}>
        <Plus className="h-3 w-3 mr-1" /> Add rule
      </Button>

      <div className="space-y-2 max-h-72 overflow-auto">
        {rules.map((r) => (
          <div
            key={r.id}
            className="flex items-center gap-2 p-2 rounded border bg-background/40"
          >
            <Switch checked={r.is_active} onCheckedChange={() => toggle(r)} />
            <div className="flex-1 min-w-0">
              <div className="text-xs font-medium">{r.name}</div>
              <code className="text-[10px] text-muted-foreground truncate block">
                {r.pattern}
              </code>
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
        {rules.length === 0 && (
          <div className="text-xs text-muted-foreground text-center py-4">
            No rules yet — pick a preset above to start scrubbing.
          </div>
        )}
      </div>
    </Card>
  );
}

/** Apply all active workspace scrub rules to a string. Exported for reuse in log views. */
export function scrubText(text: string, rules: PiiScrubRule[]): string {
  let out = text;
  for (const r of rules) {
    if (!r.is_active) continue;
    try {
      out = out.replace(new RegExp(r.pattern, "g"), r.replacement);
    } catch {
      // skip invalid pattern
    }
  }
  return out;
}
