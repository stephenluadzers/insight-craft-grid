// Workflow Generation Dialog Component
import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "./ui/dialog";
import { Button } from "./ui/button";
import { Textarea } from "./ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Mic, MicOff, Sparkles, Upload, ImageIcon, FileText, Download, Package, X, Github, FolderOpen } from "lucide-react";
import { WorkflowNodeData, WorkflowOriginMetadata } from "@/types/workflow";
import { z } from "zod";
import { generateWorkflowName } from "@/lib/workflowUtils";
import { WorkflowBusinessExport } from "./WorkflowBusinessExport";
import { downloadBlob, openDownloadWindow } from "@/lib/downloadFile";

const workflowIdeaSchema = z.string().trim().min(10, "Description must be at least 10 characters").max(50000, "Description must be less than 50000 characters");

interface WorkflowGenerationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onWorkflowGenerated: (nodes: any[], metadata?: { guardrailExplanations?: any[]; complianceStandards?: string[]; riskScore?: number; policyAnalysis?: any; workflowName?: string; originMetadata?: WorkflowOriginMetadata }) => void;
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
  const [videoUrlsText, setVideoUrlsText] = useState("");
  const [githubRepoUrlsText, setGithubRepoUrlsText] = useState("");
  const [ideProjects, setIdeProjects] = useState<File[]>([]);
  const [isDraggingJSON, setIsDraggingJSON] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [showBusinessExport, setShowBusinessExport] = useState(false);
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [lastExport, setLastExport] = useState<{ url: string; filename: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const ideProjectInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleGenerate = async () => {
    const validation = workflowIdeaSchema.safeParse(workflowIdea);
    if (!validation.success) {
      toast({ title: "Input Invalid", description: validation.error.errors[0].message, variant: "destructive" });
      return;
    }
    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-workflow-from-text', {
        body: { description: validation.data, existingWorkflow: nodes.length > 0 ? { nodes, connections: [] } : undefined }
      });
      
      console.log('Generate response:', { data, error, fullData: JSON.stringify(data) });
      
      if (error) {
        console.error('API Error:', error);
        throw error;
      }
      
      if (!data) {
        throw new Error('No data returned from generation');
      }
      
      // Handle multiple workflows or single workflow - auto-apply when detected
      if (data.workflows && Array.isArray(data.workflows)) {
        if (data.workflows.length === 1) {
          console.log('Auto-applying single workflow');
          onWorkflowGenerated(data.workflows[0].nodes, {
            guardrailExplanations: data.workflows[0].guardrailExplanations,
            complianceStandards: data.workflows[0].complianceStandards,
            riskScore: data.workflows[0].riskScore,
            policyAnalysis: data.workflows[0].policyAnalysis
          });
          toast({ title: "Workflow Created!", description: data.workflows[0].name || "Workflow generated successfully" });
          onOpenChange(false);
        } else if (data.workflows.length > 1) {
          console.warn('Multiple workflows returned, only applying first one');
          onWorkflowGenerated(data.workflows[0].nodes, {
            guardrailExplanations: data.workflows[0].guardrailExplanations,
            complianceStandards: data.workflows[0].complianceStandards,
            riskScore: data.workflows[0].riskScore,
            policyAnalysis: data.workflows[0].policyAnalysis
          });
          toast({ title: "Workflow Created!", description: `Generated ${data.workflows.length} workflows, applied first one` });
          onOpenChange(false);
        }
      } else if (data.nodes && Array.isArray(data.nodes)) {
        console.log('Processing single workflow with', data.nodes.length, 'nodes');
        onWorkflowGenerated(data.nodes, { 
          guardrailExplanations: data.guardrailExplanations, 
          complianceStandards: data.complianceStandards, 
          riskScore: data.riskScore,
          policyAnalysis: data.policyAnalysis
        });
        toast({ title: "Workflow Created!", description: `Created ${data.nodes.length} nodes` });
        onOpenChange(false);
      } else {
        console.error('Invalid response structure:', data);
        throw new Error(`Invalid response format: ${JSON.stringify(Object.keys(data))}`);
      }
    } catch (error: any) {
      console.error('Generation error:', error);
      toast({ title: "Generation Failed", description: error.message || String(error), variant: "destructive" });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleVoiceInput = async () => {
    if (isRecording) {
      setIsRecording(false);
      return;
    }
    setIsRecording(true);
    setTimeout(() => setIsRecording(false), 5000);
  };

  const handleCombinedGenerate = async () => {
    const validUrls = videoUrlsText.split('\n').map(u => u.trim()).filter(u => u);
    const validGithubUrls = githubRepoUrlsText.split('\n').map(u => u.trim()).filter(u => u);
    
    if (validUrls.length === 0 && validGithubUrls.length === 0 && ideProjects.length === 0) {
      toast({ title: "No Sources", description: "Add at least one source", variant: "destructive" });
      return;
    }

    setIsGenerating(true);
    try {
      const ideProjectData = await Promise.all(ideProjects.map(async (project) => ({
        name: project.name,
        data: await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(project);
        })
      })));
      
      const { data, error } = await supabase.functions.invoke('combine-workflow-inputs', {
        body: { text: workflowIdea, videoUrls: validUrls, githubRepoUrls: validGithubUrls, ideProjects: ideProjectData, existingWorkflow: nodes.length > 0 ? { nodes } : undefined }
      });
      
      console.log('Combined generate response:', { data, error, fullData: JSON.stringify(data) });
      
      if (error) {
        console.error('API Error:', error);
        throw error;
      }
      
      if (!data) {
        throw new Error('No data returned from generation');
      }
      
      // Handle multiple workflows or single workflow - auto-apply when detected
      if (data.workflows && Array.isArray(data.workflows)) {
        if (data.workflows.length === 1) {
          console.log('Auto-applying single workflow');
          onWorkflowGenerated(data.workflows[0].nodes, data.workflows[0].metadata);
          toast({ title: "Workflow Created!", description: data.workflows[0].name || "Workflow generated successfully" });
          onOpenChange(false);
        } else if (data.workflows.length > 1) {
          console.warn('Multiple workflows returned, only applying first one');
          onWorkflowGenerated(data.workflows[0].nodes, data.workflows[0].metadata);
          toast({ title: "Workflow Created!", description: `Generated ${data.workflows.length} workflows, applied first one` });
          onOpenChange(false);
        }
      } else if (data.nodes && Array.isArray(data.nodes)) {
        console.log('Processing single workflow with', data.nodes.length, 'nodes');
        onWorkflowGenerated(data.nodes, { 
          guardrailExplanations: data.guardrailExplanations,
          complianceStandards: data.complianceStandards,
          riskScore: data.riskScore,
          policyAnalysis: data.policyAnalysis
        });
        toast({ title: "Workflow Created!", description: `Generated from ${validUrls.length + validGithubUrls.length + ideProjects.length} sources` });
        onOpenChange(false);
      } else {
        console.error('Invalid response structure:', data);
        throw new Error(`Invalid response format: ${JSON.stringify(Object.keys(data))}`);
      }
    } catch (error: any) {
      console.error('Combined generation error:', error);
      toast({ title: "Generation Failed", description: error.message || String(error), variant: "destructive" });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleImageSelection = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) setSelectedImages(Array.from(e.target.files));
  };

  const handleGenerateFromImages = async () => {
    setIsAnalyzing(true);
    try {
      const imageDataArray = await Promise.all(selectedImages.map(img => new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(img);
      })));

      const { data, error } = await supabase.functions.invoke('analyze-workflow-image', {
        body: { images: imageDataArray, existingWorkflow: nodes.length > 0 ? { nodes } : undefined }
      });

      console.log('Image analysis response:', { data, error, fullData: JSON.stringify(data) });

      if (error) {
        console.error('API Error:', error);
        throw error;
      }
      
      if (!data) {
        throw new Error('No data returned from image analysis');
      }
      
      // Auto-apply workflow when detected
      if (data.nodes && Array.isArray(data.nodes)) {
        console.log('Processing workflow with', data.nodes.length, 'nodes from images');
        
        // Count nodes that have extracted configs
        const configuredNodes = data.nodes.filter((n: any) => n.config && Object.keys(n.config).length > 0);
        
        onWorkflowGenerated(data.nodes, {
          guardrailExplanations: data.guardrailExplanations,
          complianceStandards: data.complianceStandards,
          riskScore: data.riskScore,
          policyAnalysis: data.policyAnalysis
        });
        toast({ title: "Workflow Created!", description: `Created from ${selectedImages.length} image(s)` });
        if (configuredNodes.length > 0) {
          setTimeout(() => {
            toast({ 
              title: "Configurations Auto-Loaded", 
              description: `${configuredNodes.length} node(s) have pre-filled configs from the image. Click any node to review.` 
            });
          }, 1000);
        }
        onOpenChange(false);
      } else {
        console.error('Invalid response structure:', data);
        throw new Error(`Invalid response format: ${JSON.stringify(Object.keys(data))}`);
      }
    } catch (error: any) {
      console.error('Image analysis error:', error);
      toast({ title: "Analysis Failed", description: error.message || String(error), variant: "destructive" });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const normalizeImportedNodes = (data: any): any[] => {
    // Pull nodes array out of the most common shapes.
    let raw: any[] | null = null;
    if (Array.isArray(data)) raw = data;
    else if (Array.isArray(data?.nodes)) raw = data.nodes;
    else if (Array.isArray(data?.workflow?.nodes)) raw = data.workflow.nodes;
    else if (Array.isArray(data?.steps)) raw = data.steps;
    if (!raw) return [];

    const VALID_TYPES = new Set([
      'trigger', 'action', 'condition', 'delay', 'webhook',
      'transform', 'loop', 'parallel', 'error_handler',
      'guardrail', 'ai_agent', 'integration',
    ]);

    return raw.map((n: any, i: number) => {
      // Support n8n-style position arrays.
      const posX = Array.isArray(n?.position) ? n.position[0] : n?.x ?? n?.position?.x;
      const posY = Array.isArray(n?.position) ? n.position[1] : n?.y ?? n?.position?.y;
      const rawType = (n?.type ?? n?.kind ?? 'action').toString().toLowerCase();
      const isKnown = VALID_TYPES.has(rawType);
      return {
        id: n?.id ?? `imported-${i}-${Date.now()}`,
        type: isKnown ? rawType : '__unknown__',
        rawType,
        title: n?.title ?? n?.name ?? n?.label ?? `Step ${i + 1}`,
        description: n?.description ?? n?.notes ?? '',
        x: typeof posX === 'number' ? posX : undefined,
        y: typeof posY === 'number' ? posY : undefined,
        config: n?.config ?? n?.parameters ?? n?.params ?? {},
        _original: n, // preserved so AI enrichment has full context
      };
    });
  };

  const importJSONFile = async (file: File) => {
    if (!file.name.toLowerCase().endsWith('.json')) {
      toast({ title: "Import Failed", description: "Please drop a .json file", variant: "destructive" });
      return;
    }
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      const parsed = normalizeImportedNodes(data);
      console.log('📥 JSON import: parsed', parsed.length, 'nodes from file', file.name);
      if (parsed.length === 0) {
        throw new Error('No nodes found. Expected a JSON file with a "nodes" array or an array of steps.');
      }

      const unknowns = parsed.filter((n) => n.type === '__unknown__');
      let enrichedById: Record<string, any> = {};

      if (unknowns.length > 0) {
        toast({ title: "Enriching Unknown Nodes", description: `AI is generating definitions for ${unknowns.length} node(s)…` });
        try {
          const { data: enrichResp, error: enrichErr } = await supabase.functions.invoke('enrich-imported-nodes', {
            body: {
              unknownNodes: unknowns.map((n) => ({
                id: n.id,
                rawType: n.rawType,
                title: n.title,
                description: n.description,
                config: n.config,
                _original: n._original,
              })),
            },
          });
          if (enrichErr) throw enrichErr;
          for (const e of (enrichResp?.enriched || [])) {
            if (e?.id) enrichedById[e.id] = e;
          }
        } catch (err: any) {
          console.warn('Node enrichment failed, falling back to "action":', err);
        }
      }

      const finalNodes = parsed.map((n) => {
        if (n.type !== '__unknown__') {
          // strip helpers before returning
          const { rawType, _original, ...clean } = n;
          return clean;
        }
        const enriched = enrichedById[n.id];
        if (enriched) {
          return {
            id: n.id,
            type: enriched.type,
            title: enriched.title || n.title,
            description: enriched.description || n.description,
            x: n.x,
            y: n.y,
            config: { ...(n.config || {}), ...(enriched.config || {}) },
          };
        }
        // Fallback if AI was unavailable
        return {
          id: n.id,
          type: 'integration',
          title: n.title,
          description: n.description || `Imported "${n.rawType}" node`,
          x: n.x,
          y: n.y,
          config: { ...n.config, originalType: n.rawType },
        };
      });

      onWorkflowGenerated(finalNodes, data?.metadata);
      onOpenChange(false);
      toast({
        title: "Workflow Imported",
        description: unknowns.length > 0
          ? `Loaded ${finalNodes.length} nodes (${unknowns.length} auto-generated)`
          : `Loaded ${finalNodes.length} nodes`,
      });
    } catch (error: any) {
      console.error('JSON import failed:', error);
      toast({ title: "Import Failed", description: error.message, variant: "destructive" });
    }
  };

  const handleJSONImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) await importJSONFile(file);
  };

  const exportCombined = async () => {
    const popup = openDownloadWindow(`${workflowName} JSON export`);
    setIsExporting(true);
    try {
      const workflowData = { nodes, metadata: guardrailMetadata, name: workflowName };
      const blob = new Blob([JSON.stringify(workflowData, null, 2)], { type: 'application/json' });
      const filename = `${generateWorkflowName(nodes)}.json`;
      const url = downloadBlob(blob, filename, popup);
      setLastExport({ url, filename });
      toast({ title: "Export Ready", description: "A download tab opened with the workflow file." });
    } catch (error: any) {
      console.error('Export error:', error);
      if (popup && !popup.closed) popup.close();
      toast({ title: "Export Failed", description: error.message, variant: "destructive" });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl h-[90vh] flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-4 shrink-0 border-b">
          <DialogTitle className="text-2xl">Workflow Generator</DialogTitle>
          <DialogDescription>Create workflows from multiple sources</DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="combined" className="flex-1 flex flex-col min-h-0 overflow-hidden">
          <TabsList className="w-full justify-start px-6 py-2 border-b rounded-none shrink-0 bg-background overflow-x-auto">
            <TabsTrigger value="combined"><Package className="w-4 h-4 mr-2" />Multi-Source</TabsTrigger>
            <TabsTrigger value="text"><FileText className="w-4 h-4 mr-2" />Text</TabsTrigger>
            <TabsTrigger value="image"><ImageIcon className="w-4 h-4 mr-2" />Images</TabsTrigger>
            <TabsTrigger value="import"><Upload className="w-4 h-4 mr-2" />Import</TabsTrigger>
            <TabsTrigger value="export"><Download className="w-4 h-4 mr-2" />Export</TabsTrigger>
          </TabsList>

          <div className="flex-1 overflow-y-auto min-h-0 overscroll-contain">
            <div className="px-6 py-6 pb-32">
              <TabsContent value="combined" className="mt-0 space-y-6">
                <div className="bg-primary/5 border-2 border-dashed rounded-xl p-6">
                  <h3 className="text-xl font-bold mb-2">Multi-Source Generator</h3>
                  <p className="text-muted-foreground">Combine videos, GitHub repos, and IDE projects</p>
                </div>

                <div className="border rounded-xl p-4 bg-card">
                  <h4 className="font-semibold mb-3">Video URLs</h4>
                  <Textarea 
                    value={videoUrlsText} 
                    onChange={(e) => setVideoUrlsText(e.target.value)} 
                    placeholder="Paste video URLs (one per line)&#10;https://youtube.com/watch?v=...&#10;https://vimeo.com/..." 
                    rows={4} 
                    className="resize-none font-mono text-sm"
                  />
                </div>

                <div className="border rounded-xl p-4 bg-card">
                  <h4 className="font-semibold mb-3 flex items-center gap-2"><Github className="w-4 h-4" />GitHub Repos</h4>
                  <Textarea 
                    value={githubRepoUrlsText} 
                    onChange={(e) => setGithubRepoUrlsText(e.target.value)} 
                    placeholder="Paste GitHub repository URLs (one per line)&#10;https://github.com/user/repo1&#10;https://github.com/user/repo2" 
                    rows={4} 
                    className="resize-none font-mono text-sm"
                  />
                </div>

                <div className="border rounded-xl p-4 bg-card">
                  <h4 className="font-semibold mb-3 flex items-center gap-2"><FolderOpen className="w-4 h-4" />IDE Projects</h4>
                  <input ref={ideProjectInputRef} type="file" accept=".zip" multiple onChange={(e) => e.target.files && setIdeProjects(Array.from(e.target.files))} className="hidden" />
                  <Button onClick={() => ideProjectInputRef.current?.click()} variant="outline" className="w-full">
                    <FolderOpen className="w-4 h-4 mr-2" />Upload ZIP Files
                  </Button>
                  {ideProjects.length > 0 && (
                    <div className="mt-3 space-y-2">
                      {ideProjects.map((p, i) => (
                        <div key={i} className="flex justify-between items-center bg-muted/50 p-2 rounded">
                          <span className="text-sm">{p.name}</span>
                          <Button onClick={() => setIdeProjects(ideProjects.filter((_, idx) => idx !== i))} variant="ghost" size="sm"><X className="w-4 h-4" /></Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <Button onClick={handleCombinedGenerate} disabled={isGenerating || (!videoUrlsText.trim() && !githubRepoUrlsText.trim() && ideProjects.length === 0)} className="w-full h-12" size="lg">
                  {isGenerating ? <><Loader2 className="w-5 h-5 mr-2 animate-spin" />Generating...</> : <><Sparkles className="w-5 h-5 mr-2" />Generate Workflow</>}
                </Button>
              </TabsContent>

              <TabsContent value="text" className="mt-0 space-y-6">
                <div className="bg-blue-500/5 border-2 border-dashed rounded-xl p-6">
                  <h3 className="text-xl font-bold mb-2">Text Description</h3>
                  <p className="text-muted-foreground">Describe your workflow in natural language</p>
                </div>
                <Textarea value={workflowIdea} onChange={(e) => setWorkflowIdea(e.target.value)} placeholder="Describe your workflow..." rows={12} className="resize-none" />
                <div className="flex gap-3">
                  <Button onClick={handleVoiceInput} variant={isRecording ? "destructive" : "outline"} className="flex-1" size="lg">
                    {isRecording ? <><MicOff className="w-5 h-5 mr-2" />Stop</> : <><Mic className="w-5 h-5 mr-2" />Voice</>}
                  </Button>
                  <Button onClick={handleGenerate} disabled={isGenerating || !workflowIdea.trim()} className="flex-1" size="lg">
                    {isGenerating ? <><Loader2 className="w-5 h-5 mr-2 animate-spin" />Generating...</> : <><Sparkles className="w-5 h-5 mr-2" />Generate</>}
                  </Button>
                </div>
              </TabsContent>

              <TabsContent value="image" className="mt-0 space-y-6">
                <div className="bg-green-500/5 border-2 border-dashed rounded-xl p-6">
                  <h3 className="text-xl font-bold mb-2">Image Analysis</h3>
                  <p className="text-muted-foreground">Upload diagrams or screenshots</p>
                </div>
                <div className="border rounded-lg p-6 bg-card">
                <input ref={imageInputRef} type="file" accept="image/*" multiple onChange={handleImageSelection} className="hidden" />
                <Button onClick={() => imageInputRef.current && imageInputRef.current.click()} variant="outline" size="lg" className="w-full mb-4">
                  <Upload className="w-5 h-5 mr-2" />Select Images
                </Button>
                  {selectedImages.length > 0 && (
                    <Button onClick={handleGenerateFromImages} disabled={isAnalyzing} className="w-full" size="lg">
                      {isAnalyzing ? <><Loader2 className="w-5 h-5 mr-2 animate-spin" />Analyzing...</> : <><Sparkles className="w-5 h-5 mr-2" />Generate from {selectedImages.length} Images</>}
                    </Button>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="import" className="mt-0 space-y-6">
                <div className="bg-orange-500/5 border-2 border-dashed rounded-xl p-6">
                  <h3 className="text-xl font-bold mb-2">Import Workflow</h3>
                  <p className="text-muted-foreground">Drag &amp; drop or browse for a JSON workflow file</p>
                </div>
                <div
                  onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; setIsDraggingJSON(true); }}
                  onDragEnter={(e) => { e.preventDefault(); setIsDraggingJSON(true); }}
                  onDragLeave={(e) => { e.preventDefault(); setIsDraggingJSON(false); }}
                  onDrop={async (e) => {
                    e.preventDefault();
                    setIsDraggingJSON(false);
                    const file = e.dataTransfer.files?.[0];
                    if (file) await importJSONFile(file);
                  }}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-lg p-10 bg-card text-center cursor-pointer transition-colors ${
                    isDraggingJSON ? 'border-primary bg-primary/10' : 'hover:border-primary/50 hover:bg-accent/30'
                  }`}
                >
                  <input ref={fileInputRef} type="file" accept=".json" onChange={handleJSONImport} className="hidden" />
                  <Upload className={`w-10 h-10 mx-auto mb-3 ${isDraggingJSON ? 'text-primary' : 'text-muted-foreground'}`} />
                  <p className="font-medium mb-1">
                    {isDraggingJSON ? 'Drop your JSON file here' : 'Drop your JSON file here, or click to browse'}
                  </p>
                  <p className="text-xs text-muted-foreground">Accepts .json workflow files</p>
                </div>
              </TabsContent>

              <TabsContent value="export" className="mt-0 space-y-6">
                <div className="bg-cyan-500/5 border-2 border-dashed rounded-xl p-6">
                  <h3 className="text-xl font-bold mb-2">Export Workflow</h3>
                  <p className="text-muted-foreground">Download or deploy your workflow</p>
                </div>
                <div className="border rounded-lg p-6 bg-card space-y-3">
                  <Button onClick={exportCombined} disabled={isExporting || nodes.length === 0} variant="outline" size="lg" className="w-full">
                    {isExporting ? <><Loader2 className="w-5 h-5 mr-2 animate-spin" />Exporting...</> : <><Download className="w-5 h-5 mr-2" />Export JSON</>}
                  </Button>
                  <Button onClick={() => setShowBusinessExport(true)} disabled={nodes.length === 0} size="lg" className="w-full">
                    <Package className="w-5 h-5 mr-2" />Deploy to Production
                  </Button>
                  {lastExport && (
                    <a href={lastExport.url} download={lastExport.filename} className="block text-sm font-medium text-primary underline-offset-4 hover:underline">
                      Click here if the download did not start
                    </a>
                  )}
                </div>
              </TabsContent>
            </div>
          </div>
        </Tabs>

        <WorkflowBusinessExport open={showBusinessExport} onOpenChange={setShowBusinessExport} nodes={nodes} workflowName={workflowName} guardrailMetadata={guardrailMetadata ? { explanations: guardrailMetadata.guardrailExplanations, complianceStandards: guardrailMetadata.complianceStandards, riskScore: guardrailMetadata.riskScore, policyAnalysis: guardrailMetadata.policyAnalysis } : undefined} />
      </DialogContent>
    </Dialog>
  );
};
