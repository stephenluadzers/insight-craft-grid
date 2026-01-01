import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { 
  Zap, 
  Clock, 
  AlertTriangle, 
  TrendingUp, 
  RefreshCw,
  Shield,
  Activity,
  CheckCircle,
  XCircle,
  Settings2
} from "lucide-react";
import { toast } from "sonner";

interface OptimizationSuggestion {
  id: string;
  type: 'parallelization' | 'caching' | 'batching' | 'retry_strategy' | 'circuit_breaker';
  title: string;
  description: string;
  impact: 'high' | 'medium' | 'low';
  estimatedImprovement: string;
  autoApplicable: boolean;
}

interface ExecutionStats {
  avgDuration: number;
  successRate: number;
  errorRate: number;
  p95Duration: number;
  totalExecutions: number;
}

interface ExecutionOptimizerProps {
  workflowId: string;
  workspaceId: string;
}

export const ExecutionOptimizer = ({ workflowId, workspaceId }: ExecutionOptimizerProps) => {
  const [stats, setStats] = useState<ExecutionStats | null>(null);
  const [suggestions, setSuggestions] = useState<OptimizationSuggestion[]>([]);
  const [autoHealing, setAutoHealing] = useState(true);
  const [circuitBreaker, setCircuitBreaker] = useState(true);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [appliedOptimizations, setAppliedOptimizations] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchStats();
    analyzeForOptimizations();
  }, [workflowId]);

  const fetchStats = async () => {
    try {
      const { data } = await supabase
        .from('workflow_executions')
        .select('duration_ms, status')
        .eq('workflow_id', workflowId)
        .order('started_at', { ascending: false })
        .limit(100);

      if (data && data.length > 0) {
        const durations = data.map(d => d.duration_ms || 0).filter(d => d > 0);
        const successful = data.filter(d => d.status === 'success').length;
        const failed = data.filter(d => d.status === 'failed').length;
        
        durations.sort((a, b) => a - b);
        const p95Index = Math.floor(durations.length * 0.95);
        
        setStats({
          avgDuration: durations.length > 0 ? durations.reduce((a, b) => a + b, 0) / durations.length : 0,
          successRate: data.length > 0 ? (successful / data.length) * 100 : 0,
          errorRate: data.length > 0 ? (failed / data.length) * 100 : 0,
          p95Duration: durations[p95Index] || 0,
          totalExecutions: data.length
        });
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  };

  const analyzeForOptimizations = async () => {
    setIsAnalyzing(true);
    
    // Simulate AI analysis - in production this would call an edge function
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    const mockSuggestions: OptimizationSuggestion[] = [
      {
        id: 'parallel-1',
        type: 'parallelization',
        title: 'Parallelize Independent API Calls',
        description: 'Nodes 3, 4, and 5 are independent and can run simultaneously',
        impact: 'high',
        estimatedImprovement: '40% faster execution',
        autoApplicable: true
      },
      {
        id: 'cache-1',
        type: 'caching',
        title: 'Enable Result Caching',
        description: 'The AI analysis node produces consistent outputs for similar inputs',
        impact: 'medium',
        estimatedImprovement: '25% cost reduction',
        autoApplicable: true
      },
      {
        id: 'batch-1',
        type: 'batching',
        title: 'Batch Database Operations',
        description: 'Multiple individual inserts can be combined into a single batch',
        impact: 'medium',
        estimatedImprovement: '60% fewer API calls',
        autoApplicable: true
      },
      {
        id: 'retry-1',
        type: 'retry_strategy',
        title: 'Add Exponential Backoff',
        description: 'External API calls should retry with exponential backoff',
        impact: 'low',
        estimatedImprovement: 'Better reliability',
        autoApplicable: true
      }
    ];
    
    setSuggestions(mockSuggestions);
    setIsAnalyzing(false);
  };

  const applyOptimization = async (suggestion: OptimizationSuggestion) => {
    toast.info(`Applying: ${suggestion.title}`);
    
    // Simulate applying optimization
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    setAppliedOptimizations(prev => new Set([...prev, suggestion.id]));
    toast.success(`Applied: ${suggestion.title}`);
  };

  const applyAllOptimizations = async () => {
    const applicable = suggestions.filter(s => s.autoApplicable && !appliedOptimizations.has(s.id));
    
    for (const suggestion of applicable) {
      await applyOptimization(suggestion);
    }
    
    toast.success(`Applied ${applicable.length} optimizations`);
  };

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'high': return 'text-green-500';
      case 'medium': return 'text-yellow-500';
      case 'low': return 'text-blue-500';
      default: return 'text-muted-foreground';
    }
  };

  const getImpactBadge = (impact: string) => {
    switch (impact) {
      case 'high': return 'default';
      case 'medium': return 'secondary';
      case 'low': return 'outline';
      default: return 'outline';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Execution Optimizer</h2>
          <p className="text-muted-foreground">Improve performance and reliability</p>
        </div>
        <Button onClick={analyzeForOptimizations} disabled={isAnalyzing} className="gap-2">
          <RefreshCw className={`h-4 w-4 ${isAnalyzing ? 'animate-spin' : ''}`} />
          {isAnalyzing ? 'Analyzing...' : 'Re-analyze'}
        </Button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Avg Duration</span>
            </div>
            <p className="text-2xl font-bold">{(stats.avgDuration / 1000).toFixed(2)}s</p>
          </Card>
          
          <Card className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span className="text-sm text-muted-foreground">Success Rate</span>
            </div>
            <p className="text-2xl font-bold">{stats.successRate.toFixed(1)}%</p>
          </Card>
          
          <Card className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Activity className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">P95 Latency</span>
            </div>
            <p className="text-2xl font-bold">{(stats.p95Duration / 1000).toFixed(2)}s</p>
          </Card>
          
          <Card className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Zap className="h-4 w-4 text-primary" />
              <span className="text-sm text-muted-foreground">Executions</span>
            </div>
            <p className="text-2xl font-bold">{stats.totalExecutions}</p>
          </Card>
        </div>
      )}

      {/* Auto-healing & Circuit Breaker Controls */}
      <Card className="p-4">
        <h3 className="font-semibold mb-4 flex items-center gap-2">
          <Settings2 className="h-4 w-4" />
          Reliability Settings
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-3">
              <Shield className="h-5 w-5 text-green-500" />
              <div>
                <Label htmlFor="auto-healing">Self-Healing</Label>
                <p className="text-xs text-muted-foreground">Auto-recover from failures</p>
              </div>
            </div>
            <Switch
              id="auto-healing"
              checked={autoHealing}
              onCheckedChange={setAutoHealing}
            />
          </div>
          
          <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              <div>
                <Label htmlFor="circuit-breaker">Circuit Breaker</Label>
                <p className="text-xs text-muted-foreground">Prevent cascade failures</p>
              </div>
            </div>
            <Switch
              id="circuit-breaker"
              checked={circuitBreaker}
              onCheckedChange={setCircuitBreaker}
            />
          </div>
        </div>
      </Card>

      {/* Optimization Suggestions */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Optimization Suggestions
          </h3>
          {suggestions.filter(s => !appliedOptimizations.has(s.id)).length > 0 && (
            <Button variant="outline" size="sm" onClick={applyAllOptimizations}>
              Apply All ({suggestions.filter(s => !appliedOptimizations.has(s.id)).length})
            </Button>
          )}
        </div>
        
        <div className="space-y-3">
          {suggestions.map(suggestion => (
            <Card 
              key={suggestion.id} 
              className={`p-4 transition-opacity ${appliedOptimizations.has(suggestion.id) ? 'opacity-50' : ''}`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-medium">{suggestion.title}</h4>
                    <Badge variant={getImpactBadge(suggestion.impact) as any}>
                      {suggestion.impact} impact
                    </Badge>
                    {appliedOptimizations.has(suggestion.id) && (
                      <Badge variant="secondary" className="gap-1">
                        <CheckCircle className="h-3 w-3" />
                        Applied
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mb-2">{suggestion.description}</p>
                  <p className={`text-sm font-medium ${getImpactColor(suggestion.impact)}`}>
                    Expected: {suggestion.estimatedImprovement}
                  </p>
                </div>
                {!appliedOptimizations.has(suggestion.id) && (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => applyOptimization(suggestion)}
                  >
                    Apply
                  </Button>
                )}
              </div>
            </Card>
          ))}
          
          {suggestions.length === 0 && !isAnalyzing && (
            <Card className="p-8 text-center">
              <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500" />
              <h3 className="font-semibold mb-2">Workflow is Optimized!</h3>
              <p className="text-muted-foreground">No optimization suggestions at this time.</p>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};
