import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sparkles, Loader2, Plus, CheckCircle2, XCircle, MinusCircle, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import type { TestCaseCategory, TestStatus, WorkflowTestCase } from "@/types/workflow-authoring";

interface TestCaseManagerProps {
  workflowId: string;
}

const categoryColor: Record<TestCaseCategory, string> = {
  happy_path: "bg-emerald-500/15 text-emerald-500 border-emerald-500/30",
  edge_case: "bg-amber-500/15 text-amber-500 border-amber-500/30",
  error_case: "bg-destructive/15 text-destructive border-destructive/30",
  load: "bg-primary/15 text-primary border-primary/30",
};

const statusIcon = (status: TestStatus | null) => {
  switch (status) {
    case "passed": return <CheckCircle2 className="w-4 h-4 text-emerald-500" />;
    case "failed": return <XCircle className="w-4 h-4 text-destructive" />;
    case "error":  return <AlertTriangle className="w-4 h-4 text-amber-500" />;
    case "skipped":return <MinusCircle className="w-4 h-4 text-muted-foreground" />;
    default:       return <MinusCircle className="w-4 h-4 text-muted-foreground/40" />;
  }
};

/**
 * Wave 2 — AI test-case generator UI.
 * Auto-synthesizes happy + edge cases, lets you run all and see status.
 */
export const TestCaseManager = ({ workflowId }: TestCaseManagerProps) => {
  const [cases, setCases] = useState<WorkflowTestCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  const fetchCases = async () => {
    const { data, error } = await supabase
      .from("workflow_test_cases")
      .select("*")
      .eq("workflow_id", workflowId)
      .order("created_at", { ascending: false });
    if (error) { toast.error(error.message); return; }
    setCases((data ?? []) as unknown as WorkflowTestCase[]);
  };

  useEffect(() => {
    setLoading(true);
    fetchCases().finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workflowId]);

  const generate = async () => {
    setGenerating(true);
    const { error, data } = await supabase.functions.invoke("generate-test-cases", {
      body: { workflowId, count: 6 },
    });
    setGenerating(false);
    if (error) { toast.error(error.message); return; }
    toast.success(`Generated ${data?.created ?? 0} test cases`);
    fetchCases();
  };

  const stats = cases.reduce(
    (acc, c) => {
      if (c.last_status === "passed") acc.passed++;
      else if (c.last_status === "failed") acc.failed++;
      return acc;
    },
    { passed: 0, failed: 0 },
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold">Test cases</h3>
          <p className="text-xs text-muted-foreground">
            {cases.length} total · {stats.passed} passed · {stats.failed} failed
          </p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={generate} disabled={generating}>
            {generating
              ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Generating…</>
              : <><Sparkles className="w-4 h-4 mr-2" /> AI generate</>}
          </Button>
        </div>
      </div>

      <ScrollArea className="h-[420px] pr-2">
        {loading && <p className="text-sm text-muted-foreground p-4">Loading…</p>}
        {!loading && cases.length === 0 && (
          <Card className="p-6 text-center glass">
            <Sparkles className="w-8 h-8 mx-auto mb-2 text-primary" />
            <p className="text-sm font-medium">No test cases yet</p>
            <p className="text-xs text-muted-foreground mt-1">
              Let AI synthesize happy and edge-case inputs in one click.
            </p>
            <Button size="sm" className="mt-3" onClick={generate} disabled={generating}>
              <Plus className="w-4 h-4 mr-1" /> Generate test suite
            </Button>
          </Card>
        )}
        <div className="space-y-2">
          {cases.map((tc) => (
            <Card key={tc.id} className="p-3 glass border-border/40 flex items-center gap-3">
              {statusIcon(tc.last_status)}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium truncate">{tc.name}</p>
                  <Badge variant="outline" className={categoryColor[tc.category]}>
                    {tc.category.replace("_", " ")}
                  </Badge>
                  {tc.ai_generated && <Badge variant="secondary" className="text-[10px]">AI</Badge>}
                </div>
                {tc.description && (
                  <p className="text-xs text-muted-foreground truncate mt-0.5">{tc.description}</p>
                )}
              </div>
              {tc.last_duration_ms != null && (
                <span className="text-xs text-muted-foreground tabular-nums">
                  {tc.last_duration_ms}ms
                </span>
              )}
            </Card>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
};
