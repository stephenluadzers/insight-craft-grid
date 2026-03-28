import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Bot, Sparkles, Download, Store, Loader2, CheckCircle2, ArrowRight, Package, FileJson } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface PipelineResult {
  name: string;
  version?: string;
  description: string;
  workflow: { nodes: any[]; connections: any[] };
  suggestions: any[];
  optimizationSummary: string;
  guardrails: { added: number; explanations: string[]; compliance: string[] };
  metadata: { nodeCount: number; hasErrorHandling: boolean; hasGuardrails: boolean };
  marketplace?: { templateId: string; listingId: string; status: string; message: string } | null;
}

export default function AIWorkflowPipeline({ onWorkflowGenerated }: { onWorkflowGenerated?: (nodes: any[]) => void }) {
  const [prompt, setPrompt] = useState("");
  const [isRunning, setIsRunning] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [result, setResult] = useState<PipelineResult | null>(null);
  const [publishToMarketplace, setPublishToMarketplace] = useState(false);
  const [priceCents, setPriceCents] = useState(0);
  const [tags, setTags] = useState("");
  const { toast } = useToast();

  const steps = ["Generate Workflow", "AI Optimization", "Guardrail Injection", "Export Package"];

  const handleRun = async () => {
    if (!prompt.trim()) return;
    setIsRunning(true);
    setCurrentStep(1);
    setResult(null);

    try {
      // Simulate step progression
      const stepTimer = setInterval(() => {
        setCurrentStep((s) => Math.min(s + 1, 4));
      }, 3000);

      const { data, error } = await supabase.functions.invoke("ai-workflow-pipeline", {
        body: {
          prompt,
          publishToMarketplace,
          price_cents: priceCents,
          tags: tags ? tags.split(",").map((t) => t.trim()) : undefined,
        },
      });

      clearInterval(stepTimer);
      setCurrentStep(4);

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setResult(data);
      onWorkflowGenerated?.(data.workflow.nodes);
      toast({ title: "Pipeline complete", description: `${data.metadata.nodeCount} nodes generated and optimized` });
    } catch (err: any) {
      toast({ title: "Pipeline failed", description: err.message, variant: "destructive" });
    } finally {
      setIsRunning(false);
    }
  };

  const handleDownload = () => {
    if (!result) return;
    const blob = new Blob([JSON.stringify(result, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${result.name.replace(/\s+/g, "-").toLowerCase()}-v${result.version || "1.0"}.json`;
    a.style.display = "none";
    document.body.appendChild(a);
    a.click();
    requestAnimationFrame(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    });
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <Card className="glass-strong border-0">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl">
            <Bot className="w-6 h-6 text-primary" />
            AI Workflow Pipeline
          </CardTitle>
          <CardDescription>
            Describe what you need → AI creates it → optimizes it → exports it ready to sell
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Prompt */}
          <div className="space-y-2">
            <Label htmlFor="pipeline-prompt">Describe your workflow</Label>
            <Textarea
              id="pipeline-prompt"
              placeholder="e.g., A customer onboarding pipeline that sends a welcome email, creates a CRM record, schedules a follow-up call, and tracks engagement metrics..."
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={4}
              className="resize-none"
            />
          </div>

          {/* Marketplace options */}
          <Separator />
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-sm font-medium">Publish to Marketplace</Label>
                <p className="text-xs text-muted-foreground">List this workflow for others to purchase</p>
              </div>
              <Switch checked={publishToMarketplace} onCheckedChange={setPublishToMarketplace} />
            </div>

            {publishToMarketplace && (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Price (cents)</Label>
                  <Input type="number" min={0} value={priceCents} onChange={(e) => setPriceCents(Number(e.target.value))} placeholder="0 = free" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Tags (comma separated)</Label>
                  <Input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="crm, email, onboarding" />
                </div>
              </div>
            )}
          </div>

          {/* Run button */}
          <Button onClick={handleRun} disabled={!prompt.trim() || isRunning} className="w-full" size="lg">
            {isRunning ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Running Pipeline...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                Create → Optimize → Export
              </>
            )}
          </Button>

          {/* Step progress */}
          {(isRunning || result) && (
            <div className="flex items-center gap-1 justify-between">
              {steps.map((step, i) => (
                <div key={step} className="flex items-center gap-1 flex-1">
                  <div className={`flex items-center gap-1 text-xs ${i < currentStep ? "text-primary" : "text-muted-foreground"}`}>
                    {i < currentStep ? <CheckCircle2 className="w-3.5 h-3.5" /> : <div className="w-3.5 h-3.5 rounded-full border border-muted-foreground/40" />}
                    <span className="hidden sm:inline">{step}</span>
                  </div>
                  {i < steps.length - 1 && <ArrowRight className="w-3 h-3 text-muted-foreground/40 ml-auto" />}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Results */}
      {result && (
        <div className="space-y-4">
          <Card className="glass border-0">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Package className="w-5 h-5 text-primary" />
                {result.name}
              </CardTitle>
              <CardDescription>{result.description}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Stats */}
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary">{result.metadata.nodeCount} nodes</Badge>
                {result.metadata.hasErrorHandling && <Badge variant="secondary">Error handling ✓</Badge>}
                {result.metadata.hasGuardrails && <Badge variant="secondary">{result.guardrails.added} guardrails</Badge>}
              </div>

              {/* Optimization summary */}
              {result.optimizationSummary && (
                <div className="rounded-lg p-3 glass-subtle text-sm">
                  <p className="font-medium text-xs text-muted-foreground mb-1">AI Optimization</p>
                  <p>{result.optimizationSummary}</p>
                </div>
              )}

              {/* Suggestions */}
              {result.suggestions?.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground">Suggestions</p>
                  {result.suggestions.map((s: any, i: number) => (
                    <div key={i} className="flex items-start gap-2 text-sm">
                      <Badge variant={s.impact === "high" ? "default" : "secondary"} className="text-[10px] mt-0.5 shrink-0">
                        {s.impact}
                      </Badge>
                      <span>{s.title}: {s.description}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Marketplace status */}
              {result.marketplace && (
                <div className="rounded-lg p-3 glass-subtle text-sm flex items-center gap-2">
                  <Store className="w-4 h-4 text-primary shrink-0" />
                  <span>{result.marketplace.message}</span>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2">
                <Button onClick={handleDownload} variant="outline" className="flex-1">
                  <FileJson className="w-4 h-4 mr-2" />
                  Download JSON
                </Button>
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    onWorkflowGenerated?.(result.workflow.nodes);
                    toast({ title: "Loaded", description: "Workflow loaded into canvas" });
                  }}
                >
                  <Download className="w-4 h-4 mr-2" />
                  Load to Canvas
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
