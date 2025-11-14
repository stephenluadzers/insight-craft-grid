import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "./ui/dialog";
import { Button } from "./ui/button";
import { Textarea } from "./ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Mic, MicOff, Sparkles, Upload, ImageIcon, FileText, Download, Camera, FileJson, Package, Youtube } from "lucide-react";
import { ScrollArea } from "./ui/scroll-area";
import { WorkflowNodeData } from "./WorkflowNode";
import html2canvas from "html2canvas";
import { z } from "zod";
import { generateWorkflowName } from "@/lib/workflowUtils";
import { WorkflowBusinessExport } from "./WorkflowBusinessExport";

const workflowIdeaSchema = z.string().trim().min(10, "Description must be at least 10 characters").max(50000, "Description must be less than 50000 characters");

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
  onWorkflowGenerated: (nodes: any[], metadata?: { guardrailExplanations?: any[]; complianceStandards?: string[]; riskScore?: number; policyAnalysis?: any }) => void;
  nodes: WorkflowNodeData[];
  workflowName: string;
  guardrailMetadata?: {
    guardrailExplanations?: any[];
    complianceStandards?: string[];
    riskScore?: number;
    policyAnalysis?: any;
  };
}

export const WorkflowGenerationDialog = ({ open, onOpenChange, onWorkflowGenerated, nodes, workflowName, guardrailMetadata }: WorkflowGenerationDialogProps): JSX.Element => {
  const [workflowIdea, setWorkflowIdea] = useState("");
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [tiktokUrl, setTiktokUrl] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isAnalyzingYoutube, setIsAnalyzingYoutube] = useState(false);
  const [isAnalyzingTiktok, setIsAnalyzingTiktok] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [generatedExplanation, setGeneratedExplanation] = useState("");
  const [showBusinessExport, setShowBusinessExport] = useState(false);
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [selectedVideo, setSelectedVideo] = useState<File | null>(null);
  const [multipleWorkflows, setMultipleWorkflows] = useState<any[]>([]);
  const [selectedWorkflowIndex, setSelectedWorkflowIndex] = useState<number | null>(null);
  const [canMergeWorkflows, setCanMergeWorkflows] = useState(false);
  const [mergeStrategy, setMergeStrategy] = useState("");
  const [combinedInputs, setCombinedInputs] = useState<{
    text?: string;
    images?: File[];
    videoUrl?: string;
  }>({});
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
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
    setMultipleWorkflows([]);
    setSelectedWorkflowIndex(null);

    try {
      const existingWorkflow = nodes.length > 0 ? { nodes, connections: [] } : undefined;
      
      const { data, error } = await supabase.functions.invoke('generate-workflow-from-text', {
        body: { 
          description: validation.data,
          existingWorkflow
        }
      });

      if (error) throw error;

      // Check if multiple workflows were detected
      if (data.workflows && Array.isArray(data.workflows)) {
        setMultipleWorkflows(data.workflows);
        setCanMergeWorkflows(data.canMerge || false);
        setMergeStrategy(data.suggestedMergeStrategy || "");
        setGeneratedExplanation(data.summary || `Detected ${data.workflows.length} distinct workflows. Select one to apply.`);
        toast({
          title: "Multiple Workflows Detected!",
          description: `Found ${data.workflows.length} separate workflows. Choose which one to create.`,
        });
      } else {
        setGeneratedExplanation(data.explanation || "Workflow generated successfully!");
        
        if (data.nodes && data.nodes.length > 0) {
          onWorkflowGenerated(data.nodes, {
            guardrailExplanations: data.guardrailExplanations,
            complianceStandards: data.complianceStandards,
            riskScore: data.riskScore
          });
          onOpenChange(false);
          toast({
            title: existingWorkflow ? "Workflow Improved!" : "Workflow Generated!",
            description: existingWorkflow 
              ? `Enhanced your workflow with new features`
              : `Created ${data.nodes.length} nodes from your description`,
          });
        }
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
    setMultipleWorkflows([]);
    setSelectedWorkflowIndex(null);

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

      const existingWorkflow = nodes.length > 0 ? { nodes, connections: [] } : undefined;

      const { data, error } = await supabase.functions.invoke('analyze-workflow-image', {
        body: { 
          images: base64Images,
          existingWorkflow
        }
      });

      if (error) throw error;

      // Check if multiple workflows were detected
      if (data.workflows && Array.isArray(data.workflows)) {
        setMultipleWorkflows(data.workflows);
        setGeneratedExplanation(data.summary || `Detected ${data.workflows.length} distinct workflows from the images. Select one to apply.`);
        toast({
          title: "Multiple Workflows Detected!",
          description: `Found ${data.workflows.length} separate workflows. Choose which one to create.`,
        });
      } else {
        setGeneratedExplanation(data.insights || "Successfully extracted workflow from images");
        
        if (data.nodes && data.nodes.length > 0) {
          onWorkflowGenerated(data.nodes, {
            guardrailExplanations: data.guardrailExplanations,
            complianceStandards: data.complianceStandards,
            riskScore: data.riskScore
          });
          onOpenChange(false);
          toast({
            title: existingWorkflow ? "Workflow Improved!" : "Workflow Generated!",
            description: existingWorkflow
              ? `Enhanced your workflow with insights from ${selectedImages.length} image${selectedImages.length > 1 ? 's' : ''}`
              : `Created ${data.nodes.length} nodes from ${selectedImages.length} image${selectedImages.length > 1 ? 's' : ''}`,
          });
        }
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

      onWorkflowGenerated(validatedNodes, {
        guardrailExplanations: data.guardrailExplanations,
        complianceStandards: data.complianceStandards,
        riskScore: data.riskScore
      });
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

  const handleYoutubeGenerate = async () => {
    if (!youtubeUrl.trim()) {
      toast({
        title: "URL Required",
        description: "Please enter a YouTube video URL",
        variant: "destructive",
      });
      return;
    }

    setIsAnalyzingYoutube(true);
    setGeneratedExplanation("");
    setMultipleWorkflows([]);
    setSelectedWorkflowIndex(null);

    try {
      console.log('Analyzing YouTube video:', youtubeUrl);
      
      const { data: videoData, error: videoError } = await supabase.functions.invoke('analyze-youtube-video', {
        body: { url: youtubeUrl.trim() }
      });

      if (videoError) throw videoError;
      
      console.log('YouTube video data:', videoData);
      
      if (!videoData.description) {
        throw new Error('Could not extract data from YouTube video');
      }

      toast({
        title: "Video Analyzed",
        description: `Extracted data from: ${videoData.title}`,
      });

      const finalDescription = `Based on this YouTube video content, create a workflow:\n\n${videoData.description}`;

      const existingWorkflow = nodes.length > 0 ? { nodes, connections: [] } : undefined;
      
      const { data, error } = await supabase.functions.invoke('generate-workflow-from-text', {
        body: { 
          description: finalDescription,
          existingWorkflow
        }
      });

      if (error) throw error;

      // Check if multiple workflows were detected
      if (data.workflows && Array.isArray(data.workflows)) {
        setMultipleWorkflows(data.workflows);
        setGeneratedExplanation(data.summary || `Detected ${data.workflows.length} distinct workflows from the video. Select one to apply.`);
        toast({
          title: "Multiple Workflows Detected!",
          description: `Found ${data.workflows.length} separate workflows in the video. Choose which one to create.`,
        });
      } else {
        setGeneratedExplanation(data.explanation || "Workflow generated from YouTube video!");
        
        if (data.nodes && data.nodes.length > 0) {
          onWorkflowGenerated(data.nodes, {
            guardrailExplanations: data.guardrailExplanations,
            complianceStandards: data.complianceStandards,
            riskScore: data.riskScore
          });
          onOpenChange(false);
          toast({
            title: "Workflow Generated!",
            description: `Created ${data.nodes.length} nodes from YouTube video`,
          });
        }
      }
    } catch (error: any) {
      console.error('Error generating from YouTube:', error);
      toast({
        title: "Generation Failed",
        description: error.message || "Failed to generate workflow from YouTube video",
        variant: "destructive",
      });
    } finally {
      setIsAnalyzingYoutube(false);
    }
  };

  const handleTiktokGenerate = async () => {
    if (!tiktokUrl.trim()) {
      toast({
        title: "URL Required",
        description: "Please enter a TikTok video URL",
        variant: "destructive",
      });
      return;
    }

    setIsAnalyzingTiktok(true);
    setGeneratedExplanation("");
    setMultipleWorkflows([]);
    setSelectedWorkflowIndex(null);

    try {
      console.log('Analyzing TikTok video:', tiktokUrl);
      
      const existingWorkflow = nodes.length > 0 ? { nodes, connections: [] } : undefined;
      
      const { data, error } = await supabase.functions.invoke('analyze-tiktok-video', {
        body: { 
          videoUrl: tiktokUrl.trim(),
          existingWorkflow
        }
      });

      if (error) throw error;

      toast({
        title: "TikTok Analyzed",
        description: "Extracted workflow from TikTok video",
      });

      if (data.workflows && Array.isArray(data.workflows)) {
        setMultipleWorkflows(data.workflows);
        setGeneratedExplanation(data.insights || `Detected ${data.workflows.length} workflows from TikTok.`);
      } else if (data.nodes && data.nodes.length > 0) {
        setGeneratedExplanation(data.insights || "Workflow generated from TikTok!");
        onWorkflowGenerated(data.nodes, {
          guardrailExplanations: data.guardrailExplanations,
          complianceStandards: data.complianceStandards,
          riskScore: data.riskScore
        });
        onOpenChange(false);
        toast({
          title: "Workflow Generated!",
          description: `Created ${data.nodes.length} nodes from TikTok`,
        });
      }
    } catch (error: any) {
      console.error('Error generating from TikTok:', error);
      toast({
        title: "Generation Failed",
        description: error.message || "Failed to generate workflow from TikTok",
        variant: "destructive",
      });
    } finally {
      setIsAnalyzingTiktok(false);
    }
  };

  const handleVideoSelection = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const videoFile = files[0];
    const maxSize = 100 * 1024 * 1024; // 100MB limit

    if (videoFile.size > maxSize) {
      toast({
        title: "File Too Large",
        description: "Video file must be under 100MB. Please compress or trim your video.",
        variant: "destructive",
      });
      return;
    }

    // Check if it's a video file
    if (!videoFile.type.startsWith('video/')) {
      toast({
        title: "Invalid File Type",
        description: "Please select a video file (MP4, MOV, AVI, etc.)",
        variant: "destructive",
      });
      return;
    }

    setSelectedVideo(videoFile);
    toast({
      title: "Video Selected",
      description: `${videoFile.name} (${(videoFile.size / 1024 / 1024).toFixed(2)}MB) ready for analysis`,
    });
  };

  const handleGenerateFromVideo = async () => {
    if (!selectedVideo) {
      toast({
        title: "No Video Selected",
        description: "Please select a video file first",
        variant: "destructive",
      });
      return;
    }

    setIsAnalyzing(true);
    setGeneratedExplanation("");
    setMultipleWorkflows([]);
    setSelectedWorkflowIndex(null);

    try {
      // Convert video to base64 for first frame analysis
      const reader = new FileReader();
      const videoDataPromise = new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(selectedVideo);
      });

      const videoData = await videoDataPromise;

      const existingWorkflow = nodes.length > 0 ? { nodes, connections: [] } : undefined;

      const { data, error } = await supabase.functions.invoke('analyze-video-file', {
        body: {
          videoData,
          fileName: selectedVideo.name,
          existingWorkflow
        }
      });

      if (error) throw error;

      if (data.workflows && Array.isArray(data.workflows)) {
        setMultipleWorkflows(data.workflows);
        setGeneratedExplanation(data.insights || `Detected ${data.workflows.length} workflows from video.`);
      } else if (data.nodes && data.nodes.length > 0) {
        setGeneratedExplanation(data.insights || "Workflow generated from video!");
        onWorkflowGenerated(data.nodes, {
          guardrailExplanations: data.guardrailExplanations,
          complianceStandards: data.complianceStandards,
          riskScore: data.riskScore
        });
        onOpenChange(false);
        toast({
          title: "Workflow Generated!",
          description: `Created ${data.nodes.length} nodes from video`,
        });
      }
    } catch (error: any) {
      console.error('Error generating from video:', error);
      toast({
        title: "Generation Failed",
        description: error.message || "Failed to generate workflow from video",
        variant: "destructive",
      });
    } finally {
      setIsAnalyzing(false);
    }
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
          <TabsList className="grid w-full grid-cols-8">
            <TabsTrigger value="combined">
              <Package className="w-4 h-4 mr-2" />
              Combined
            </TabsTrigger>
            <TabsTrigger value="text">
              <FileText className="w-4 h-4 mr-2" />
              Text
            </TabsTrigger>
            <TabsTrigger value="youtube">
              <Youtube className="w-4 h-4 mr-2" />
              YouTube
            </TabsTrigger>
            <TabsTrigger value="tiktok">
              <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
              </svg>
              TikTok
            </TabsTrigger>
            <TabsTrigger value="video">
              <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="2" y="7" width="20" height="15" rx="2" ry="2"/>
                <polygon points="10 12 16 9 16 15 10 12"/>
              </svg>
              Video
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
              <div className="mt-4">
                <h3 className="text-sm font-medium mb-2">Result:</h3>
                <ScrollArea className="h-[300px] border rounded-md p-4 bg-muted/30">
                  <p className="text-sm whitespace-pre-wrap">{generatedExplanation}</p>
                </ScrollArea>
              </div>
            )}

            {multipleWorkflows.length > 0 && (
              <div className="mt-4 space-y-3">
                <h3 className="text-sm font-medium">Select a Workflow to Create:</h3>
                <div className="space-y-2 max-h-[300px] overflow-y-auto">
                  {multipleWorkflows.map((workflow, index) => (
                    <div
                      key={index}
                      className={`border rounded-lg p-4 cursor-pointer transition-all hover:border-primary ${
                        selectedWorkflowIndex === index ? 'border-primary bg-primary/5' : ''
                      }`}
                      onClick={() => setSelectedWorkflowIndex(index)}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium">{workflow.name}</h4>
                          {workflow.phase && (
                            <span className="text-xs px-2 py-0.5 bg-blue-500/20 text-blue-700 dark:text-blue-300 rounded-full">
                              {workflow.phase}
                            </span>
                          )}
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {workflow.nodes?.length || 0} nodes
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                        {workflow.explanation}
                      </p>
                      {workflow.contextTags && workflow.contextTags.length > 0 && (
                        <div className="flex gap-1 mb-2 flex-wrap">
                          {workflow.contextTags.map((tag: string, i: number) => (
                            <span key={i} className="text-xs px-2 py-0.5 bg-purple-500/20 text-purple-700 dark:text-purple-300 rounded-full">
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                      {workflow.complianceStandards && workflow.complianceStandards.length > 0 && (
                        <div className="flex gap-1 flex-wrap">
                          {workflow.complianceStandards.map((standard: string, i: number) => (
                            <span key={i} className="text-xs px-2 py-0.5 bg-secondary rounded-full">
                              {standard}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={() => {
                      if (selectedWorkflowIndex !== null) {
                        const selected = multipleWorkflows[selectedWorkflowIndex];
                        onWorkflowGenerated(selected.nodes, {
                          guardrailExplanations: selected.guardrailExplanations,
                          complianceStandards: selected.complianceStandards,
                          riskScore: selected.riskScore
                        });
                        setMultipleWorkflows([]);
                        setSelectedWorkflowIndex(null);
                        setCanMergeWorkflows(false);
                        onOpenChange(false);
                        toast({
                          title: "Workflow Created!",
                          description: `Created "${selected.name}" with ${selected.nodes?.length || 0} nodes`,
                        });
                      }
                    }}
                    disabled={selectedWorkflowIndex === null}
                    className="flex-1"
                  >
                    <Sparkles className="w-4 h-4 mr-2" />
                    Create Selected
                  </Button>
                  {canMergeWorkflows && (
                    <Button
                      onClick={() => {
                        const { mergeWorkflows } = require("@/lib/workflowMerge");
                        const { nodes, connections } = mergeWorkflows(multipleWorkflows);
                        onWorkflowGenerated(nodes, {
                          guardrailExplanations: multipleWorkflows.flatMap(w => w.guardrailExplanations || []),
                          complianceStandards: [...new Set(multipleWorkflows.flatMap(w => w.complianceStandards || []))],
                          riskScore: Math.max(...multipleWorkflows.map(w => w.riskScore || 0)),
                        });
                        setMultipleWorkflows([]);
                        setSelectedWorkflowIndex(null);
                        setCanMergeWorkflows(false);
                        onOpenChange(false);
                        toast({
                          title: "Workflows Merged!",
                          description: `Combined ${multipleWorkflows.length} workflows with ${nodes.length} total nodes`,
                        });
                      }}
                      variant="outline"
                      className="flex-1"
                    >
                      <Package className="w-4 h-4 mr-2" />
                      Auto-Merge All
                    </Button>
                  )}
                </div>
                <Button
                  onClick={() => {
                    const { exportFlowBundle } = require("@/lib/workflowMerge");
                    exportFlowBundle(multipleWorkflows, "Multi-Workflow Bundle");
                    toast({
                      title: "FlowBundle Exported!",
                      description: `Saved ${multipleWorkflows.length} workflows to .flowbundle.json`,
                    });
                  }}
                  variant="secondary"
                  className="w-full"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Export as FlowBundle
                </Button>
              </div>
            )}
          </TabsContent>

          <TabsContent value="youtube" className="flex-1 overflow-hidden flex flex-col space-y-4 mt-4">
            <div className="space-y-4">
              <div className="flex flex-col items-center justify-center border-2 border-dashed rounded-lg p-8 space-y-4">
                <Youtube className="w-12 h-12 text-muted-foreground" />
                <div className="text-center space-y-2">
                  <h3 className="text-lg font-semibold">Generate from YouTube Video</h3>
                  <p className="text-sm text-muted-foreground">
                    Paste a YouTube video URL to extract transcript and metadata for workflow generation
                  </p>
                </div>
                <div className="w-full max-w-md space-y-3">
                  <input
                    type="url"
                    value={youtubeUrl}
                    onChange={(e) => setYoutubeUrl(e.target.value)}
                    placeholder="https://www.youtube.com/watch?v=... or https://youtu.be/..."
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  />
                  <Button
                    onClick={handleYoutubeGenerate}
                    disabled={isAnalyzingYoutube || !youtubeUrl.trim()}
                    className="w-full"
                  >
                    {isAnalyzingYoutube ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Analyzing Video...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 mr-2" />
                        Generate from YouTube
                      </>
                    )}
                  </Button>
                </div>
              </div>
              
              {generatedExplanation && (
                <div className="mt-4">
                  <h3 className="text-sm font-medium mb-2">Generated Workflow:</h3>
                  <ScrollArea className="h-[300px] border rounded-md p-4 bg-muted/30">
                    <p className="text-sm whitespace-pre-wrap">{generatedExplanation}</p>
                  </ScrollArea>
                </div>
              )}

              {multipleWorkflows.length > 0 && (
                <div className="mt-4 space-y-3">
                  <h3 className="text-sm font-medium">Select a Workflow to Create:</h3>
                  <div className="space-y-2 max-h-[400px] overflow-y-auto">
                    {multipleWorkflows.map((workflow, index) => (
                      <div
                        key={index}
                        className={`border rounded-lg p-4 cursor-pointer transition-all hover:border-primary ${
                          selectedWorkflowIndex === index ? 'border-primary bg-primary/5' : ''
                        }`}
                        onClick={() => setSelectedWorkflowIndex(index)}
                      >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium">{workflow.name}</h4>
                          {workflow.phase && (
                            <span className="text-xs px-2 py-0.5 bg-blue-500/20 text-blue-700 dark:text-blue-300 rounded-full">
                              {workflow.phase}
                            </span>
                          )}
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {workflow.nodes?.length || 0} nodes
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                        {workflow.explanation}
                      </p>
                      {workflow.contextTags && workflow.contextTags.length > 0 && (
                        <div className="flex gap-1 mb-2 flex-wrap">
                          {workflow.contextTags.map((tag: string, i: number) => (
                            <span key={i} className="text-xs px-2 py-0.5 bg-purple-500/20 text-purple-700 dark:text-purple-300 rounded-full">
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                      {workflow.complianceStandards && workflow.complianceStandards.length > 0 && (
                        <div className="flex gap-1 flex-wrap">
                          {workflow.complianceStandards.map((standard: string, i: number) => (
                            <span key={i} className="text-xs px-2 py-0.5 bg-secondary rounded-full">
                              {standard}
                            </span>
                          ))}
                        </div>
                      )}
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => {
                        if (selectedWorkflowIndex !== null) {
                          const selected = multipleWorkflows[selectedWorkflowIndex];
                          onWorkflowGenerated(selected.nodes, {
                            guardrailExplanations: selected.guardrailExplanations,
                            complianceStandards: selected.complianceStandards,
                            riskScore: selected.riskScore
                          });
                          setMultipleWorkflows([]);
                          setSelectedWorkflowIndex(null);
                          setCanMergeWorkflows(false);
                          onOpenChange(false);
                          toast({
                            title: "Workflow Created!",
                            description: `Created "${selected.name}" with ${selected.nodes?.length || 0} nodes`,
                          });
                        }
                      }}
                      disabled={selectedWorkflowIndex === null}
                      className="flex-1"
                    >
                      <Sparkles className="w-4 h-4 mr-2" />
                      Create Selected
                    </Button>
                    {canMergeWorkflows && (
                      <Button
                        onClick={() => {
                          const { mergeWorkflows } = require("@/lib/workflowMerge");
                          const { nodes, connections } = mergeWorkflows(multipleWorkflows);
                          onWorkflowGenerated(nodes, {
                            guardrailExplanations: multipleWorkflows.flatMap(w => w.guardrailExplanations || []),
                            complianceStandards: [...new Set(multipleWorkflows.flatMap(w => w.complianceStandards || []))],
                            riskScore: Math.max(...multipleWorkflows.map(w => w.riskScore || 0)),
                          });
                          setMultipleWorkflows([]);
                          setSelectedWorkflowIndex(null);
                          setCanMergeWorkflows(false);
                          onOpenChange(false);
                          toast({
                            title: "Workflows Merged!",
                            description: `Combined ${multipleWorkflows.length} workflows with ${nodes.length} total nodes`,
                          });
                        }}
                        variant="outline"
                        className="flex-1"
                      >
                        <Package className="w-4 h-4 mr-2" />
                        Auto-Merge All
                      </Button>
                    )}
                  </div>
                  <Button
                    onClick={() => {
                      const { exportFlowBundle } = require("@/lib/workflowMerge");
                      exportFlowBundle(multipleWorkflows, "YouTube Multi-Workflow Bundle");
                      toast({
                        title: "FlowBundle Exported!",
                        description: `Saved ${multipleWorkflows.length} workflows to .flowbundle.json`,
                      });
                    }}
                    variant="secondary"
                    className="w-full"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Export as FlowBundle
                  </Button>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="tiktok" className="flex-1 overflow-hidden flex flex-col space-y-4 mt-4">
            <div className="space-y-4">
              <div className="flex flex-col items-center justify-center border-2 border-dashed rounded-lg p-8 space-y-4">
                <svg className="w-12 h-12 text-muted-foreground" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
                </svg>
                <div className="text-center space-y-2">
                  <h3 className="text-lg font-semibold">Generate from TikTok Video</h3>
                  <p className="text-sm text-muted-foreground">
                    Paste a TikTok video URL to analyze and extract workflow patterns
                  </p>
                </div>
                <div className="w-full max-w-md space-y-3">
                  <input
                    type="url"
                    value={tiktokUrl}
                    onChange={(e) => setTiktokUrl(e.target.value)}
                    placeholder="https://www.tiktok.com/@user/video/..."
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  />
                  <Button
                    onClick={handleTiktokGenerate}
                    disabled={isAnalyzingTiktok || !tiktokUrl.trim()}
                    className="w-full"
                  >
                    {isAnalyzingTiktok ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Analyzing TikTok...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 mr-2" />
                        Generate from TikTok
                      </>
                    )}
                  </Button>
                </div>
              </div>
              
              {generatedExplanation && (
                <div className="mt-4">
                  <h3 className="text-sm font-medium mb-2">Generated Workflow:</h3>
                  <ScrollArea className="h-[300px] border rounded-md p-4 bg-muted/30">
                    <p className="text-sm whitespace-pre-wrap">{generatedExplanation}</p>
                  </ScrollArea>
                </div>
              )}

              {multipleWorkflows.length > 0 && (
                <div className="mt-4 space-y-3">
                  <h3 className="text-sm font-medium">Select a Workflow to Create:</h3>
                  <div className="space-y-2 max-h-[400px] overflow-y-auto">
                    {multipleWorkflows.map((workflow, index) => (
                      <div
                        key={index}
                        className={`border rounded-lg p-4 cursor-pointer transition-all hover:border-primary ${
                          selectedWorkflowIndex === index ? 'border-primary bg-primary/5' : ''
                        }`}
                        onClick={() => setSelectedWorkflowIndex(index)}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium">{workflow.name}</h4>
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {workflow.nodes?.length || 0} nodes
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {workflow.explanation}
                        </p>
                      </div>
                    ))}
                  </div>
                  <Button
                    onClick={() => {
                      if (selectedWorkflowIndex !== null) {
                        const selected = multipleWorkflows[selectedWorkflowIndex];
                        onWorkflowGenerated(selected.nodes, {
                          guardrailExplanations: selected.guardrailExplanations,
                          complianceStandards: selected.complianceStandards,
                          riskScore: selected.riskScore
                        });
                        setMultipleWorkflows([]);
                        setSelectedWorkflowIndex(null);
                        onOpenChange(false);
                        toast({
                          title: "Workflow Created!",
                          description: `Created "${selected.name}" with ${selected.nodes?.length || 0} nodes`,
                        });
                      }
                    }}
                    disabled={selectedWorkflowIndex === null}
                    className="w-full"
                  >
                    <Sparkles className="w-4 h-4 mr-2" />
                    Create Selected
                  </Button>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="video" className="flex-1 overflow-hidden flex flex-col space-y-4 mt-4">
            <div className="flex flex-col items-center justify-center border-2 border-dashed rounded-lg p-8 space-y-4">
              <svg className="w-12 h-12 text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="2" y="7" width="20" height="15" rx="2" ry="2"/>
                <polygon points="10 12 16 9 16 15 10 12"/>
              </svg>
              <div className="text-center space-y-2">
                <h3 className="text-lg font-semibold">Upload Any Video File</h3>
                <p className="text-sm text-muted-foreground">
                  Upload video files from any source (MP4, MOV, AVI, etc.) to analyze and extract workflows
                </p>
                <p className="text-xs text-muted-foreground">
                  Works with tutorials, screencasts, app walkthroughs, whiteboard recordings, and more
                </p>
              </div>
              <input
                ref={videoInputRef}
                type="file"
                accept="video/*"
                onChange={handleVideoSelection}
                className="hidden"
              />
              <div className="flex gap-2 items-center">
                <Button
                  onClick={() => videoInputRef.current?.click()}
                  disabled={isAnalyzing}
                  variant="outline"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Select Video File
                </Button>
                {selectedVideo && (
                  <Button
                    onClick={handleGenerateFromVideo}
                    disabled={isAnalyzing}
                  >
                    {isAnalyzing ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Analyzing Video...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 mr-2" />
                        Generate from Video
                      </>
                    )}
                  </Button>
                )}
              </div>
              {selectedVideo && (
                <div className="text-sm text-muted-foreground text-center">
                  <p className="font-medium">{selectedVideo.name}</p>
                  <p className="text-xs">Size: {(selectedVideo.size / 1024 / 1024).toFixed(2)}MB</p>
                </div>
              )}
            </div>
            
            {generatedExplanation && (
              <div className="mt-4">
                <h3 className="text-sm font-medium mb-2">Analysis Result:</h3>
                <ScrollArea className="h-[300px] border rounded-md p-4 bg-muted/30">
                  <p className="text-sm whitespace-pre-wrap">{generatedExplanation}</p>
                </ScrollArea>
              </div>
            )}

            {multipleWorkflows.length > 0 && (
              <div className="mt-4 space-y-3">
                <h3 className="text-sm font-medium">Select a Workflow to Create:</h3>
                <div className="space-y-2 max-h-[400px] overflow-y-auto">
                  {multipleWorkflows.map((workflow, index) => (
                    <div
                      key={index}
                      className={`border rounded-lg p-4 cursor-pointer transition-all hover:border-primary ${
                        selectedWorkflowIndex === index ? 'border-primary bg-primary/5' : ''
                      }`}
                      onClick={() => setSelectedWorkflowIndex(index)}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="font-medium">{workflow.name}</h4>
                        <span className="text-xs text-muted-foreground">
                          {workflow.nodes?.length || 0} nodes
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {workflow.explanation}
                      </p>
                    </div>
                  ))}
                </div>
                <Button
                  onClick={() => {
                    if (selectedWorkflowIndex !== null) {
                      const selected = multipleWorkflows[selectedWorkflowIndex];
                      onWorkflowGenerated(selected.nodes, {
                        guardrailExplanations: selected.guardrailExplanations,
                        complianceStandards: selected.complianceStandards,
                        riskScore: selected.riskScore
                      });
                      setMultipleWorkflows([]);
                      setSelectedWorkflowIndex(null);
                      onOpenChange(false);
                      toast({
                        title: "Workflow Created!",
                        description: `Created "${selected.name}" with ${selected.nodes?.length || 0} nodes`,
                      });
                    }
                  }}
                  disabled={selectedWorkflowIndex === null}
                  className="w-full"
                >
                  <Sparkles className="w-4 h-4 mr-2" />
                  Create Selected
                </Button>
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
              <div className="mt-4">
                <h3 className="text-sm font-medium mb-2">Analysis Result:</h3>
                <ScrollArea className="h-[300px] border rounded-md p-4 bg-muted/30">
                  <p className="text-sm whitespace-pre-wrap">{generatedExplanation}</p>
                </ScrollArea>
              </div>
            )}

            {multipleWorkflows.length > 0 && (
              <div className="mt-4 space-y-3">
                <h3 className="text-sm font-medium">Select a Workflow to Create:</h3>
                <div className="space-y-2 max-h-[400px] overflow-y-auto">
                  {multipleWorkflows.map((workflow, index) => (
                    <div
                      key={index}
                      className={`border rounded-lg p-4 cursor-pointer transition-all hover:border-primary ${
                        selectedWorkflowIndex === index ? 'border-primary bg-primary/5' : ''
                      }`}
                      onClick={() => setSelectedWorkflowIndex(index)}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium">{workflow.name}</h4>
                          {workflow.phase && (
                            <span className="text-xs px-2 py-0.5 bg-blue-500/20 text-blue-700 dark:text-blue-300 rounded-full">
                              {workflow.phase}
                            </span>
                          )}
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {workflow.nodes?.length || 0} nodes
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                        {workflow.explanation}
                      </p>
                      {workflow.contextTags && workflow.contextTags.length > 0 && (
                        <div className="flex gap-1 mb-2 flex-wrap">
                          {workflow.contextTags.map((tag: string, i: number) => (
                            <span key={i} className="text-xs px-2 py-0.5 bg-purple-500/20 text-purple-700 dark:text-purple-300 rounded-full">
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                      {workflow.complianceStandards && workflow.complianceStandards.length > 0 && (
                        <div className="flex gap-1 flex-wrap">
                          {workflow.complianceStandards.map((standard: string, i: number) => (
                            <span key={i} className="text-xs px-2 py-0.5 bg-secondary rounded-full">
                              {standard}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={() => {
                      if (selectedWorkflowIndex !== null) {
                        const selected = multipleWorkflows[selectedWorkflowIndex];
                        
                        // Validate that the workflow has nodes
                        if (!selected.nodes || !Array.isArray(selected.nodes) || selected.nodes.length === 0) {
                          toast({
                            title: "Invalid Workflow",
                            description: "The selected workflow has no nodes. Please try another workflow or regenerate.",
                            variant: "destructive",
                          });
                          return;
                        }
                        
                        console.log('Creating workflow from selection:', {
                          name: selected.name,
                          nodeCount: selected.nodes.length,
                          nodes: selected.nodes
                        });
                        
                        onWorkflowGenerated(selected.nodes, {
                          guardrailExplanations: selected.guardrailExplanations,
                          complianceStandards: selected.complianceStandards,
                          riskScore: selected.riskScore
                        });
                        setMultipleWorkflows([]);
                        setSelectedWorkflowIndex(null);
                        setCanMergeWorkflows(false);
                        onOpenChange(false);
                        toast({
                          title: "Workflow Created!",
                          description: `Created "${selected.name}" with ${selected.nodes.length} nodes`,
                        });
                      }
                    }}
                    disabled={selectedWorkflowIndex === null}
                    className="flex-1"
                  >
                    <Sparkles className="w-4 h-4 mr-2" />
                    Create Selected
                  </Button>
                  {canMergeWorkflows && (
                    <Button
                      onClick={() => {
                        const { mergeWorkflows } = require("@/lib/workflowMerge");
                        const { nodes, connections } = mergeWorkflows(multipleWorkflows);
                        onWorkflowGenerated(nodes, {
                          guardrailExplanations: multipleWorkflows.flatMap(w => w.guardrailExplanations || []),
                          complianceStandards: [...new Set(multipleWorkflows.flatMap(w => w.complianceStandards || []))],
                          riskScore: Math.max(...multipleWorkflows.map(w => w.riskScore || 0)),
                        });
                        setMultipleWorkflows([]);
                        setSelectedWorkflowIndex(null);
                        setCanMergeWorkflows(false);
                        onOpenChange(false);
                        toast({
                          title: "Workflows Merged!",
                          description: `Combined ${multipleWorkflows.length} workflows with ${nodes.length} total nodes`,
                        });
                      }}
                      variant="outline"
                      className="flex-1"
                    >
                      <Package className="w-4 h-4 mr-2" />
                      Auto-Merge All
                    </Button>
                  )}
                </div>
                <Button
                  onClick={() => {
                    const { exportFlowBundle } = require("@/lib/workflowMerge");
                    exportFlowBundle(multipleWorkflows, "Image Multi-Workflow Bundle");
                    toast({
                      title: "FlowBundle Exported!",
                      description: `Saved ${multipleWorkflows.length} workflows to .flowbundle.json`,
                    });
                  }}
                  variant="secondary"
                  className="w-full"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Export as FlowBundle
                </Button>
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
              <div className="mt-4">
                <h3 className="text-sm font-medium mb-2">Import Result:</h3>
                <ScrollArea className="h-[300px] border rounded-md p-4 bg-muted/30">
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
          guardrailMetadata={guardrailMetadata ? {
            explanations: guardrailMetadata.guardrailExplanations,
            complianceStandards: guardrailMetadata.complianceStandards,
            riskScore: guardrailMetadata.riskScore,
            policyAnalysis: guardrailMetadata.policyAnalysis,
          } : undefined}
        />
      </DialogContent>
    </Dialog>
  );
};