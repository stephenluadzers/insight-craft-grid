import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Lightbulb, DollarSign, Clock, Check, X, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface IntegrationSuggestionsPanelProps {
  workflowId: string;
  workspaceId: string;
}

export const IntegrationSuggestionsPanel = ({ workflowId, workspaceId }: IntegrationSuggestionsPanelProps) => {
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadSuggestions();
  }, [workflowId]);

  const loadSuggestions = async () => {
    const { data } = await supabase
      .from('workflow_integration_suggestions')
      .select('*')
      .eq('workflow_id', workflowId)
      .eq('status', 'pending')
      .order('confidence_score', { ascending: false });
    
    setSuggestions(data || []);
  };

  const generateSuggestions = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.functions.invoke('suggest-integrations', {
        body: { workflowId, workspaceId }
      });
      
      if (error) throw error;
      await loadSuggestions();
      toast.success('Integration suggestions generated');
    } catch (error: any) {
      toast.error(error.message || 'Failed to generate suggestions');
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (suggestionId: string, status: string) => {
    await supabase
      .from('workflow_integration_suggestions')
      .update({ status, reviewed_at: new Date().toISOString() })
      .eq('id', suggestionId);
    
    await loadSuggestions();
    toast.success(`Suggestion ${status}`);
  };

  const getComplexityColor = (complexity: string) => {
    switch (complexity) {
      case 'low': return 'default';
      case 'medium': return 'secondary';
      case 'high': return 'destructive';
      default: return 'outline';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Lightbulb className="h-6 w-6 text-primary" />
            Smart Integration Suggestions
          </h2>
          <p className="text-muted-foreground">AI-discovered optimization opportunities</p>
        </div>
        <Button onClick={generateSuggestions} disabled={loading}>
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Analyzing...
            </>
          ) : (
            'Scan for Improvements'
          )}
        </Button>
      </div>

      {suggestions.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center space-y-3">
              <Lightbulb className="h-12 w-12 text-muted-foreground mx-auto" />
              <h3 className="text-lg font-semibold">No Suggestions Yet</h3>
              <p className="text-sm text-muted-foreground">
                Scan your workflow to discover optimization opportunities
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {suggestions.map((suggestion) => (
            <Card key={suggestion.id} className="border-l-4 border-l-blue-500">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg">{suggestion.suggested_integration}</CardTitle>
                    <CardDescription className="mt-1">
                      {suggestion.integration_category}
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">
                      {Math.round(suggestion.confidence_score * 100)}% match
                    </Badge>
                    <Badge variant={getComplexityColor(suggestion.implementation_complexity)}>
                      {suggestion.implementation_complexity} complexity
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4 p-4 bg-muted rounded-lg">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-1">Current Approach</p>
                    <p className="text-sm">{suggestion.current_approach}</p>
                  </div>
                  <div className="space-y-2">
                    {suggestion.estimated_savings_cents && (
                      <div className="flex items-center gap-2">
                        <DollarSign className="h-4 w-4 text-green-600" />
                        <span className="text-sm">
                          Save ${(suggestion.estimated_savings_cents / 100).toFixed(2)}/month
                        </span>
                      </div>
                    )}
                    {suggestion.estimated_time_savings_hours && (
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-blue-600" />
                        <span className="text-sm">
                          Save {suggestion.estimated_time_savings_hours}h/month
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => updateStatus(suggestion.id, 'accepted')}
                  >
                    <Check className="h-4 w-4 mr-2" />
                    Accept
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => updateStatus(suggestion.id, 'rejected')}
                  >
                    <X className="h-4 w-4 mr-2" />
                    Dismiss
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};