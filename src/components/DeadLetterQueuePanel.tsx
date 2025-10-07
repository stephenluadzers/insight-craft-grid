import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Textarea } from "./ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "./ui/dialog";
import { AlertTriangle, CheckCircle2, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ScrollArea } from "./ui/scroll-area";

interface DeadLetterQueuePanelProps {
  workspaceId: string;
}

interface DLQItem {
  id: string;
  workflow_id: string;
  failure_count: number;
  last_error: string;
  execution_data: any;
  failed_at: string;
  investigated: boolean;
  resolution_notes: string | null;
  resolved_at: string | null;
}

export const DeadLetterQueuePanel = ({ workspaceId }: DeadLetterQueuePanelProps) => {
  const [items, setItems] = useState<DLQItem[]>([]);
  const [selectedItem, setSelectedItem] = useState<DLQItem | null>(null);
  const [resolutionNotes, setResolutionNotes] = useState("");
  const [showResolveDialog, setShowResolveDialog] = useState(false);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadDLQItems();
    
    // Real-time subscription
    const channel = supabase
      .channel('dlq-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'workflow_dead_letter_queue',
          filter: `workspace_id=eq.${workspaceId}`
        },
        () => {
          loadDLQItems();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [workspaceId]);

  const loadDLQItems = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('workflow_dead_letter_queue')
        .select('*')
        .eq('workspace_id', workspaceId)
        .order('failed_at', { ascending: false });

      if (error) throw error;
      setItems(data || []);
    } catch (error) {
      console.error('Error loading DLQ items:', error);
      toast({
        title: "Error",
        description: "Failed to load dead letter queue items",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleResolve = async () => {
    if (!selectedItem) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from('workflow_dead_letter_queue')
        .update({
          investigated: true,
          resolution_notes: resolutionNotes,
          resolved_at: new Date().toISOString(),
          resolved_by: user.id
        })
        .eq('id', selectedItem.id);

      if (error) throw error;

      toast({
        title: "Resolved",
        description: "DLQ item marked as resolved"
      });

      setShowResolveDialog(false);
      setSelectedItem(null);
      setResolutionNotes("");
      loadDLQItems();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const unresolvedCount = items.filter(i => !i.investigated).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Dead Letter Queue</h2>
          <p className="text-muted-foreground">Failed workflows requiring investigation</p>
        </div>
        <Badge variant={unresolvedCount > 0 ? "destructive" : "outline"} className="text-lg px-4 py-2">
          {unresolvedCount} Unresolved
        </Badge>
      </div>

      {items.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <CheckCircle2 className="h-12 w-12 text-green-500 mb-4" />
            <p className="text-lg font-medium">No Failed Workflows</p>
            <p className="text-sm text-muted-foreground">All workflows are executing successfully</p>
          </CardContent>
        </Card>
      ) : (
        <ScrollArea className="h-[600px]">
          <div className="space-y-4">
            {items.map((item) => (
              <Card key={item.id} className={!item.investigated ? "border-destructive" : ""}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4">
                      <AlertTriangle className={`h-6 w-6 mt-1 ${!item.investigated ? "text-destructive" : "text-muted-foreground"}`} />
                      <div>
                        <CardTitle className="text-lg">Workflow ID: {item.workflow_id.slice(0, 8)}</CardTitle>
                        <CardDescription>
                          Failed {item.failure_count} times • Last failed: {new Date(item.failed_at).toLocaleString()}
                        </CardDescription>
                      </div>
                    </div>
                    {item.investigated ? (
                      <Badge variant="outline">
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        Resolved
                      </Badge>
                    ) : (
                      <Button 
                        size="sm" 
                        onClick={() => {
                          setSelectedItem(item);
                          setShowResolveDialog(true);
                        }}
                      >
                        Investigate
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div>
                      <p className="text-sm font-medium">Error:</p>
                      <code className="text-xs bg-muted p-2 rounded block mt-1">
                        {item.last_error}
                      </code>
                    </div>
                    {item.resolution_notes && (
                      <div>
                        <p className="text-sm font-medium">Resolution Notes:</p>
                        <p className="text-sm text-muted-foreground">{item.resolution_notes}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Resolved: {item.resolved_at ? new Date(item.resolved_at).toLocaleString() : 'N/A'}
                        </p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </ScrollArea>
      )}

      {/* Resolve Dialog */}
      <Dialog open={showResolveDialog} onOpenChange={setShowResolveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Resolve Failed Workflow</DialogTitle>
            <DialogDescription>
              Document the investigation and resolution for this failed workflow
            </DialogDescription>
          </DialogHeader>
          
          {selectedItem && (
            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium mb-1">Error:</p>
                <code className="text-xs bg-muted p-2 rounded block">
                  {selectedItem.last_error}
                </code>
              </div>
              
              <div>
                <p className="text-sm font-medium mb-1">Resolution Notes:</p>
                <Textarea
                  value={resolutionNotes}
                  onChange={(e) => setResolutionNotes(e.target.value)}
                  placeholder="Describe how you resolved this issue..."
                  rows={4}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowResolveDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleResolve} disabled={!resolutionNotes.trim()}>
              Mark as Resolved
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
