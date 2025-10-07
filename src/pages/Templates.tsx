import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { BookTemplate, Download, TrendingUp, Star } from "lucide-react";
import { cn } from "@/lib/utils";

interface Template {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  nodes: any;
  use_count: number;
}

export default function Templates(): JSX.Element {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      const { data, error } = await supabase
        .from('workflow_templates')
        .select('*')
        .eq('is_public', true)
        .eq('approval_status', 'approved')
        .order('use_count', { ascending: false });

      if (error) throw error;
      setTemplates(data || []);
    } catch (error: any) {
      toast({
        title: "Failed to load templates",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleUseTemplate = async (template: Template) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data: profile } = await supabase
        .from('profiles')
        .select('default_workspace_id')
        .eq('id', user.id)
        .single();

      // Create workflow from template
      const { error } = await supabase
        .from('workflows')
        .insert({
          name: template.name,
          description: template.description,
          nodes: template.nodes,
          workspace_id: profile?.default_workspace_id,
          created_by: user.id,
          status: 'draft',
        });

      if (error) throw error;

      // Increment use count
      await supabase
        .from('workflow_templates')
        .update({ use_count: template.use_count + 1 })
        .eq('id', template.id);

      toast({
        title: "Template applied",
        description: "A new workflow has been created from this template.",
      });

      navigate("/");
    } catch (error: any) {
      toast({
        title: "Failed to use template",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Workflow Templates</h1>
        <p className="text-muted-foreground">
          Start with pre-built templates for common automation scenarios
        </p>
      </div>

      {templates.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <BookTemplate className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">No public templates available yet</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {templates.map((template) => (
            <Card 
              key={template.id} 
              className={cn(
                "group hover:shadow-glow transition-all duration-300 cursor-pointer",
                "hover:scale-105 hover:border-primary/50"
              )}
            >
              <CardHeader>
                <div className="flex items-start justify-between mb-2">
                  <Badge variant="secondary" className="text-xs">
                    {template.category || "General"}
                  </Badge>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <TrendingUp className="w-3 h-3" />
                    {template.use_count}
                  </div>
                </div>
                <CardTitle className="group-hover:text-primary transition-colors">
                  {template.name}
                </CardTitle>
                <CardDescription className="line-clamp-2">
                  {template.description}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span>{template.nodes?.length || 0} nodes</span>
                    {template.use_count > 10 && (
                      <Badge variant="outline" className="text-xs">
                        <Star className="w-3 h-3 mr-1 fill-yellow-400 text-yellow-400" />
                        Popular
                      </Badge>
                    )}
                  </div>
                  <Button
                    size="sm"
                    onClick={() => handleUseTemplate(template)}
                    className="gap-2"
                  >
                    <Download className="w-4 h-4" />
                    Use
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}