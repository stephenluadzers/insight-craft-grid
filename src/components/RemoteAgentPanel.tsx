import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Copy, ExternalLink, Plug, Bot } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const PROJECT_ID = import.meta.env.VITE_SUPABASE_PROJECT_ID;

export const RemoteAgentPanel = () => {
  const { toast } = useToast();
  const [url, setUrl] = useState("");

  useEffect(() => {
    setUrl(`https://${PROJECT_ID}.functions.supabase.co/mcp-server`);
  }, []);

  const copy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: `${label} copied`, description: text });
  };

  const exampleConfig = JSON.stringify(
    {
      mcpServers: {
        "remora-flow": {
          url,
          headers: { "X-API-Key": "wfapi_YOUR_KEY_HERE" },
        },
      },
    },
    null,
    2,
  );

  return (
    <div className="space-y-6 max-w-4xl">
      <Card className="backdrop-blur-xl bg-card/60 border-white/10">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bot className="w-5 h-5" />
            Remote AI Assistant Connection (MCP)
          </CardTitle>
          <CardDescription>
            Connect Claude, ChatGPT, Cursor, or any MCP-compatible AI executive assistant to Remora
            Flow. The assistant can generate, diagnose, list, and export sellable workflows on your
            behalf.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div>
            <div className="text-xs text-muted-foreground mb-1">MCP Server URL</div>
            <div className="flex gap-2">
              <code className="flex-1 px-3 py-2 rounded-md bg-muted/40 text-sm break-all">{url}</code>
              <Button variant="outline" size="sm" onClick={() => copy(url, "URL")}>
                <Copy className="w-4 h-4" />
              </Button>
            </div>
          </div>

          <div>
            <div className="text-xs text-muted-foreground mb-1">Auth header</div>
            <code className="block px-3 py-2 rounded-md bg-muted/40 text-sm">
              X-API-Key: &lt;your Remora Flow API key&gt;
            </code>
            <p className="text-xs text-muted-foreground mt-2">
              Create a key in <strong>API Keys</strong>. Each key is scoped to one workspace — perfect
              for isolating an assistant's output.
            </p>
          </div>

          <div>
            <div className="text-xs text-muted-foreground mb-1">Available tools</div>
            <div className="flex flex-wrap gap-2">
              {[
                "generate_workflow",
                "diagnose_workflow",
                "list_workflows",
                "get_workflow",
                "export_workflow",
              ].map((t) => (
                <Badge key={t} variant="secondary">{t}</Badge>
              ))}
            </div>
          </div>

          <div>
            <div className="text-xs text-muted-foreground mb-1">Example client config (Claude Desktop / Cursor)</div>
            <pre className="px-3 py-2 rounded-md bg-muted/40 text-xs overflow-x-auto">
{exampleConfig}
            </pre>
            <Button variant="outline" size="sm" className="mt-2" onClick={() => copy(exampleConfig, "Config")}>
              <Copy className="w-4 h-4 mr-2" /> Copy config
            </Button>
          </div>

          <div className="flex gap-2 pt-2">
            <Button variant="outline" asChild>
              <a href="/api-keys"><Plug className="w-4 h-4 mr-2" /> Create API Key</a>
            </Button>
            <Button variant="ghost" asChild>
              <a href="https://modelcontextprotocol.io/clients" target="_blank" rel="noreferrer">
                MCP clients <ExternalLink className="w-4 h-4 ml-2" />
              </a>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default RemoteAgentPanel;
