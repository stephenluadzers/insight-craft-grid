import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle, XCircle, Clock, FileEdit } from "lucide-react";
import { TemplateApprovalDialog } from "@/components/TemplateApprovalDialog";

interface Template {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  nodes: any;
  approval_status: string;
  created_by: string;
  rejection_reason: string | null;
}

export default function TemplateReview(): JSX.Element {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      const { data, error } = await supabase
        .from('workflow_templates')
        .select('*')
        .in('approval_status', ['pending', 'draft'])
        .order('created_at', { ascending: false });

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

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="w-4 h-4" />;
      case 'approved':
        return <CheckCircle className="w-4 h-4" />;
      case 'rejected':
        return <XCircle className="w-4 h-4" />;
      case 'draft':
        return <FileEdit className="w-4 h-4" />;
      default:
        return null;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'secondary';
      case 'approved':
        return 'default';
      case 'rejected':
        return 'destructive';
      case 'draft':
        return 'outline';
      default:
        return 'secondary';
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
        <h1 className="text-3xl font-bold mb-2">Template Review</h1>
        <p className="text-muted-foreground">
          Review and approve templates for publication
        </p>
      </div>

      {templates.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <CheckCircle className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">No templates pending review</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {templates.map((template) => (
            <Card key={template.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between mb-2">
                  <Badge variant={getStatusColor(template.approval_status) as any}>
                    <span className="flex items-center gap-1">
                      {getStatusIcon(template.approval_status)}
                      {template.approval_status}
                    </span>
                  </Badge>
                  <Badge variant="secondary">{template.category || "General"}</Badge>
                </div>
                <CardTitle>{template.name}</CardTitle>
                <CardDescription>{template.description}</CardDescription>
                {template.rejection_reason && (
                  <p className="text-xs text-destructive mt-2">
                    Reason: {template.rejection_reason}
                  </p>
                )}
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    {template.nodes?.length || 0} nodes
                  </span>
                  <Button
                    size="sm"
                    onClick={() => setSelectedTemplate(template)}
                  >
                    Review
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {selectedTemplate && (
        <TemplateApprovalDialog
          isOpen={!!selectedTemplate}
          onClose={() => setSelectedTemplate(null)}
          templateId={selectedTemplate.id}
          templateName={selectedTemplate.name}
          currentStatus={selectedTemplate.approval_status}
          onStatusChanged={loadTemplates}
        />
      )}
    </div>
  );
}
