import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "./ui/dialog";
import { Button } from "./ui/button";
import { Textarea } from "./ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Mic, MicOff, Sparkles, Upload, ImageIcon, FileText, Download, Camera, FileJson, Package } from "lucide-react";
import { ScrollArea } from "./ui/scroll-area";
import { WorkflowNodeData } from "./WorkflowNode";
import html2canvas from "html2canvas";
import { z } from "zod";
import { generateWorkflowName } from "@/lib/workflowUtils";
import { WorkflowBusinessExport } from "./WorkflowBusinessExport";

const workflowIdeaSchema = z.string().trim().min(10, "Description must be at least 10 characters").max(5000, "Description must be less than 5000 characters");

const workflowNodeSchema = z.object({
  id: z.string(),
  type: z.string(),
  title: z.string().max(100),
  description: z.string().max(500),
  x: z.number(),
  y: z.number(),
  config: z.record(z.unknown()),
});

interface WorkflowGenerationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onWorkflowGenerated: (nodes: any[]) => void;
  nodes: WorkflowNodeData[];
  workflowName: string;
}

export const WorkflowGenerationDialog = ({ open, onOpenChange, onWorkflowGenerated, nodes, workflowName }: WorkflowGenerationDialogProps): JSX.Element => {
  const [workflowIdea, setWorkflowIdea] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [generatedExplanation, setGeneratedExplanation] = useState("");
  const [showBusinessExport, setShowBusinessExport] = useState(false);
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleGenerate = async () => {
    // Validate input
    const validation = workflowIdeaSchema.safeParse(workflowIdea);
    if (!validation.success) {
      toast({
        title: "Input Invalid",
        description: validation.error.errors[0].message,
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);
    setGeneratedExplanation("");

    try {
      const { data, error } = await supabase.functions.invoke('generate-workflow-from-text', {
        body: { description: validation.data }
      });

      if (error) throw error;

      setGeneratedExplanation(data.explanation || "Workflow generated successfully!");
      
      if (data.nodes && data.nodes.length > 0) {
        onWorkflowGenerated(data.nodes);
        onOpenChange(false);
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

  const handleImageSelection = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    // Validate each file
    const validFiles: File[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      
      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast({
          title: "Invalid file",
          description: `${file.name} is not an image file`,
          variant: "destructive",
        });
        continue;
      }

      // Validate file size (max 10MB per image)
      if (file.size > 10 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: `${file.name} must be less than 10MB`,
          variant: "destructive",
        });
        continue;
      }

      validFiles.push(file);
    }

    if (validFiles.length > 0) {
      setSelectedImages(prev => [...prev, ...validFiles]);
      toast({
        title: "Images selected",
        description: `${validFiles.length} image${validFiles.length > 1 ? 's' : ''} added`,
      });
    }

    e.target.value = '';
  };

  const handleGenerateFromImages = async () => {
    if (selectedImages.length === 0) return;

    setIsAnalyzing(true);
    setGeneratedExplanation("");

    try {
      // Convert all files to base64
      const base64Images = await Promise.all(
        selectedImages.map(file => 
          new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.readAsDataURL(file);
          })
        )
      );

      const { data, error } = await supabase.functions.invoke('analyze-workflow-image', {
        body: { images: base64Images }
      });

      if (error) throw error;

      setGeneratedExplanation(data.insights || "Successfully extracted workflow from images");
      
      if (data.nodes && data.nodes.length > 0) {
        onWorkflowGenerated(data.nodes);
        onOpenChange(false);
        toast({
          title: "Workflow Generated!",
          description: `Created ${data.nodes.length} nodes from ${selectedImages.length} image${selectedImages.length > 1 ? 's' : ''}`,
        });
      }
    } catch (error: any) {
      toast({
        title: "Analysis Failed",
        description: error.message || "Failed to analyze images",
        variant: "destructive",
      });
    } finally {
      setIsAnalyzing(false);
      setSelectedImages([]);
    }
  };

  const removeImage = (index: number) => {
    setSelectedImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleJSONImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file size (max 1MB)
    if (file.size > 1024 * 1024) {
      toast({
        title: "File too large",
        description: "JSON file must be less than 1MB",
        variant: "destructive",
      });
      return;
    }

    try {
      const text = await file.text();
      const data = JSON.parse(text);

      if (!data.nodes || !Array.isArray(data.nodes)) {
        throw new Error('Invalid workflow file format - missing nodes array');
      }

      if (data.nodes.length > 100) {
        throw new Error('Too many nodes - maximum 100 nodes allowed');
      }

      // Validate each node
      const validatedNodes: WorkflowNodeData[] = data.nodes.map((node: any, index: number) => {
        const validation = workflowNodeSchema.safeParse({
          id: node.id || `node-${Date.now()}-${index}`,
          type: node.type,
          title: node.title,
          description: node.description,
          x: node.x || 0,
          y: node.y || 0,
          config: node.config || {},
        });

        if (!validation.success) {
          throw new Error(`Invalid node at index ${index}: ${validation.error.errors[0].message}`);
        }

        return validation.data as WorkflowNodeData;
      });

      onWorkflowGenerated(validatedNodes);
      setGeneratedExplanation(`Imported ${validatedNodes.length} nodes with configurations`);
      onOpenChange(false);

      toast({
        title: "Workflow Imported",
        description: `Successfully loaded ${validatedNodes.length} nodes`,
      });
    } catch (error: any) {
      toast({
        title: "Import Failed",
        description: error.message || "Invalid JSON format",
        variant: "destructive",
      });
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const exportToJSON = () => {
    const workflowData = {
      name: workflowName,
      version: "1.0",
      nodes: nodes.map(node => ({
        id: node.id,
        type: node.type,
        title: node.title,
        description: node.description,
        x: node.x,
        y: node.y,
        config: node.config || {},
      })),
      exportedAt: new Date().toISOString(),
    };

    const blob = new Blob([JSON.stringify(workflowData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    
    // Generate intelligent filename
    const filename = generateWorkflowName(nodes);
    a.download = `${filename}.json`;
    
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      title: "Exported to JSON",
      description: "Workflow configuration downloaded successfully",
    });
  };

  const exportCombined = async () => {
    setIsExporting(true);
    
    try {
      // Generate intelligent filename
      const filename = generateWorkflowName(nodes);
      
      // Capture screenshot first
      const canvasElement = document.querySelector('.workflow-canvas') as HTMLElement;
      if (!canvasElement) {
        throw new Error('Canvas element not found');
      }

      const nodeElements = canvasElement.querySelectorAll('[data-node-id]');
      if (nodeElements.length === 0) {
        throw new Error('No nodes found to screenshot');
      }

      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      
      nodeElements.forEach(el => {
        const rect = el.getBoundingClientRect();
        const canvasRect = canvasElement.getBoundingClientRect();
        const relX = rect.left - canvasRect.left;
        const relY = rect.top - canvasRect.top;
        
        minX = Math.min(minX, relX);
        minY = Math.min(minY, relY);
        maxX = Math.max(maxX, relX + rect.width);
        maxY = Math.max(maxY, relY + rect.height);
      });

      const padding = 40;
      const cropX = Math.max(0, minX - padding);
      const cropY = Math.max(0, minY - padding);
      const cropWidth = (maxX - minX) + (padding * 2);
      const cropHeight = (maxY - minY) + (padding * 2);

      const canvas = await html2canvas(canvasElement, {
        backgroundColor: '#1a1a1a',
        scale: 2,
        logging: false,
        x: cropX,
        y: cropY,
        width: cropWidth,
        height: cropHeight,
      });

      const screenshotBlob = await new Promise<Blob>((resolve) => {
        canvas.toBlob((blob) => {
          if (blob) resolve(blob);
        }, 'image/png');
      });

      // Generate comprehensive export bundle
      const { exportWorkflowForBusiness } = await import('@/lib/workflowExport');
      const exportBlob = await exportWorkflowForBusiness(nodes, workflowName, {
        platform: 'supabase-function',
        includeDocs: true,
        includeTests: false,
      });

      // Add screenshot to the export bundle
      const JSZip = (await import('jszip')).default;
      const zip = await JSZip.loadAsync(exportBlob);
      zip.file(`${filename}-screenshot.png`, screenshotBlob);

      // Generate final bundle
      const finalBlob = await zip.generateAsync({ type: 'blob' });

      // Download the complete package
      const url = URL.createObjectURL(finalBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${filename}-complete-export.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: "Export Complete",
        description: "Complete workflow package with manifest, deploy scripts, and screenshot downloaded",
      });
    } catch (error: any) {
      toast({
        title: "Export Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Workflow Manager</DialogTitle>
          <DialogDescription>
            Generate, import, and export workflows using AI or manual import
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="text" className="flex-1 overflow-hidden flex flex-col space-y-4">
          <TabsList className="grid w-full grid-cols-4">
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
            <TabsTrigger value="export">
              <Download className="w-4 h-4 mr-2" />
              Export
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
                <h3 className="text-lg font-semibold">Upload Multiple Images</h3>
                <p className="text-sm text-muted-foreground">
                  Select multiple workflow diagrams, screenshots, or sketches to stitch together into a single workflow
                </p>
              </div>
              <input
                ref={imageInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={handleImageSelection}
                className="hidden"
              />
              <div className="flex gap-2">
                <Button
                  onClick={() => imageInputRef.current?.click()}
                  disabled={isAnalyzing}
                  variant="outline"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Select Images
                </Button>
                {selectedImages.length > 0 && (
                  <Button
                    onClick={handleGenerateFromImages}
                    disabled={isAnalyzing}
                  >
                    {isAnalyzing ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Analyzing...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 mr-2" />
                        Generate from {selectedImages.length} Image{selectedImages.length > 1 ? 's' : ''}
                      </>
                    )}
                  </Button>
                )}
              </div>
            </div>

            {selectedImages.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-sm font-medium">Selected Images ({selectedImages.length}):</h3>
                <ScrollArea className="h-32 border rounded-md p-2">
                  <div className="space-y-2">
                    {selectedImages.map((file, index) => (
                      <div key={index} className="flex items-center justify-between bg-muted/50 rounded p-2">
                        <span className="text-sm truncate flex-1">{file.name}</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeImage(index)}
                          className="h-6 w-6 p-0"
                        >
                          ×
                        </Button>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            )}

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

          <TabsContent value="export" className="flex-1 overflow-hidden flex flex-col space-y-4 mt-4">
            <div className="flex flex-col items-center justify-center border-2 border-dashed rounded-lg p-8 space-y-4">
              <Download className="w-12 h-12 text-muted-foreground" />
              <div className="text-center space-y-2">
                <p className="text-sm font-medium">Export Workflow</p>
                <p className="text-xs text-muted-foreground">
                  Download JSON configuration and screenshot together
                </p>
              </div>
              <Button
                onClick={exportCombined}
                disabled={isExporting || nodes.length === 0}
                className="w-full max-w-xs"
              >
                {isExporting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Exporting...
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4 mr-2" />
                    Export JSON + Screenshot
                  </>
                )}
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="business" className="space-y-4">
            <div className="text-center space-y-4 py-8">
              <Package className="w-16 h-16 mx-auto text-primary" />
              <div className="space-y-2">
                <h3 className="text-lg font-semibold">Deploy to Production</h3>
                <p className="text-sm text-muted-foreground max-w-md mx-auto">
                  Export your workflow as production-ready code for n8n, Make, Python, TypeScript, Docker, GitHub Actions, or Supabase.
                </p>
              </div>
              
              <Button
                onClick={() => setShowBusinessExport(true)}
                className="mt-4"
                disabled={!nodes || nodes.length === 0}
              >
                <Package className="mr-2 h-4 w-4" />
                Choose Export Platform
              </Button>
              
              {(!nodes || nodes.length === 0) && (
                <p className="text-xs text-muted-foreground">
                  Create a workflow first to enable exports
                </p>
              )}
            </div>
          </TabsContent>
        </Tabs>

        <WorkflowBusinessExport
          open={showBusinessExport}
          onOpenChange={setShowBusinessExport}
          nodes={nodes || []}
          workflowName={workflowName}
        />
      </DialogContent>
    </Dialog>
  );
};