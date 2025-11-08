import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sparkles, Wand2, FileCode, Image, Mic, Eye, Code2, MessageSquare, Lightbulb, CheckCircle2, DollarSign, X } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { WorkflowROIReport } from './WorkflowROIReport';

interface AIAgentBuilderProps {
  onWorkflowGenerated: (workflow: any) => void;
}

const AIAgentBuilder = ({ onWorkflowGenerated }: AIAgentBuilderProps) => {
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedWorkflow, setGeneratedWorkflow] = useState<any>(null);
  const [explanation, setExplanation] = useState('');
  const [showROIReport, setShowROIReport] = useState(false);
  const [workflowName, setWorkflowName] = useState('');
  const { toast } = useToast();

  const handleGenerate = async (existingWorkflow?: any) => {
    if (!prompt.trim()) {
      toast({
        title: "Input Required",
        description: "Please describe the workflow you want to create",
        variant: "destructive"
      });
      return;
    }

    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-workflow-from-text', {
        body: { 
          description: prompt,
          existingWorkflow: existingWorkflow || generatedWorkflow
        }
      });

      if (error) throw error;

      const workflow = {
        nodes: data.nodes || [],
        explanation: data.explanation || ''
      };
      
      setGeneratedWorkflow(workflow);
      setExplanation(data.explanation || '');
      setWorkflowName(data.workflowName || 'Generated Workflow');
      setShowROIReport(true);

      toast({
        title: existingWorkflow ? "Workflow Improved" : "Workflow Generated",
        description: existingWorkflow 
          ? "Your workflow has been enhanced based on your instructions"
          : "Review your AI-powered workflow and ROI report",
      });
    } catch (error: any) {
      console.error('Error generating workflow:', error);
      toast({
        title: "Generation Failed",
        description: error.message || "Failed to generate workflow",
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const quickPrompts = [
    {
      label: "Customer Onboarding",
      prompt: "Create a customer onboarding workflow that sends a welcome email, creates a CRM record, and schedules a follow-up call",
      icon: Sparkles
    },
    {
      label: "Data Processing Pipeline",
      prompt: "Build a data processing pipeline that validates incoming data, transforms it, and stores it in a database",
      icon: FileCode
    },
    {
      label: "Multi-Channel Notification",
      prompt: "Create a notification system that sends alerts via email, SMS, and Slack when specific conditions are met",
      icon: Wand2
    },
    {
      label: "Image Analysis Workflow",
      prompt: "Build an image analysis workflow that processes uploaded images, extracts metadata, and categorizes them",
      icon: Image
    },
    {
      label: "Voice Command Handler",
      prompt: "Create a voice command workflow that transcribes audio, extracts intent, and triggers appropriate actions",
      icon: Mic
    }
  ];

  const handleApplyWorkflow = () => {
    if (generatedWorkflow) {
      onWorkflowGenerated(generatedWorkflow);
      toast({
        title: "Workflow Applied",
        description: "The workflow has been added to your canvas",
      });
      setPrompt('');
      setGeneratedWorkflow(null);
      setExplanation('');
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full">
      {/* Input Panel */}
      <Card className="border-primary/20 bg-gradient-to-br from-background to-primary/5">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <CardTitle>AI Workflow Builder</CardTitle>
          </div>
          <CardDescription>
            Describe your workflow in plain English and let AI build it for you
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
        {/* Quick Prompts */}
        <div className="space-y-3">
          <label className="text-sm font-medium">Quick Start Templates</label>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
            {quickPrompts.map((item, idx) => {
              const Icon = item.icon;
              return (
                <Button
                  key={idx}
                  variant="outline"
                  className="justify-start h-auto py-3 px-4"
                  onClick={() => setPrompt(item.prompt)}
                >
                  <Icon className="h-4 w-4 mr-2 flex-shrink-0" />
                  <span className="text-left text-sm">{item.label}</span>
                </Button>
              );
            })}
          </div>
        </div>

        {/* Custom Prompt */}
        <div className="space-y-3">
          <label className="text-sm font-medium">Custom Workflow Description</label>
          <Textarea
            placeholder="Example: Create a workflow that monitors social media mentions, analyzes sentiment, and escalates negative feedback to the support team..."
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            className="min-h-[120px] resize-none"
          />
        </div>

        {/* Generate Button */}
        <div className="flex gap-2">
          <Button
            onClick={() => handleGenerate()}
            disabled={isGenerating || !prompt.trim()}
            className="flex-1"
            size="lg"
          >
            {isGenerating ? (
              <>
                <Wand2 className="mr-2 h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                {generatedWorkflow ? 'Improve Workflow' : 'Generate Workflow'}
              </>
            )}
          </Button>
          {generatedWorkflow && (
            <Button
              onClick={() => {
                setGeneratedWorkflow(null);
                setExplanation('');
                setPrompt('');
              }}
              variant="outline"
              size="lg"
            >
              Clear
            </Button>
          )}
        </div>

          {/* Helpful Tips */}
          <Alert className="bg-primary/5 border-primary/20">
            <Lightbulb className="h-4 w-4 text-primary" />
            <AlertDescription className="text-sm">
              <strong>Tips:</strong> Be specific about inputs, conditions, and desired outputs. 
              Mention integrations by name (e.g., "send via Slack", "store in database").
            </AlertDescription>
          </Alert>

          {/* Features Badge */}
          <div className="flex flex-wrap gap-2 pt-4 border-t">
            <Badge variant="secondary" className="text-xs">
              <CheckCircle2 className="h-3 w-3 mr-1" />
              Multi-Model Support
            </Badge>
            <Badge variant="secondary" className="text-xs">
              <CheckCircle2 className="h-3 w-3 mr-1" />
              Security Scanning
            </Badge>
            <Badge variant="secondary" className="text-xs">
              <CheckCircle2 className="h-3 w-3 mr-1" />
              Enterprise Ready
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Preview Panel */}
      <Card className="border-primary/20">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Eye className="h-5 w-5 text-primary" />
              <CardTitle>Workflow Preview</CardTitle>
            </div>
            {generatedWorkflow && (
              <div className="flex gap-2">
                <Button onClick={() => setShowROIReport(true)} variant="outline" size="sm">
                  <DollarSign className="h-4 w-4 mr-2" />
                  View ROI Report
                </Button>
                <Button onClick={handleApplyWorkflow} size="sm">
                  <Sparkles className="h-4 w-4 mr-2" />
                  Apply to Canvas
                </Button>
              </div>
            )}
          </div>
          <CardDescription>
            Review and understand your generated workflow
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!generatedWorkflow ? (
            <div className="flex flex-col items-center justify-center py-16 text-center space-y-4">
              <div className="rounded-full bg-primary/10 p-6">
                <MessageSquare className="h-12 w-12 text-primary" />
              </div>
              <div className="space-y-2">
                <h3 className="font-semibold text-lg">No Workflow Generated Yet</h3>
                <p className="text-sm text-muted-foreground max-w-md">
                  Describe your workflow using the builder on the left, and watch as AI generates 
                  a complete automation workflow for you.
                </p>
              </div>
            </div>
          ) : (
            <Tabs defaultValue="explanation" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="explanation">
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Explanation
                </TabsTrigger>
                <TabsTrigger value="structure">
                  <Code2 className="h-4 w-4 mr-2" />
                  Structure
                </TabsTrigger>
                <TabsTrigger value="nodes">
                  <FileCode className="h-4 w-4 mr-2" />
                  Nodes ({generatedWorkflow.nodes.length})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="explanation" className="mt-4">
                <ScrollArea className="h-[500px] pr-4">
                  <div className="space-y-4">
                    <Alert className="bg-primary/5 border-primary/20">
                      <Sparkles className="h-4 w-4 text-primary" />
                      <AlertDescription className="text-sm leading-relaxed">
                        {explanation || 'AI-generated workflow ready to use'}
                      </AlertDescription>
                    </Alert>
                    
                    <div className="space-y-3">
                      <h4 className="font-semibold text-sm">Workflow Steps:</h4>
                      {generatedWorkflow.nodes.map((node: any, idx: number) => (
                        <div key={idx} className="p-4 rounded-lg border bg-card space-y-2">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs">
                              Step {idx + 1}
                            </Badge>
                            <span className="font-medium text-sm">{node.type}</span>
                          </div>
                          {node.config?.description && (
                            <p className="text-sm text-muted-foreground">
                              {node.config.description}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </ScrollArea>
              </TabsContent>

              <TabsContent value="structure" className="mt-4">
                <ScrollArea className="h-[500px]">
                  <pre className="text-xs bg-muted p-4 rounded-lg overflow-x-auto">
                    {JSON.stringify(generatedWorkflow, null, 2)}
                  </pre>
                </ScrollArea>
              </TabsContent>

              <TabsContent value="nodes" className="mt-4">
                <ScrollArea className="h-[500px] pr-4">
                  <div className="space-y-3">
                    {generatedWorkflow.nodes.map((node: any, idx: number) => (
                      <Card key={idx}>
                        <CardHeader className="pb-3">
                          <div className="flex items-center justify-between">
                            <CardTitle className="text-sm">{node.type}</CardTitle>
                            <Badge>{node.id}</Badge>
                          </div>
                        </CardHeader>
                        <CardContent className="text-xs">
                          <pre className="bg-muted p-3 rounded overflow-x-auto">
                            {JSON.stringify(node, null, 2)}
                          </pre>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </ScrollArea>
              </TabsContent>
            </Tabs>
          )}
        </CardContent>
      </Card>

      {/* ROI Report Modal */}
      {showROIReport && generatedWorkflow && generatedWorkflow.nodes && (
        <div className="fixed inset-0 bg-background/95 z-50 overflow-y-auto p-6">
          <div className="max-w-7xl mx-auto">
            <div className="flex justify-end mb-4">
              <Button variant="ghost" onClick={() => setShowROIReport(false)}>
                <X className="h-4 w-4 mr-2" />
                Close Report
              </Button>
            </div>
            <WorkflowROIReport nodes={generatedWorkflow.nodes} workflowName={workflowName} />
          </div>
        </div>
      )}
    </div>
  );
};

export default AIAgentBuilder;
