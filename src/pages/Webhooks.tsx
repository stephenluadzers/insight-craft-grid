import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Plus, Copy, Trash2, Webhook } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface WebhookItem {
  id: string;
  name: string;
  url: string;
  workflow_id: string;
  created_at: string;
  is_active: boolean;
}

export default function Webhooks(): JSX.Element {
  const [loading, setLoading] = useState(true);
  const [webhooks, setWebhooks] = useState<WebhookItem[]>([]);
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

      // For now, show empty state - webhook functionality to be implemented
      setWebhooks([]);
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

  const copyWebhookUrl = (url: string) => {
    navigator.clipboard.writeText(url);
    toast({
      title: "Copied to clipboard",
      description: "Webhook URL has been copied",
    });
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
                <Button>
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
                    <Button>
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
                          <div>
                            <CardTitle className="flex items-center gap-2">
                              {webhook.name}
                              <Badge variant={webhook.is_active ? "default" : "secondary"}>
                                {webhook.is_active ? "Active" : "Inactive"}
                              </Badge>
                            </CardTitle>
                            <CardDescription className="mt-2 font-mono text-xs">
                              {webhook.url}
                            </CardDescription>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => copyWebhookUrl(webhook.url)}
                            >
                              <Copy className="w-4 h-4" />
                            </Button>
                            <Button variant="outline" size="sm">
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-muted-foreground">
                          Created {new Date(webhook.created_at).toLocaleDateString()}
                        </p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
