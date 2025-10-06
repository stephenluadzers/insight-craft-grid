import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "./ui/dialog";
import { Button } from "./ui/button";
import { Textarea } from "./ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Mic, MicOff, Sparkles, Upload, ImageIcon, FileText } from "lucide-react";
import { ScrollArea } from "./ui/scroll-area";
import { WorkflowNodeData } from "./WorkflowNode";

interface WorkflowGenerationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onWorkflowGenerated: (nodes: any[]) => void;
}

export const WorkflowGenerationDialog = ({ open, onOpenChange, onWorkflowGenerated }: WorkflowGenerationDialogProps): JSX.Element => {
  const [workflowIdea, setWorkflowIdea] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [generatedExplanation, setGeneratedExplanation] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
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
        onOpenChange(false); // Close the dialog
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

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast({
        title: "Invalid file",
        description: "Please upload an image file",
        variant: "destructive",
      });
      return;
    }

    setIsAnalyzing(true);
    setGeneratedExplanation("");

    try {
      const base64 = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(file);
      });

      const { data, error } = await supabase.functions.invoke('analyze-workflow-image', {
        body: { image: base64 }
      });

      if (error) throw error;

      setGeneratedExplanation(data.insights || "Successfully extracted workflow from image");
      
      if (data.nodes && data.nodes.length > 0) {
        onWorkflowGenerated(data.nodes);
        onOpenChange(false); // Close the dialog
        toast({
          title: "Workflow Generated!",
          description: `Created ${data.nodes.length} nodes from your image`,
        });
      }
    } catch (error: any) {
      toast({
        title: "Analysis Failed",
        description: error.message || "Failed to analyze image",
        variant: "destructive",
      });
    } finally {
      setIsAnalyzing(false);
      e.target.value = '';
    }
  };

  const handleJSONImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const data = JSON.parse(text);

      if (!data.nodes || !Array.isArray(data.nodes)) {
        throw new Error('Invalid workflow file format');
      }

      const validatedNodes: WorkflowNodeData[] = data.nodes.map((node: any) => ({
        id: node.id || Date.now().toString(),
        type: node.type,
        title: node.title,
        description: node.description,
        x: node.x,
        y: node.y,
        config: node.config || {},
      }));

      onWorkflowGenerated(validatedNodes);
      setGeneratedExplanation(`Imported ${validatedNodes.length} nodes with configurations`);
      onOpenChange(false); // Close the dialog

      toast({
        title: "Workflow Imported",
        description: `Successfully loaded ${validatedNodes.length} nodes`,
      });
    } catch (error: any) {
      toast({
        title: "Import Failed",
        description: error.message,
        variant: "destructive",
      });
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>AI Workflow Generator</DialogTitle>
          <DialogDescription>
            Generate workflows from text, images, or import existing workflows
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="text" className="flex-1 overflow-hidden flex flex-col">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="text">
              <FileText className="w-4 h-4 mr-2" />
              Text
            </TabsTrigger>
            <TabsTrigger value="image">
              <ImageIcon className="w-4 h-4 mr-2" />
              Image
            </TabsTrigger>
            <TabsTrigger value="import">
              <Upload className="w-4 h-4 mr-2" />
              Import
            </TabsTrigger>
          </TabsList>

          <TabsContent value="text" className="flex-1 overflow-hidden flex flex-col space-y-4 mt-4">
            <div className="space-y-2">
              <Textarea
                value={workflowIdea}
                onChange={(e) => setWorkflowIdea(e.target.value)}
                placeholder="E.g., I want a workflow that monitors my email, uses AI to categorize important messages, and sends me a daily summary..."
                rows={6}
                className="flex-1"
              />
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
                      Recording...
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
                      Generate
                    </>
                  )}
                </Button>
              </div>
            </div>
            
            {generatedExplanation && (
              <div className="flex-1 overflow-hidden flex flex-col">
                <h3 className="text-sm font-medium mb-2">Result:</h3>
                <ScrollArea className="flex-1 border rounded-md p-4 bg-muted/30">
                  <p className="text-sm whitespace-pre-wrap">{generatedExplanation}</p>
                </ScrollArea>
              </div>
            )}
          </TabsContent>

          <TabsContent value="image" className="flex-1 overflow-hidden flex flex-col space-y-4 mt-4">
            <div className="flex flex-col items-center justify-center border-2 border-dashed rounded-lg p-8 space-y-4">
              <ImageIcon className="w-12 h-12 text-muted-foreground" />
              <div className="text-center space-y-2">
                <p className="text-sm font-medium">Upload a workflow diagram or screenshot</p>
                <p className="text-xs text-muted-foreground">
                  AI will analyze the image and generate a workflow
                </p>
              </div>
              <input
                ref={imageInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />
              <Button
                onClick={() => imageInputRef.current?.click()}
                disabled={isAnalyzing}
                className="w-full max-w-xs"
              >
                {isAnalyzing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-2" />
                    Upload Image
                  </>
                )}
              </Button>
            </div>

            {generatedExplanation && (
              <div className="flex-1 overflow-hidden flex flex-col">
                <h3 className="text-sm font-medium mb-2">Analysis Result:</h3>
                <ScrollArea className="flex-1 border rounded-md p-4 bg-muted/30">
                  <p className="text-sm whitespace-pre-wrap">{generatedExplanation}</p>
                </ScrollArea>
              </div>
            )}
          </TabsContent>

          <TabsContent value="import" className="flex-1 overflow-hidden flex flex-col space-y-4 mt-4">
            <div className="flex flex-col items-center justify-center border-2 border-dashed rounded-lg p-8 space-y-4">
              <Upload className="w-12 h-12 text-muted-foreground" />
              <div className="text-center space-y-2">
                <p className="text-sm font-medium">Import workflow from JSON</p>
                <p className="text-xs text-muted-foreground">
                  Load a previously exported workflow with all configurations
                </p>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleJSONImport}
                className="hidden"
              />
              <Button
                onClick={() => fileInputRef.current?.click()}
                className="w-full max-w-xs"
              >
                <Upload className="w-4 h-4 mr-2" />
                Select JSON File
              </Button>
            </div>

            {generatedExplanation && (
              <div className="flex-1 overflow-hidden flex flex-col">
                <h3 className="text-sm font-medium mb-2">Import Result:</h3>
                <ScrollArea className="flex-1 border rounded-md p-4 bg-muted/30">
                  <p className="text-sm whitespace-pre-wrap">{generatedExplanation}</p>
                </ScrollArea>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};