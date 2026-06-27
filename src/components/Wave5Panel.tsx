import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { Mic, ScanText, Database, CreditCard, Radio, Sparkles, Eye, Loader2 } from "lucide-react";
import { toast } from "sonner";

type Tab = "voice" | "vision" | "cdc" | "payments" | "iot" | "finetune" | "competitors";

export const Wave5Panel = () => {
  const [tab, setTab] = useState<Tab>("voice");
  const [busy, setBusy] = useState(false);
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  const [result, setResult] = useState<any>(null);

  // Vision
  const [imageUrl, setImageUrl] = useState("");
  const [jobType, setJobType] = useState<"ocr" | "classify" | "detect" | "extract_fields">("ocr");
  // Competitors
  const [compName, setCompName] = useState("");
  const [compDomain, setCompDomain] = useState("");
  const [targets, setTargets] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      const { data: prof } = await supabase
        .from("profiles").select("default_workspace_id").eq("id", data.user?.id ?? "").maybeSingle();
      setWorkspaceId(prof?.default_workspace_id ?? null);
    })();
  }, []);

  const call = async (fn: string, body: any) => {
    setBusy(true); setResult(null);
    try {
      const { data, error } = await supabase.functions.invoke(fn, { body });
      if (error) throw error;
      setResult(data);
      toast.success(`${fn} succeeded`);
      return data;
    } catch (e: any) {
      toast.error(e.message ?? "Request failed");
    } finally { setBusy(false); }
  };

  const loadCompetitors = async () => {
    if (!workspaceId) return;
    const data = await call("competitor-intel", { action: "list", workspace_id: workspaceId });
    setTargets(data?.targets ?? []);
  };

  return (
    <Card className="p-6 backdrop-blur-xl bg-background/60 border-border/50">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-2xl font-semibold">Advanced Capabilities</h2>
          <p className="text-sm text-muted-foreground">Voice, vision, CDC, payments, IoT, fine-tuning & competitor intel</p>
        </div>
        <Badge variant="secondary">Wave 5</Badge>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as Tab)}>
        <TabsList className="grid grid-cols-7 mb-4">
          <TabsTrigger value="voice"><Mic className="h-4 w-4 mr-1" />Voice</TabsTrigger>
          <TabsTrigger value="vision"><ScanText className="h-4 w-4 mr-1" />Vision</TabsTrigger>
          <TabsTrigger value="cdc"><Database className="h-4 w-4 mr-1" />CDC</TabsTrigger>
          <TabsTrigger value="payments"><CreditCard className="h-4 w-4 mr-1" />Pay</TabsTrigger>
          <TabsTrigger value="iot"><Radio className="h-4 w-4 mr-1" />IoT</TabsTrigger>
          <TabsTrigger value="finetune"><Sparkles className="h-4 w-4 mr-1" />Tune</TabsTrigger>
          <TabsTrigger value="competitors"><Eye className="h-4 w-4 mr-1" />Spy</TabsTrigger>
        </TabsList>

        <TabsContent value="voice" className="space-y-3">
          <p className="text-sm text-muted-foreground">Mint an OpenAI Realtime session token for bidirectional WebRTC voice. Use the token in a browser WebRTC client.</p>
          <Button disabled={busy || !workspaceId} onClick={() => call("voice-realtime-session", { workspace_id: workspaceId })}>
            {busy ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Mic className="h-4 w-4 mr-2" />}
            Create Session
          </Button>
        </TabsContent>

        <TabsContent value="vision" className="space-y-3">
          <Input placeholder="https://image-url.jpg" value={imageUrl} onChange={e => setImageUrl(e.target.value)} />
          <div className="flex gap-2">
            {(["ocr","classify","detect","extract_fields"] as const).map(t => (
              <Button key={t} variant={jobType === t ? "default" : "outline"} size="sm" onClick={() => setJobType(t)}>{t}</Button>
            ))}
          </div>
          <Button disabled={busy || !imageUrl || !workspaceId}
            onClick={() => call("vision-process", { workspace_id: workspaceId, job_type: jobType, image_url: imageUrl })}>
            {busy ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <ScanText className="h-4 w-4 mr-2" />}
            Run Vision Job
          </Button>
        </TabsContent>

        <TabsContent value="cdc" className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Wire Postgres / MySQL / Mongo / Supabase change events to your workflows. Configure a CDC trigger on a workflow, then POST events from Debezium or a relay to:
          </p>
          <code className="block text-xs bg-muted p-2 rounded">POST /functions/v1/cdc-trigger-ingest {`{ trigger_id, events: [{ op, before, after }] }`}</code>
        </TabsContent>

        <TabsContent value="payments" className="space-y-3">
          <p className="text-sm text-muted-foreground">Unified proxy for PayPal, Square, Adyen, Braintree, Razorpay, Mollie & Lemon Squeezy. Add a gateway in your DB then call:</p>
          <code className="block text-xs bg-muted p-2 rounded">POST /functions/v1/payment-gateway-proxy {`{ gateway_id, action, payload }`}</code>
        </TabsContent>

        <TabsContent value="iot" className="space-y-3">
          <p className="text-sm text-muted-foreground">Publish to MQTT topics or Modbus / OPC-UA HTTP gateways via the iot-bridge function. Devices live in <code>iot_devices</code>.</p>
        </TabsContent>

        <TabsContent value="finetune" className="space-y-3">
          <p className="text-sm text-muted-foreground">Submit OpenAI fine-tuning jobs and reference them as nodes. Provide a JSONL dataset URL.</p>
          <code className="block text-xs bg-muted p-2 rounded">POST /functions/v1/fine-tune-manager {`{ action: 'submit', workspace_id, dataset_url, base_model }`}</code>
        </TabsContent>

        <TabsContent value="competitors" className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <Input placeholder="Competitor name" value={compName} onChange={e => setCompName(e.target.value)} />
            <Input placeholder="domain.com" value={compDomain} onChange={e => setCompDomain(e.target.value)} />
          </div>
          <div className="flex gap-2">
            <Button disabled={busy || !workspaceId || !compName} onClick={async () => {
              await call("competitor-intel", { action: "add_target", workspace_id: workspaceId, name: compName, domain: compDomain });
              setCompName(""); setCompDomain(""); loadCompetitors();
            }}>Add Target</Button>
            <Button variant="outline" onClick={loadCompetitors}>Refresh</Button>
          </div>
          <div className="space-y-2">
            {targets.map((t) => (
              <div key={t.id} className="flex items-center justify-between p-2 rounded border border-border/50">
                <div>
                  <div className="font-medium">{t.name}</div>
                  <div className="text-xs text-muted-foreground">{t.domain}</div>
                </div>
                <Button size="sm" onClick={() => call("competitor-intel", { action: "snapshot", target_id: t.id })}>Snapshot</Button>
              </div>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {result && (
        <pre className="mt-4 text-xs bg-muted p-3 rounded max-h-80 overflow-auto">{JSON.stringify(result, null, 2)}</pre>
      )}
    </Card>
  );
};

export default Wave5Panel;
