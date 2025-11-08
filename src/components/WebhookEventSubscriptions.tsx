import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Loader2, Save } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";

interface WebhookEventSubscriptionsProps {
  webhookId: string;
}

const AVAILABLE_EVENTS = [
  { id: 'workflow.started', label: 'Workflow Started', description: 'When a workflow execution begins' },
  { id: 'workflow.completed', label: 'Workflow Completed', description: 'When a workflow execution succeeds' },
  { id: 'workflow.failed', label: 'Workflow Failed', description: 'When a workflow execution fails' },
  { id: 'workflow.timeout', label: 'Workflow Timeout', description: 'When a workflow execution times out' },
  { id: 'node.executed', label: 'Node Executed', description: 'When any workflow node executes' },
  { id: 'error.occurred', label: 'Error Occurred', description: 'When any error happens' },
];

export function WebhookEventSubscriptions({ webhookId }: WebhookEventSubscriptionsProps) {
  const [subscriptions, setSubscriptions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadSubscriptions();
  }, [webhookId]);

  const loadSubscriptions = async () => {
    try {
      const { data, error } = await supabase
        .from('webhook_event_subscriptions')
        .select('event_type')
        .eq('webhook_id', webhookId);

      if (error) throw error;
      
      setSubscriptions((data || []).map(s => s.event_type));
    } catch (error: any) {
      toast({
        title: "Error loading subscriptions",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = (eventId: string) => {
    setSubscriptions(prev =>
      prev.includes(eventId)
        ? prev.filter(id => id !== eventId)
        : [...prev, eventId]
    );
  };

  const handleSave = async () => {
    try {
      setSaving(true);

      // Delete all existing subscriptions
      await supabase
        .from('webhook_event_subscriptions')
        .delete()
        .eq('webhook_id', webhookId);

      // Insert new subscriptions
      if (subscriptions.length > 0) {
        const { error } = await supabase
          .from('webhook_event_subscriptions')
          .insert(
            subscriptions.map(event_type => ({
              webhook_id: webhookId,
              event_type,
            }))
          );

        if (error) throw error;
      }

      toast({
        title: "Subscriptions updated",
        description: "Event subscriptions have been saved successfully.",
      });
    } catch (error: any) {
      toast({
        title: "Error saving subscriptions",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Event Subscriptions</CardTitle>
        <CardDescription>
          Select which events should trigger this webhook
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          {AVAILABLE_EVENTS.map((event) => (
            <div key={event.id} className="flex items-start space-x-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors">
              <Checkbox
                id={event.id}
                checked={subscriptions.includes(event.id)}
                onCheckedChange={() => handleToggle(event.id)}
              />
              <div className="flex-1 space-y-1">
                <Label
                  htmlFor={event.id}
                  className="text-sm font-medium cursor-pointer"
                >
                  {event.label}
                </Label>
                <p className="text-xs text-muted-foreground">
                  {event.description}
                </p>
              </div>
              <Badge variant="secondary" className="font-mono text-xs">
                {event.id}
              </Badge>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between pt-4 border-t">
          <span className="text-sm text-muted-foreground">
            {subscriptions.length} event{subscriptions.length !== 1 ? 's' : ''} selected
          </span>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save Changes
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
