import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Copy, Bot, ExternalLink } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export function AgentWebhookPanel() {
  const { toast } = useToast();
  const [showExample, setShowExample] = useState(false);

  const webhookUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/agent-webhook`;

  const copyUrl = () => {
    navigator.clipboard.writeText(webhookUrl);
    toast({ title: "Copied", description: "Agent webhook URL copied to clipboard" });
  };

  const examplePayload = JSON.stringify({
    prompt: "Create an email onboarding workflow that sends a welcome email, waits 3 days, then sends a follow-up",
    image_url: "https://example.com/workflow-diagram.png",
    publish: true,
    price_cents: 499,
    tags: ["onboarding", "email"],
  }, null, 2);

  const copyExample = () => {
    const curl = `curl -X POST "${webhookUrl}" \\
  -H "Content-Type: application/json" \\
  -H "X-Agent-Key: YOUR_API_KEY" \\
  -d '${JSON.stringify({ prompt: "Create an email onboarding workflow", publish: true, tags: ["onboarding"] })}'`;
    navigator.clipboard.writeText(curl);
    toast({ title: "Copied", description: "cURL example copied" });
  };

  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Bot className="w-5 h-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg">AI Agent Webhook</CardTitle>
              <CardDescription>
                Let external AI agents create, optimize & export workflows via API
              </CardDescription>
            </div>
          </div>
          <Badge variant="outline" className="text-primary border-primary/30">
            POST
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Endpoint URL */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-muted-foreground">Endpoint</label>
          <div className="flex items-center gap-2">
            <code className="flex-1 bg-muted p-2.5 rounded-md text-xs font-mono break-all">
              {webhookUrl}
            </code>
            <Button variant="outline" size="sm" onClick={copyUrl}>
              <Copy className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>

        {/* Auth info */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-muted-foreground">Authentication</label>
          <p className="text-sm text-muted-foreground">
            Use your API key in the <code className="bg-muted px-1 rounded text-xs">X-Agent-Key</code> header or as a Bearer token.
            Generate keys on the{" "}
            <a href="/api-keys" className="text-primary hover:underline inline-flex items-center gap-1">
              API Keys page <ExternalLink className="w-3 h-3" />
            </a>
          </p>
        </div>

        {/* Accepted inputs */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-muted-foreground">Accepted Inputs</label>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="flex items-center gap-2 bg-muted/50 p-2 rounded">
              <Badge variant="secondary" className="text-xs">prompt</Badge>
              <span className="text-muted-foreground">Text description</span>
            </div>
            <div className="flex items-center gap-2 bg-muted/50 p-2 rounded">
              <Badge variant="secondary" className="text-xs">image_url</Badge>
              <span className="text-muted-foreground">Diagram / screenshot</span>
            </div>
            <div className="flex items-center gap-2 bg-muted/50 p-2 rounded">
              <Badge variant="secondary" className="text-xs">image_base64</Badge>
              <span className="text-muted-foreground">Encoded image</span>
            </div>
            <div className="flex items-center gap-2 bg-muted/50 p-2 rounded">
              <Badge variant="secondary" className="text-xs">workflow_json</Badge>
              <span className="text-muted-foreground">Existing workflow</span>
            </div>
          </div>
        </div>

        {/* Toggle example */}
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowExample(!showExample)}>
            {showExample ? "Hide" : "Show"} Example
          </Button>
          <Button variant="outline" size="sm" onClick={copyExample}>
            <Copy className="w-3.5 h-3.5 mr-1.5" />
            Copy cURL
          </Button>
        </div>

        {showExample && (
          <pre className="bg-muted p-3 rounded-md text-xs font-mono overflow-x-auto max-h-48">
            {examplePayload}
          </pre>
        )}
      </CardContent>
    </Card>
  );
}
