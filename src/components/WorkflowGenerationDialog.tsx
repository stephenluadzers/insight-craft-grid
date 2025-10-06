import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "./ui/dialog";
import { Button } from "./ui/button";
import { Textarea } from "./ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Mic, MicOff, Sparkles } from "lucide-react";
import { ScrollArea } from "./ui/scroll-area";

interface WorkflowGenerationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onWorkflowGenerated: (nodes: any[]) => void;
}

export const WorkflowGenerationDialog = ({ open, onOpenChange, onWorkflowGenerated }: WorkflowGenerationDialogProps) => {
  const [workflowIdea, setWorkflowIdea] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [generatedExplanation, setGeneratedExplanation] = useState("");
  const { toast } = useToast();

  const handleGenerate = async () => {
    if (!workflowIdea.trim()) {
      toast({
        title: "Input required",
        description: "Please describe your workflow idea",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);
    setGeneratedExplanation("");

    try {
      const { data, error } = await supabase.functions.invoke('generate-workflow-from-text', {
        body: { description: workflowIdea }
      });

      if (error) throw error;

      setGeneratedExplanation(data.explanation || "Workflow generated successfully!");
      
      if (data.nodes && data.nodes.length > 0) {
        onWorkflowGenerated(data.nodes);
        toast({
          title: "Workflow Generated!",
          description: `Created ${data.nodes.length} nodes from your description`,
        });
      }
    } catch (error: any) {
      toast({
        title: "Generation Failed",
        description: error.message || "Failed to generate workflow",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleVoiceInput = async () => {
    if (!isRecording) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const mediaRecorder = new MediaRecorder(stream);
        const audioChunks: Blob[] = [];

        mediaRecorder.ondataavailable = (event) => {
          audioChunks.push(event.data);
        };

        mediaRecorder.onstop = async () => {
          const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
          const reader = new FileReader();
          
          reader.onloadend = async () => {
            const base64Audio = (reader.result as string).split(',')[1];
            
            try {
              const { data, error } = await supabase.functions.invoke('transcribe-audio', {
                body: { audio: base64Audio }
              });

              if (error) throw error;
              setWorkflowIdea(prev => prev + (prev ? " " : "") + data.text);
              
              toast({
                title: "Transcribed!",
                description: "Voice input added to your workflow idea",
              });
            } catch (error: any) {
              toast({
                title: "Transcription failed",
                description: error.message,
                variant: "destructive",
              });
            }
          };
          
          reader.readAsDataURL(audioBlob);
          stream.getTracks().forEach(track => track.stop());
        };

        mediaRecorder.start();
        setIsRecording(true);

        setTimeout(() => {
          if (mediaRecorder.state === 'recording') {
            mediaRecorder.stop();
            setIsRecording(false);
          }
        }, 10000);

      } catch (error: any) {
        toast({
          title: "Microphone access denied",
          description: error.message,
          variant: "destructive",
        });
      }
    } else {
      setIsRecording(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Generate Workflow from Text</DialogTitle>
          <DialogDescription>
            Describe your workflow idea in plain English
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 space-y-4 overflow-hidden flex flex-col">
          <div className="space-y-2">
            <div className="flex gap-2">
              <Textarea
                value={workflowIdea}
                onChange={(e) => setWorkflowIdea(e.target.value)}
                placeholder="E.g., I want a workflow that monitors my email, uses AI to categorize important messages, and sends me a daily summary..."
                rows={6}
                className="flex-1"
              />
            </div>
            <div className="flex gap-2">
              <Button
                onClick={handleVoiceInput}
                variant={isRecording ? "destructive" : "outline"}
                size="sm"
                className="flex-1"
              >
                {isRecording ? (
                  <>
                    <MicOff className="w-4 h-4 mr-2" />
                    Recording... (Click to stop)
                  </>
                ) : (
                  <>
                    <Mic className="w-4 h-4 mr-2" />
                    Voice Input
                  </>
                )}
              </Button>
              <Button
                onClick={handleGenerate}
                disabled={isGenerating || !workflowIdea.trim()}
                className="flex-1"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Generate Workflow
                  </>
                )}
              </Button>
            </div>
          </div>

          {generatedExplanation && (
            <div className="flex-1 overflow-hidden flex flex-col">
              <h3 className="text-sm font-medium mb-2">Generated Workflow Explanation:</h3>
              <ScrollArea className="flex-1 border rounded-md p-4 bg-muted/30">
                <p className="text-sm whitespace-pre-wrap">{generatedExplanation}</p>
              </ScrollArea>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};