import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Globe, Copy, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface API {
  id: string;
  slug: string;
  method: string;
  auth_required: boolean;
  is_active: boolean;
  request_count: number;
}

interface Props {
  workflowId: string;
}

/** Wave 3 — Publish a workflow as a callable HTTP API endpoint. */
export function PublishWorkflowAsAPI({ workflowId }: Props) {
  const [apis, setApis] = useState<API[]>([]);
  const [slug, setSlug] = useState("");
  const [method, setMethod] = useState<"GET" | "POST" | "PUT" | "DELETE">("POST");
  const [authRequired, setAuthRequired] = useState(true);

  const load = async () => {
    const { data } = await supabase
      .from("published_workflow_apis")
      .select("id, slug, method, auth_required, is_active, request_count")
      .eq("workflow_id", workflowId)
      .order("created_at", { ascending: false });
    setApis((data ?? []) as API[]);
  };
  useEffect(() => {
    if (workflowId) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workflowId]);

  const publish = async () => {
    if (!slug) return;
    const { data: userData } = await supabase.auth.getUser();
    const { error } = await supabase.from("published_workflow_apis").insert({
      workflow_id: workflowId,
      slug: slug.toLowerCase().replace(/[^a-z0-9-]/g, "-"),
      method,
      auth_required: authRequired,
      created_by: userData.user!.id,
    });
    if (error) return toast.error(error.message);
    toast.success("API endpoint published");
    setSlug("");
    load();
  };

  const remove = async (id: string) => {
    await supabase.from("published_workflow_apis").delete().eq("id", id);
    load();
  };

  const endpointUrl = (s: string) =>
    `https://qrcolanlnwbtuqoaylkq.functions.supabase.co/publish-flow-api/${s}`;

  return (
    <Card className="p-4 space-y-3 backdrop-blur-xl bg-background/60 border-primary/20">
      <div className="flex items-center gap-2">
        <Globe className="h-4 w-4 text-primary" />
        <span className="font-medium text-sm">Publish as API</span>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1 col-span-2">
          <Label className="text-xs">Endpoint slug</Label>
          <Input
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            placeholder="customer-onboard"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Method</Label>
          <Select value={method} onValueChange={(v) => setMethod(v as any)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="POST">POST</SelectItem>
              <SelectItem value="GET">GET</SelectItem>
              <SelectItem value="PUT">PUT</SelectItem>
              <SelectItem value="DELETE">DELETE</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Require API key</Label>
          <div className="flex items-center h-9">
            <Switch checked={authRequired} onCheckedChange={setAuthRequired} />
          </div>
        </div>
      </div>

      <Button size="sm" onClick={publish} disabled={!slug}>
        Publish endpoint
      </Button>

      <div className="space-y-2">
        {apis.map((a) => (
          <div
            key={a.id}
            className="p-2 rounded border bg-background/40 space-y-1"
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <Badge variant={a.is_active ? "default" : "secondary"}>{a.method}</Badge>
                <code className="text-xs truncate">{a.slug}</code>
                {a.auth_required && (
                  <Badge variant="outline" className="text-[10px]">key</Badge>
                )}
              </div>
              <div className="flex items-center gap-1">
                <span className="text-[10px] text-muted-foreground">
                  {a.request_count} calls
                </span>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-6 w-6"
                  onClick={() => {
                    navigator.clipboard.writeText(endpointUrl(a.slug));
                    toast.success("URL copied");
                  }}
                >
                  <Copy className="h-3 w-3" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-6 w-6"
                  onClick={() => remove(a.id)}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </div>
            <code className="block text-[10px] text-muted-foreground truncate">
              {endpointUrl(a.slug)}
            </code>
          </div>
        ))}
        {apis.length === 0 && (
          <div className="text-xs text-muted-foreground text-center py-2">
            No published endpoints yet.
          </div>
        )}
      </div>
    </Card>
  );
}
