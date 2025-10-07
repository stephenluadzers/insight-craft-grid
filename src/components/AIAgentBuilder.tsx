import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Wand2, FileCode, Image, Mic } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface AIAgentBuilderProps {
  onWorkflowGenerated: (workflow: any) => void;
}

const AIAgentBuilder = ({ onWorkflowGenerated }: AIAgentBuilderProps) => {
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const { toast } = useToast();

  const handleGenerate = async () => {
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
        body: { description: prompt }
      });

      if (error) throw error;

      toast({
        title: "Workflow Generated",
        description: "Your AI-powered workflow is ready",
      });

      onWorkflowGenerated({
        nodes: data.nodes || [],
        explanation: data.explanation || ''
      });

      setPrompt('');
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

  return (
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
        <Button
          onClick={handleGenerate}
          disabled={isGenerating || !prompt.trim()}
          className="w-full"
          size="lg"
        >
          {isGenerating ? (
            <>
              <Wand2 className="mr-2 h-4 w-4 animate-spin" />
              Generating Workflow...
            </>
          ) : (
            <>
              <Sparkles className="mr-2 h-4 w-4" />
              Generate Workflow
            </>
          )}
        </Button>

        {/* Features Badge */}
        <div className="flex flex-wrap gap-2 pt-4 border-t">
          <Badge variant="secondary" className="text-xs">
            Multi-Model Support
          </Badge>
          <Badge variant="secondary" className="text-xs">
            Security Scanning
          </Badge>
          <Badge variant="secondary" className="text-xs">
            Enterprise Ready
          </Badge>
          <Badge variant="secondary" className="text-xs">
            Version Control
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
};

export default AIAgentBuilder;
