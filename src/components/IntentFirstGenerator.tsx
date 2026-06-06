import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sparkles, Loader2, ArrowRight, ShieldAlert, KeyRound } from "lucide-react";
import { toast } from "sonner";

interface IntentFirstGeneratorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onApply?: (workflow: GeneratedWorkflow) => void;
}

export interface GeneratedWorkflow {
  name: string;
  summary?: string;
  nodes: Array<Record<string, any>>;
  connections: Array<{ from: string; to: string; branch?: "success" | "error" }>;
  credentials_needed?: string[];
  next_steps?: string[];
}

/**
 * Wave 2 — Intent-first generator v2.
 * Single prompt → complete flow with error branches, retries, credential
 * placeholders. Beats flat Zapier/Tray output.
 */
export const IntentFirstGenerator = ({ open, onOpenChange, onApply }: IntentFirstGeneratorProps) => {
  const [intent, setIntent] = useState("");
  const [loading, setLoading] = useState(false);
  const [draft, setDraft] = useState<GeneratedWorkflow | null>(null);

  const generate = async () => {
    if (!intent.trim()) return;
    setLoading(true);
    setDraft(null);
    const { data, error } = await supabase.functions.invoke("intent-to-flow-v2", {
      body: { intent },
    });
    setLoading(false);
    if (error) { toast.error(error.message); return; }
    if (!data?.workflow) { toast.error("No workflow returned"); return; }
    setDraft(data.workflow as GeneratedWorkflow);
  };

  const errorBranches = draft?.connections.filter((c) => c.branch === "error").length ?? 0;
  const retryNodes = draft?.nodes.filter((n: any) => n.retry).length ?? 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl glass border-border/40">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" /> Intent-first generator
          </DialogTitle>
          <DialogDescription>
            Describe what you want in plain English. We'll draft a complete flow
            with error branches, retries, and credential placeholders.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Textarea
            value={intent}
            onChange={(e) => setIntent(e.target.value)}
            placeholder='e.g. "When a new Stripe payment succeeds, fetch the customer from HubSpot, generate a thank-you email with AI, and send it via Resend."'
            rows={4}
            className="resize-none"
          />

          <Button onClick={generate} disabled={loading || !intent.trim()} className="w-full">
            {loading
              ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Drafting workflow…</>
              : <><Sparkles className="w-4 h-4 mr-2" /> Draft workflow</>}
          </Button>

          {draft && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="secondary">{draft.nodes.length} nodes</Badge>
                <Badge variant="secondary">{draft.connections.length} edges</Badge>
                <Badge variant="outline" className="text-destructive border-destructive/40">
                  <ShieldAlert className="w-3 h-3 mr-1" /> {errorBranches} error branches
                </Badge>
                <Badge variant="outline">{retryNodes} retry policies</Badge>
                {draft.credentials_needed && draft.credentials_needed.length > 0 && (
                  <Badge variant="outline">
                    <KeyRound className="w-3 h-3 mr-1" /> {draft.credentials_needed.length} credentials
                  </Badge>
                )}
              </div>

              <div className="p-3 glass rounded-lg border border-border/40">
                <h4 className="font-semibold text-sm">{draft.name}</h4>
                {draft.summary && (
                  <p className="text-xs text-muted-foreground mt-1">{draft.summary}</p>
                )}
              </div>

              <ScrollArea className="h-48 glass rounded-lg border border-border/40 p-3">
                <ol className="space-y-1.5 text-xs">
                  {draft.nodes.map((n: any, idx: number) => (
                    <li key={n.id ?? idx} className="flex items-center gap-2">
                      <span className="text-muted-foreground tabular-nums">{idx + 1}.</span>
                      <Badge variant="outline" className="text-[10px]">{n.type}</Badge>
                      <span className="truncate">{n.title}</span>
                      {n.retry && <Badge variant="secondary" className="text-[10px]">retry×{n.retry.max_attempts}</Badge>}
                    </li>
                  ))}
                </ol>
              </ScrollArea>

              <Button
                onClick={() => { onApply?.(draft); onOpenChange(false); }}
                className="w-full"
              >
                <ArrowRight className="w-4 h-4 mr-2" /> Apply to canvas
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
