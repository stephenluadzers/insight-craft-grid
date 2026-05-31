import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "./ui/dialog";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { ScrollArea } from "./ui/scroll-area";
import { Progress } from "./ui/progress";
import { Stethoscope, Loader2, AlertTriangle, AlertCircle, Info, CheckCircle2, Plus, Minus, ArrowRightLeft, Pencil, GitMerge, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface Issue {
  id: string;
  severity: "critical" | "high" | "medium" | "low";
  category: string;
  title: string;
  description: string;
  affectedNodeIds?: string[];
  recommendation: string;
}

interface Diagnosis {
  summary: string;
  healthScore: number;
  intent?: string;
  issues: Issue[];
  suggestions?: string[];
}

interface DiffEntry { nodeId: string; title?: string; reason: string; changes?: string; }
interface MergeEntry { intoNodeId: string; mergedNodeIds: string[]; reason: string; }
interface Diff {
  added?: DiffEntry[];
  removed?: DiffEntry[];
  modified?: DiffEntry[];
  reordered?: DiffEntry[];
  merged?: MergeEntry[];
}

interface DoctorResult {
  diagnosis: Diagnosis;
  diff: Diff;
  fixedWorkflow: { nodes: any[]; connections: any[] };
}

interface WorkflowDoctorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workflow: { nodes: any[]; connections?: any[] } | null;
  onApplyFix: (nodes: any[], connections: any[]) => void;
}

const severityStyles: Record<Issue["severity"], { icon: typeof AlertTriangle; color: string; bg: string }> = {
  critical: { icon: AlertTriangle, color: "text-destructive", bg: "bg-destructive/10 border-destructive/30" },
  high: { icon: AlertCircle, color: "text-orange-500", bg: "bg-orange-500/10 border-orange-500/30" },
  medium: { icon: Info, color: "text-yellow-500", bg: "bg-yellow-500/10 border-yellow-500/30" },
  low: { icon: Info, color: "text-muted-foreground", bg: "bg-muted/40 border-border" },
};

export const WorkflowDoctorDialog = ({ open, onOpenChange, workflow, onApplyFix }: WorkflowDoctorDialogProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<DoctorResult | null>(null);
  const [mode, setMode] = useState<"diagnose" | "fix">("fix");

  const runDiagnosis = async (selectedMode: "diagnose" | "fix") => {
    if (!workflow?.nodes?.length) {
      toast({ title: "Empty canvas", description: "Add some nodes first", variant: "destructive" });
      return;
    }
    setMode(selectedMode);
    setLoading(true);
    setResult(null);
    try {
      const { data, error } = await supabase.functions.invoke("diagnose-workflow", {
        body: { workflow: { nodes: workflow.nodes, connections: workflow.connections || [] } },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setResult(data as DoctorResult);
      toast({
        title: "Diagnosis complete",
        description: `Health score: ${data.diagnosis.healthScore}/100`,
      });
    } catch (e: any) {
      toast({ title: "Diagnosis failed", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const applyFix = () => {
    if (!result?.fixedWorkflow) return;
    onApplyFix(result.fixedWorkflow.nodes, result.fixedWorkflow.connections || []);
    toast({ title: "Fixes applied", description: "Your workflow has been healed" });
    onOpenChange(false);
    setResult(null);
  };

  const copyReport = async () => {
    if (!result) return;
    const r = result.diagnosis;
    const lines = [
      `Remora Flow — Workflow Diagnosis`,
      `Health Score: ${r.healthScore}/100`,
      r.intent ? `Detected intent: ${r.intent}` : "",
      ``,
      `Summary:`,
      r.summary,
      ``,
      `Issues (${r.issues?.length || 0}):`,
      ...(r.issues || []).map((i, idx) =>
        `${idx + 1}. [${i.severity.toUpperCase()}] ${i.title}\n   ${i.description}\n   Fix: ${i.recommendation}`
      ),
      r.suggestions?.length ? `\nOptional improvements:\n${r.suggestions.map((s) => `- ${s}`).join("\n")}` : "",
    ].filter(Boolean).join("\n");
    try {
      await navigator.clipboard.writeText(lines);
      toast({ title: "Report copied", description: "Diagnosis copied to clipboard" });
    } catch {
      toast({ title: "Copy failed", description: "Unable to access clipboard", variant: "destructive" });
    }
  };

  const healthColor = (score: number) =>
    score >= 80 ? "text-emerald-500" : score >= 60 ? "text-yellow-500" : score >= 40 ? "text-orange-500" : "text-destructive";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] bg-card/95 backdrop-blur-xl border-border">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Stethoscope className="w-5 h-5 text-primary" />
            Workflow Doctor
          </DialogTitle>
          <DialogDescription>
            Deep AI audit — finds logical gaps, missing steps, redundancies, and prescribes precise fixes.
          </DialogDescription>
        </DialogHeader>

        {!result && !loading && (
          <div className="flex flex-col items-center justify-center py-12 gap-4">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
              <Stethoscope className="w-10 h-10 text-primary" />
            </div>
            <p className="text-sm text-muted-foreground text-center max-w-md">
              I'll inspect your workflow across 7 dimensions: structure, logic, missing steps,
              redundancy, error handling, compliance, and conciseness — then propose a fully fixed version you can accept.
            </p>
            <div className="flex flex-col sm:flex-row gap-2 w-full max-w-md">
              <Button
                onClick={() => runDiagnosis("diagnose")}
                variant="outline"
                className="flex-1"
              >
                <Stethoscope className="w-4 h-4 mr-2" />
                Diagnose Only
              </Button>
              <Button
                onClick={() => runDiagnosis("fix")}
                className="flex-1 bg-gradient-accent text-primary-foreground"
              >
                <Sparkles className="w-4 h-4 mr-2" />
                Diagnose & Fix
              </Button>
            </div>
            <p className="text-[11px] text-muted-foreground text-center max-w-md">
              <strong>Diagnose Only</strong> just tells you what's wrong. <strong>Diagnose & Fix</strong> also generates a healed workflow you can apply.
            </p>
          </div>
        )}

        {loading && (
          <div className="flex flex-col items-center justify-center py-16 gap-4">
            <Loader2 className="w-10 h-10 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Reasoning about your workflow… this may take 30–90 seconds.</p>
          </div>
        )}

        {result && (
          <ScrollArea className="max-h-[65vh] pr-3">
            <div className="space-y-5">
              {/* Health */}
              <div className="rounded-xl border border-border bg-muted/30 p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Workflow health</span>
                  <span className={cn("text-2xl font-bold", healthColor(result.diagnosis.healthScore))}>
                    {result.diagnosis.healthScore}/100
                  </span>
                </div>
                <Progress value={result.diagnosis.healthScore} className="h-2" />
                <p className="text-sm text-muted-foreground mt-3">{result.diagnosis.summary}</p>
                {result.diagnosis.intent && (
                  <p className="text-xs text-muted-foreground mt-2 italic">
                    Detected intent: {result.diagnosis.intent}
                  </p>
                )}
              </div>

              {/* Issues */}
              {result.diagnosis.issues?.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold mb-2">
                    Issues found ({result.diagnosis.issues.length})
                  </h3>
                  <div className="space-y-2">
                    {result.diagnosis.issues.map((issue) => {
                      const s = severityStyles[issue.severity];
                      const Icon = s.icon;
                      return (
                        <div key={issue.id} className={cn("rounded-lg border p-3", s.bg)}>
                          <div className="flex items-start gap-2">
                            <Icon className={cn("w-4 h-4 mt-0.5 flex-shrink-0", s.color)} />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-sm font-medium">{issue.title}</span>
                                <Badge variant="outline" className="text-[10px] uppercase">
                                  {issue.severity}
                                </Badge>
                                <Badge variant="secondary" className="text-[10px]">
                                  {issue.category}
                                </Badge>
                              </div>
                              <p className="text-xs text-muted-foreground mt-1">{issue.description}</p>
                              <p className="text-xs mt-2">
                                <span className="font-medium">Fix:</span> {issue.recommendation}
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Diff */}
              <div>
                <h3 className="text-sm font-semibold mb-2">Proposed changes</h3>
                <div className="space-y-1.5 text-xs">
                  {result.diff?.added?.map((d, i) => (
                    <DiffRow key={`a${i}`} icon={Plus} color="text-emerald-500" label="Add" name={d.title || d.nodeId} reason={d.reason} />
                  ))}
                  {result.diff?.removed?.map((d, i) => (
                    <DiffRow key={`r${i}`} icon={Minus} color="text-destructive" label="Remove" name={d.title || d.nodeId} reason={d.reason} />
                  ))}
                  {result.diff?.modified?.map((d, i) => (
                    <DiffRow key={`m${i}`} icon={Pencil} color="text-yellow-500" label="Modify" name={d.nodeId} reason={`${d.changes} — ${d.reason}`} />
                  ))}
                  {result.diff?.reordered?.map((d, i) => (
                    <DiffRow key={`o${i}`} icon={ArrowRightLeft} color="text-blue-500" label="Reorder" name={d.nodeId} reason={d.reason} />
                  ))}
                  {result.diff?.merged?.map((d, i) => (
                    <DiffRow key={`g${i}`} icon={GitMerge} color="text-purple-500" label="Merge" name={`${d.mergedNodeIds.join(", ")} → ${d.intoNodeId}`} reason={d.reason} />
                  ))}
                  {!result.diff?.added?.length && !result.diff?.removed?.length && !result.diff?.modified?.length && !result.diff?.reordered?.length && !result.diff?.merged?.length && (
                    <div className="flex items-center gap-2 text-emerald-500">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>No changes needed — your workflow is healthy.</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Suggestions */}
              {result.diagnosis.suggestions && result.diagnosis.suggestions.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold mb-2">Optional improvements</h3>
                  <ul className="space-y-1 text-xs text-muted-foreground list-disc pl-5">
                    {result.diagnosis.suggestions.map((s, i) => <li key={i}>{s}</li>)}
                  </ul>
                </div>
              )}

              <div className="flex gap-2 pt-2 sticky bottom-0 bg-card/95 backdrop-blur-xl pb-1">
                <Button variant="outline" onClick={() => { setResult(null); }} className="flex-1">
                  Discard
                </Button>
                <Button onClick={runDiagnosis} variant="outline">
                  Re-diagnose
                </Button>
                <Button onClick={applyFix} className="flex-1 bg-gradient-accent text-primary-foreground">
                  <Sparkles className="w-4 h-4 mr-2" />
                  Apply All Fixes
                </Button>
              </div>
            </div>
          </ScrollArea>
        )}
      </DialogContent>
    </Dialog>
  );
};

const DiffRow = ({ icon: Icon, color, label, name, reason }: any) => (
  <div className="flex items-start gap-2 rounded-md px-2 py-1.5 bg-muted/30 border border-border/50">
    <Icon className={cn("w-3.5 h-3.5 mt-0.5 flex-shrink-0", color)} />
    <div className="flex-1 min-w-0">
      <span className={cn("font-medium mr-1.5", color)}>{label}</span>
      <span className="font-mono text-[11px]">{name}</span>
      <p className="text-muted-foreground mt-0.5">{reason}</p>
    </div>
  </div>
);
