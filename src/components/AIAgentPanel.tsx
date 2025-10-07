import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Bot, Sparkles, Zap, Send } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface AIAgentPanelProps {
  workflowId?: string;
  onWorkflowUpdate?: (nodes: any[]) => void;
}

export const AIAgentPanel = ({ workflowId, onWorkflowUpdate }: AIAgentPanelProps) => {
  const [prompt, setPrompt] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();

  const handleAICommand = async () => {
    if (!prompt.trim()) return;

    setIsProcessing(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-workflow-from-text", {
        body: { prompt },
      });

      if (error) throw error;

      if (data?.workflow?.nodes) {
        onWorkflowUpdate?.(data.workflow.nodes);
        toast({
          title: "AI Agent completed",
          description: "Workflow has been updated based on your command",
        });
        setPrompt("");
      }
    } catch (error: any) {
      toast({
        title: "AI Agent failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const quickActions = [
    {
      label: "Add email notification",
      prompt: "Add an email notification step at the end",
      icon: Zap,
    },
    {
      label: "Add AI analysis",
      prompt: "Add an AI step to analyze the data",
      icon: Sparkles,
    },
    {
      label: "Optimize workflow",
      prompt: "Optimize this workflow for better performance",
      icon: Bot,
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bot className="w-5 h-5" />
          AI Agent Assistant
        </CardTitle>
        <CardDescription>
          Give your AI agent commands to modify and enhance your workflow
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Quick Actions */}
        <div>
          <Label className="text-xs text-muted-foreground mb-2 block">Quick Actions</Label>
          <div className="flex flex-wrap gap-2">
            {quickActions.map((action) => {
              const Icon = action.icon;
              return (
                <Button
                  key={action.label}
                  variant="outline"
                  size="sm"
                  onClick={() => setPrompt(action.prompt)}
                  className="text-xs"
                >
                  <Icon className="w-3 h-3 mr-1" />
                  {action.label}
                </Button>
              );
            })}
          </div>
        </div>

        {/* AI Command Input */}
        <div className="space-y-2">
          <Label htmlFor="ai-prompt">Command</Label>
          <Textarea
            id="ai-prompt"
            placeholder="e.g., Add a condition to check if the email is valid..."
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={3}
            className="resize-none"
          />
        </div>

        <Button
          onClick={handleAICommand}
          disabled={!prompt.trim() || isProcessing}
          className="w-full"
        >
          {isProcessing ? (
            <>
              <Bot className="w-4 h-4 mr-2 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              <Send className="w-4 h-4 mr-2" />
              Execute Command
            </>
          )}
        </Button>

        {/* Status Indicators */}
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>AI Status</span>
          <Badge variant={isProcessing ? "default" : "secondary"} className="text-xs">
            {isProcessing ? "Active" : "Ready"}
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
};
