import { useState } from "react";
import { Sparkles, Loader2 } from "lucide-react";
import { Button } from "./ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";

interface AIOptimizerProps {
  workflow: any;
  onOptimized: (nodes: any[]) => void;
}

export const AIOptimizer = ({ workflow, onOptimized }: AIOptimizerProps) => {
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [results, setResults] = useState<any>(null);
  const [showResults, setShowResults] = useState(false);
  const { toast } = useToast();

  const handleOptimize = async () => {
    if (!workflow?.nodes?.length) {
      toast({
        title: "No workflow",
        description: "Create some nodes first to optimize",
        variant: "destructive",
      });
      return;
    }

    setIsOptimizing(true);
    try {
      console.log('Sending workflow to AI Genius for optimization...');
      
      const { data, error } = await supabase.functions.invoke('optimize-workflow', {
        body: { 
          workflow: { nodes: workflow.nodes },
          userContext: "General workflow automation"
        }
      });

      if (error) throw error;

      console.log('Optimization complete:', data);
      
      setResults(data);
      setShowResults(true);
      
      toast({
        title: "Workflow Optimized!",
        description: "AI Genius has enhanced your workflow",
      });

    } catch (error: any) {
      console.error('Error optimizing workflow:', error);
      toast({
        title: "Optimization Failed",
        description: error.message || "Failed to optimize workflow",
        variant: "destructive",
      });
    } finally {
      setIsOptimizing(false);
    }
  };

  const applyOptimizations = () => {
    if (results?.optimizedWorkflow?.nodes) {
      onOptimized(results.optimizedWorkflow.nodes);
      setShowResults(false);
      toast({
        title: "Applied!",
        description: "Your workflow has been enhanced",
      });
    }
  };

  return (
    <>
      <div className="fixed top-20 left-6 z-40 animate-fade-in">
        <Button
          onClick={handleOptimize}
          disabled={isOptimizing || !workflow?.nodes?.length}
          className="bg-gradient-accent shadow-glow hover:shadow-lg transition-all"
        >
          {isOptimizing ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Optimizing...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 mr-2" />
              AI Genius Optimize
            </>
          )}
        </Button>
      </div>

      <Dialog open={showResults} onOpenChange={setShowResults}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-accent" />
              AI Genius Optimization Results
            </DialogTitle>
            <DialogDescription>
              Your workflow has been analyzed and enhanced beyond industry standards
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="h-[400px] pr-4">
            <div className="space-y-6">
              {/* Insights */}
              {results?.optimizedWorkflow?.insights && (
                <div>
                  <h3 className="font-semibold mb-2 text-foreground">Key Insights</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {results.optimizedWorkflow.insights}
                  </p>
                </div>
              )}

              {/* Suggestions */}
              {results?.suggestions && results.suggestions.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-3 text-foreground">Improvements Made</h3>
                  <div className="space-y-3">
                    {results.suggestions.map((suggestion: any, idx: number) => (
                      <div
                        key={idx}
                        className="p-3 rounded-lg bg-muted/50 border border-border"
                      >
                        <div className="flex items-start gap-2 mb-1">
                          <Badge
                            variant={
                              suggestion.type === 'mandatory'
                                ? 'destructive'
                                : suggestion.type === 'recommended'
                                ? 'default'
                                : 'secondary'
                            }
                            className="text-xs"
                          >
                            {suggestion.type}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            {suggestion.impact} impact
                          </Badge>
                        </div>
                        <h4 className="font-medium text-sm mb-1">{suggestion.title}</h4>
                        <p className="text-xs text-muted-foreground">
                          {suggestion.description}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Innovations */}
              {results?.innovations && results.innovations.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-2 text-foreground">
                    Beyond Industry Standards
                  </h3>
                  <ul className="space-y-2">
                    {results.innovations.map((innovation: string, idx: number) => (
                      <li
                        key={idx}
                        className="text-sm text-muted-foreground flex items-start gap-2"
                      >
                        <Sparkles className="w-4 h-4 text-accent mt-0.5 flex-shrink-0" />
                        <span>{innovation}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Node Count */}
              {results?.optimizedWorkflow?.nodes && (
                <div className="p-3 rounded-lg bg-accent/10 border border-accent/20">
                  <p className="text-sm font-medium">
                    Enhanced workflow: {workflow.nodes.length} → {results.optimizedWorkflow.nodes.length} nodes
                  </p>
                </div>
              )}
            </div>
          </ScrollArea>

          <div className="flex gap-2 justify-end pt-4 border-t">
            <Button variant="outline" onClick={() => setShowResults(false)}>
              Cancel
            </Button>
            <Button onClick={applyOptimizations} className="bg-gradient-accent">
              Apply Optimizations
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
