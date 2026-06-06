import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sparkles, AlertCircle, Wand2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import type { FailureDiagnosis } from "@/types/workflow-debug";

interface FailureForensicsCardProps {
  workflowId: string;
  executionId: string;
  nodeId: string;
  onApplyFix?: (patch: Record<string, unknown>) => void;
}

/**
 * Wave 1 — Failure Forensics AI card.
 * Calls the `failure-forensics` edge function which uses Gemini to explain
 * a failed step and propose a one-click patch.
 */
export const FailureForensicsCard = ({
  workflowId,
  executionId,
  nodeId,
  onApplyFix,
}: FailureForensicsCardProps) => {
  const [loading, setLoading] = useState(false);
  const [diagnosis, setDiagnosis] = useState<FailureDiagnosis | null>(null);

  const diagnose = async () => {
    setLoading(true);
    const { data, error } = await supabase.functions.invoke("failure-forensics", {
      body: { executionId, nodeId, workflowId },
    });
    setLoading(false);
    if (error) { toast.error(error.message); return; }
    setDiagnosis(data?.diagnosis ?? null);
  };

  return (
    <div className="space-y-3 p-4 glass rounded-xl border border-destructive/40">
      <div className="flex items-center gap-2">
        <AlertCircle className="w-4 h-4 text-destructive" />
        <h4 className="font-semibold text-sm">Failure Forensics</h4>
        {diagnosis?.confidence != null && (
          <Badge variant="outline" className="ml-auto">
            {Math.round((diagnosis.confidence ?? 0) * 100)}% confident
          </Badge>
        )}
      </div>

      {!diagnosis && (
        <Button onClick={diagnose} disabled={loading} size="sm" className="w-full">
          {loading
            ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Diagnosing…</>
            : <><Sparkles className="w-4 h-4 mr-2" /> Diagnose with AI</>}
        </Button>
      )}

      {diagnosis && (
        <div className="space-y-2 text-sm">
          <p className="font-medium">{diagnosis.root_cause}</p>
          <p className="text-muted-foreground text-xs leading-relaxed">{diagnosis.explanation}</p>
          {diagnosis.suggested_fix?.summary && (
            <div className="p-2 rounded-lg bg-primary/5 border border-primary/20 text-xs">
              <span className="font-medium">Suggested fix:</span> {diagnosis.suggested_fix.summary}
            </div>
          )}
          {diagnosis.suggested_fix?.patch?.config && onApplyFix && (
            <Button
              size="sm"
              variant="secondary"
              className="w-full"
              onClick={() => onApplyFix(diagnosis.suggested_fix!.patch!.config!)}
            >
              <Wand2 className="w-4 h-4 mr-2" /> Apply patch
            </Button>
          )}
        </div>
      )}
    </div>
  );
};
