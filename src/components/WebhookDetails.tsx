import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { WebhookDeliveryLogs } from "./WebhookDeliveryLogs";
import { WebhookEventSubscriptions } from "./WebhookEventSubscriptions";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Copy, Key, Calendar, Activity } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface WebhookDetailsProps {
  webhook: {
    id: string;
    workflow_id: string;
    workflow_name: string;
    webhook_key: string;
    enabled: boolean;
    created_at: string;
    last_triggered_at: string | null;
  } | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function WebhookDetails({ webhook, open, onOpenChange }: WebhookDetailsProps) {
  const { toast } = useToast();

  if (!webhook) return null;

  const getWebhookUrl = (webhookKey: string) => {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    return `${supabaseUrl}/functions/v1/trigger-webhook?key=${webhookKey}`;
  };

  const copyWebhookUrl = () => {
    const url = getWebhookUrl(webhook.webhook_key);
    navigator.clipboard.writeText(url);
    toast({
      title: "Copied to clipboard",
      description: "Webhook URL has been copied",
    });
  };

  const copyWebhookKey = () => {
    navigator.clipboard.writeText(webhook.webhook_key);
    toast({
      title: "Copied to clipboard",
      description: "Webhook key has been copied",
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {webhook.workflow_name}
            <Badge variant={webhook.enabled ? "default" : "secondary"}>
              {webhook.enabled ? "Enabled" : "Disabled"}
            </Badge>
          </DialogTitle>
          <DialogDescription>
            Manage webhook configuration, event subscriptions, and view delivery logs
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Webhook Configuration</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium flex items-center gap-2">
                    <Key className="h-4 w-4" />
                    Webhook URL
                  </label>
                  <Button variant="outline" size="sm" onClick={copyWebhookUrl}>
                    <Copy className="h-3 w-3 mr-1" />
                    Copy URL
                  </Button>
                </div>
                <code className="block p-3 bg-muted rounded text-xs break-all">
                  {getWebhookUrl(webhook.webhook_key)}
                </code>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium">Webhook Key</label>
                  <Button variant="outline" size="sm" onClick={copyWebhookKey}>
                    <Copy className="h-3 w-3 mr-1" />
                    Copy Key
                  </Button>
                </div>
                <code className="block p-3 bg-muted rounded text-xs break-all">
                  {webhook.webhook_key}
                </code>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Created:</span>
                  <span>{new Date(webhook.created_at).toLocaleDateString()}</span>
                </div>
                {webhook.last_triggered_at && (
                  <div className="flex items-center gap-2 text-sm">
                    <Activity className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Last trigger:</span>
                    <span>{new Date(webhook.last_triggered_at).toLocaleString()}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Tabs defaultValue="events">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="events">Event Subscriptions</TabsTrigger>
              <TabsTrigger value="logs">Delivery Logs</TabsTrigger>
            </TabsList>

            <TabsContent value="events" className="space-y-4">
              <WebhookEventSubscriptions webhookId={webhook.id} />
            </TabsContent>

            <TabsContent value="logs" className="space-y-4">
              <WebhookDeliveryLogs webhookId={webhook.id} />
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}
