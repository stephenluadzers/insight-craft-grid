import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Plus, Copy, Trash2, Webhook, Settings } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { CreateWebhookDialog } from "@/components/CreateWebhookDialog";
import { WebhookDetails } from "@/components/WebhookDetails";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface WebhookItem {
  id: string;
  workflow_id: string;
  webhook_key: string;
  created_at: string;
  enabled: boolean;
  workflow_name: string;
  last_triggered_at: string | null;
}

export default function Webhooks(): JSX.Element {
  const [loading, setLoading] = useState(true);
  const [webhooks, setWebhooks] = useState<WebhookItem[]>([]);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [deleteWebhookId, setDeleteWebhookId] = useState<string | null>(null);
  const [selectedWebhook, setSelectedWebhook] = useState<WebhookItem | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    loadWebhooks();
  }, []);

  const loadWebhooks = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth");
        return;
      }

      const { data, error } = await supabase
        .from("workflow_webhooks")
        .select(`
          id,
          workflow_id,
          webhook_key,
          created_at,
          enabled,
          last_triggered_at,
          workflows!inner(name)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const formattedWebhooks = (data || []).map((webhook: any) => ({
        id: webhook.id,
        workflow_id: webhook.workflow_id,
        webhook_key: webhook.webhook_key,
        created_at: webhook.created_at,
        enabled: webhook.enabled,
        last_triggered_at: webhook.last_triggered_at,
        workflow_name: webhook.workflows.name,
      }));

      setWebhooks(formattedWebhooks);
    } catch (error: any) {
      toast({
        title: "Error loading webhooks",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getWebhookUrl = (webhookKey: string) => {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    return `${supabaseUrl}/functions/v1/trigger-webhook?key=${webhookKey}`;
  };

  const copyWebhookUrl = (webhookKey: string) => {
    const url = getWebhookUrl(webhookKey);
    navigator.clipboard.writeText(url);
    toast({
      title: "Copied to clipboard",
      description: "Webhook URL has been copied",
    });
  };

  const handleDelete = async () => {
    if (!deleteWebhookId) return;

    try {
      setDeleting(true);
      const { error } = await supabase
        .from("workflow_webhooks")
        .delete()
        .eq("id", deleteWebhookId);

      if (error) throw error;

      toast({
        title: "Webhook deleted",
        description: "The webhook has been deleted successfully.",
      });

      setDeleteWebhookId(null);
      loadWebhooks();
    } catch (error: any) {
      toast({
        title: "Error deleting webhook",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        
        <div className="flex-1 flex flex-col">
          <header className="h-12 flex items-center border-b bg-background px-4">
            <SidebarTrigger />
            <h1 className="ml-4 font-semibold">Webhooks</h1>
          </header>

          <main className="flex-1 overflow-auto p-8">
            <div className="max-w-6xl mx-auto space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-3xl font-bold mb-2">Webhooks</h2>
                  <p className="text-muted-foreground">
                    Create and manage webhook triggers for your workflows
                  </p>
                </div>
                <Button onClick={() => setCreateDialogOpen(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Create Webhook
                </Button>
              </div>

              {webhooks.length === 0 ? (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <Webhook className="w-12 h-12 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No webhooks yet</h3>
                    <p className="text-muted-foreground text-center mb-4">
                      Create your first webhook to trigger workflows from external services
                    </p>
                    <Button onClick={() => setCreateDialogOpen(true)}>
                      <Plus className="w-4 h-4 mr-2" />
                      Create Your First Webhook
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4">
                  {webhooks.map((webhook) => (
                    <Card key={webhook.id}>
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <CardTitle className="flex items-center gap-2 mb-2">
                              {webhook.workflow_name}
                              <Badge variant={webhook.enabled ? "default" : "secondary"}>
                                {webhook.enabled ? "Enabled" : "Disabled"}
                              </Badge>
                            </CardTitle>
                            <CardDescription className="mt-2 font-mono text-xs break-all">
                              {getWebhookUrl(webhook.webhook_key)}
                            </CardDescription>
                          </div>
                          <div className="flex gap-2 ml-4">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedWebhook(webhook);
                                setDetailsOpen(true);
                              }}
                            >
                              <Settings className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => copyWebhookUrl(webhook.webhook_key)}
                            >
                              <Copy className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setDeleteWebhookId(webhook.id)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="flex gap-4 text-sm text-muted-foreground">
                          <span>Created {new Date(webhook.created_at).toLocaleDateString()}</span>
                          {webhook.last_triggered_at && (
                            <span>
                              Last triggered {new Date(webhook.last_triggered_at).toLocaleString()}
                            </span>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}

              <CreateWebhookDialog
                open={createDialogOpen}
                onOpenChange={setCreateDialogOpen}
                onWebhookCreated={loadWebhooks}
              />

              <WebhookDetails
                webhook={selectedWebhook}
                open={detailsOpen}
                onOpenChange={setDetailsOpen}
              />

              <AlertDialog open={!!deleteWebhookId} onOpenChange={() => setDeleteWebhookId(null)}>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete Webhook</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to delete this webhook? This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDelete} disabled={deleting}>
                      {deleting ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Deleting...
                        </>
                      ) : (
                        "Delete"
                      )}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
