import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { Lightbulb, TrendingUp, DollarSign, Shield, CheckCircle, X } from "lucide-react";
import { toast } from "sonner";

interface Recommendation {
  id: string;
  workflow_id: string;
  recommendation_type: string;
  title: string;
  description: string;
  priority: string;
  impact_score: number;
  effort_score: number;
  recommendation_data: any;
  status: string;
  created_at: string;
}

export const RecommendationsEngine = ({ workspaceId }: { workspaceId: string }) => {
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    fetchRecommendations();
  }, [workspaceId]);

  const fetchRecommendations = async () => {
    const { data } = await supabase
      .from('workflow_recommendations')
      .select('*')
      .eq('workspace_id', workspaceId)
      .eq('status', 'pending')
      .order('impact_score', { ascending: false });

    setRecommendations(data || []);
  };

  const generateRecommendations = async () => {
    setGenerating(true);
    try {
      const { error } = await supabase.functions.invoke('generate-recommendations', {
        body: { workspaceId }
      });

      if (error) throw error;
      toast.success('Recommendations generated');
      fetchRecommendations();
    } catch (error) {
      toast.error('Failed to generate recommendations');
      console.error(error);
    } finally {
      setGenerating(false);
    }
  };

  const applyRecommendation = async (id: string) => {
    try {
      const { error } = await supabase
        .from('workflow_recommendations')
        .update({ 
          status: 'applied',
          applied_at: new Date().toISOString()
        })
        .eq('id', id);

      if (error) throw error;
      toast.success('Recommendation applied');
      fetchRecommendations();
    } catch (error) {
      toast.error('Failed to apply recommendation');
    }
  };

  const dismissRecommendation = async (id: string) => {
    try {
      const { error } = await supabase
        .from('workflow_recommendations')
        .update({ status: 'dismissed' })
        .eq('id', id);

      if (error) throw error;
      toast.success('Recommendation dismissed');
      fetchRecommendations();
    } catch (error) {
      toast.error('Failed to dismiss recommendation');
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'performance':
        return <TrendingUp className="h-5 w-5 text-primary" />;
      case 'cost':
        return <DollarSign className="h-5 w-5 text-green-500" />;
      case 'reliability':
        return <Shield className="h-5 w-5 text-amber-500" />;
      default:
        return <Lightbulb className="h-5 w-5 text-primary" />;
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'high':
        return <Badge variant="destructive">High Priority</Badge>;
      case 'medium':
        return <Badge variant="secondary">Medium Priority</Badge>;
      default:
        return <Badge variant="outline">Low Priority</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">AI Recommendations</h2>
          <p className="text-muted-foreground">Personalized optimization suggestions</p>
        </div>
        <Button onClick={generateRecommendations} disabled={generating}>
          <Lightbulb className={`h-4 w-4 mr-2 ${generating ? 'animate-pulse' : ''}`} />
          {generating ? 'Generating...' : 'Generate Recommendations'}
        </Button>
      </div>

      {recommendations.length === 0 ? (
        <Card className="p-8 text-center">
          <Lightbulb className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground mb-4">
            No recommendations yet. Generate personalized suggestions based on your workflow usage.
          </p>
          <Button onClick={generateRecommendations} disabled={generating}>
            Generate First Recommendations
          </Button>
        </Card>
      ) : (
        <div className="space-y-4">
          {recommendations.map(rec => (
            <Card key={rec.id} className="p-6">
              <div className="flex items-start gap-4">
                <div className="mt-1">
                  {getIcon(rec.recommendation_type)}
                </div>
                <div className="flex-1">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="font-semibold text-lg mb-1">{rec.title}</h3>
                      <p className="text-muted-foreground mb-3">{rec.description}</p>
                    </div>
                    {getPriorityBadge(rec.priority)}
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Impact</p>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-primary"
                            style={{ width: `${rec.impact_score * 100}%` }}
                          />
                        </div>
                        <span className="text-sm font-medium">{(rec.impact_score * 100).toFixed(0)}%</span>
                      </div>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Effort</p>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-amber-500"
                            style={{ width: `${rec.effort_score * 100}%` }}
                          />
                        </div>
                        <span className="text-sm font-medium">{(rec.effort_score * 100).toFixed(0)}%</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <Button size="sm" onClick={() => applyRecommendation(rec.id)}>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Apply
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => dismissRecommendation(rec.id)}>
                      <X className="h-4 w-4 mr-2" />
                      Dismiss
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
