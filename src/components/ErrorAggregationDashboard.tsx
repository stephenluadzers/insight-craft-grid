import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Textarea } from "./ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "./ui/dialog";
import { AlertCircle, CheckCircle2, TrendingUp } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ScrollArea } from "./ui/scroll-area";

interface ErrorAggregationDashboardProps {
  workspaceId: string;
}

interface AggregatedError {
  id: string;
  error_type: string;
  error_message: string;
  fingerprint: string;
  occurrence_count: number;
  first_seen_at: string;
  last_seen_at: string;
  workflow_ids: string[];
  node_ids: string[];
  resolved: boolean;
  resolution_notes: string | null;
}

export const ErrorAggregationDashboard = ({ workspaceId }: ErrorAggregationDashboardProps) => {
  const [errors, setErrors] = useState<AggregatedError[]>([]);
  const [selectedError, setSelectedError] = useState<AggregatedError | null>(null);
  const [resolutionNotes, setResolutionNotes] = useState("");
  const [showResolveDialog, setShowResolveDialog] = useState(false);
  const [filter, setFilter] = useState<'all' | 'unresolved'>('unresolved');
  const { toast } = useToast();

  useEffect(() => {
    loadErrors();
    
    // Real-time subscription
    const channel = supabase
      .channel('error-aggregation')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'error_aggregation',
          filter: `workspace_id=eq.${workspaceId}`
        },
        () => {
          loadErrors();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [workspaceId, filter]);

  const loadErrors = async () => {
    try {
      let query = supabase
        .from('error_aggregation')
        .select('*')
        .eq('workspace_id', workspaceId)
        .order('last_seen_at', { ascending: false });

      if (filter === 'unresolved') {
        query = query.eq('resolved', false);
      }

      const { data, error } = await query;
      if (error) throw error;
      setErrors(data || []);
    } catch (error) {
      console.error('Error loading aggregated errors:', error);
      toast({
        title: "Error",
        description: "Failed to load error aggregation data",
        variant: "destructive"
      });
    }
  };

  const handleResolve = async () => {
    if (!selectedError) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from('error_aggregation')
        .update({
          resolved: true,
          resolution_notes: resolutionNotes,
          resolved_at: new Date().toISOString(),
          resolved_by: user.id
        })
        .eq('id', selectedError.id);

      if (error) throw error;

      toast({
        title: "Resolved",
        description: "Error marked as resolved"
      });

      setShowResolveDialog(false);
      setSelectedError(null);
      setResolutionNotes("");
      loadErrors();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const unresolvedCount = errors.filter(e => !e.resolved).length;
  const totalOccurrences = errors.reduce((sum, e) => sum + e.occurrence_count, 0);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Unique Errors</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{errors.length}</div>
            <p className="text-xs text-muted-foreground">Distinct error types</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Occurrences</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalOccurrences}</div>
            <p className="text-xs text-muted-foreground">Error instances</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Unresolved</CardTitle>
            <AlertCircle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{unresolvedCount}</div>
            <p className="text-xs text-muted-foreground">Need attention</p>
          </CardContent>
        </Card>
      </div>

      <div className="flex gap-2">
        <Badge
          variant={filter === 'unresolved' ? "default" : "outline"}
          className="cursor-pointer"
          onClick={() => setFilter('unresolved')}
        >
          Unresolved Only
        </Badge>
        <Badge
          variant={filter === 'all' ? "default" : "outline"}
          className="cursor-pointer"
          onClick={() => setFilter('all')}
        >
          All Errors
        </Badge>
      </div>

      <ScrollArea className="h-[600px]">
        <div className="space-y-4">
          {errors.map((error) => (
            <Card key={error.id} className={!error.resolved ? "border-destructive" : ""}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4 flex-1">
                    <AlertCircle className={`h-6 w-6 mt-1 flex-shrink-0 ${!error.resolved ? "text-destructive" : "text-muted-foreground"}`} />
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-lg flex items-center gap-2">
                        {error.error_type}
                        <Badge variant="secondary">{error.occurrence_count}x</Badge>
                      </CardTitle>
                      <CardDescription className="break-words">
                        {error.error_message}
                      </CardDescription>
                    </div>
                  </div>
                  {error.resolved ? (
                    <Badge variant="outline">
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      Resolved
                    </Badge>
                  ) : (
                    <Button 
                      size="sm" 
                      onClick={() => {
                        setSelectedError(error);
                        setShowResolveDialog(true);
                      }}
                    >
                      Resolve
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">First seen:</span>
                    <span>{new Date(error.first_seen_at).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Last seen:</span>
                    <span>{new Date(error.last_seen_at).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Affected workflows:</span>
                    <span>{error.workflow_ids.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Affected nodes:</span>
                    <span>{error.node_ids.length}</span>
                  </div>
                  {error.resolution_notes && (
                    <div className="pt-2 border-t">
                      <p className="text-sm font-medium mb-1">Resolution:</p>
                      <p className="text-muted-foreground">{error.resolution_notes}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </ScrollArea>

      {/* Resolve Dialog */}
      <Dialog open={showResolveDialog} onOpenChange={setShowResolveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Resolve Error</DialogTitle>
            <DialogDescription>
              Document how this error was resolved
            </DialogDescription>
          </DialogHeader>
          
          {selectedError && (
            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium mb-1">Error Type:</p>
                <code className="text-xs bg-muted p-2 rounded block">
                  {selectedError.error_type}
                </code>
              </div>

              <div>
                <p className="text-sm font-medium mb-1">Error Message:</p>
                <code className="text-xs bg-muted p-2 rounded block break-words">
                  {selectedError.error_message}
                </code>
              </div>
              
              <div>
                <p className="text-sm font-medium mb-1">Resolution Notes:</p>
                <Textarea
                  value={resolutionNotes}
                  onChange={(e) => setResolutionNotes(e.target.value)}
                  placeholder="Describe how this error was fixed..."
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
