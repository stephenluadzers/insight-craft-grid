import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "./ui/badge";
import { Progress } from "./ui/progress";
import { AlertCircle, CheckCircle2, MinusCircle } from "lucide-react";

interface CircuitBreakerStatusProps {
  workspaceId: string;
}

interface CircuitBreaker {
  id: string;
  integration_type: string;
  state: 'closed' | 'open' | 'half_open';
  failure_count: number;
  failure_threshold: number;
  success_count: number;
  last_failure_at: string | null;
  opened_at: string | null;
  updated_at: string;
}

export const CircuitBreakerStatus = ({ workspaceId }: CircuitBreakerStatusProps) => {
  const [breakers, setBreakers] = useState<CircuitBreaker[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCircuitBreakers();
    
    // Real-time subscription
    const channel = supabase
      .channel('circuit-breakers')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'integration_circuit_breakers',
          filter: `workspace_id=eq.${workspaceId}`
        },
        () => {
          loadCircuitBreakers();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [workspaceId]);

  const loadCircuitBreakers = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('integration_circuit_breakers')
        .select('*')
        .eq('workspace_id', workspaceId)
        .order('updated_at', { ascending: false });

      if (error) throw error;
      setBreakers(data || []);
    } catch (error) {
      console.error('Error loading circuit breakers:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStateIcon = (state: string) => {
    switch (state) {
      case 'closed':
        return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case 'open':
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      case 'half_open':
        return <MinusCircle className="h-5 w-5 text-yellow-500" />;
      default:
        return null;
    }
  };

  const getStateVariant = (state: string): "default" | "destructive" | "outline" | "secondary" => {
    switch (state) {
      case 'closed':
        return 'outline';
      case 'open':
        return 'destructive';
      case 'half_open':
        return 'secondary';
      default:
        return 'default';
    }
  };

  const getStateDescription = (state: string) => {
    switch (state) {
      case 'closed':
        return 'All systems operational';
      case 'open':
        return 'Integration blocked due to failures';
      case 'half_open':
        return 'Testing recovery...';
      default:
        return '';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Circuit Breaker Status</CardTitle>
        <CardDescription>
          Integration health and automatic failure protection
        </CardDescription>
      </CardHeader>
      <CardContent>
        {breakers.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No circuit breakers configured yet
          </div>
        ) : (
          <div className="space-y-4">
            {breakers.map((breaker) => (
              <div key={breaker.id} className="border rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {getStateIcon(breaker.state)}
                    <div>
                      <p className="font-medium">{breaker.integration_type}</p>
                      <p className="text-sm text-muted-foreground">
                        {getStateDescription(breaker.state)}
                      </p>
                    </div>
                  </div>
                  <Badge variant={getStateVariant(breaker.state)}>
                    {breaker.state.toUpperCase()}
                  </Badge>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Failure Count</span>
                    <span className="font-medium">
                      {breaker.failure_count} / {breaker.failure_threshold}
                    </span>
                  </div>
                  <Progress 
                    value={(breaker.failure_count / breaker.failure_threshold) * 100} 
                    className="h-2"
                  />
                </div>

                {breaker.state === 'half_open' && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Recovery Attempts</span>
                      <span className="font-medium">{breaker.success_count} successful</span>
                    </div>
                  </div>
                )}

                {breaker.last_failure_at && (
                  <p className="text-xs text-muted-foreground">
                    Last failure: {new Date(breaker.last_failure_at).toLocaleString()}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
