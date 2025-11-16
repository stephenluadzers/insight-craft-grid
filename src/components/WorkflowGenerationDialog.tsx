import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "./ui/dialog";
import { Button } from "./ui/button";
import { Textarea } from "./ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Mic, MicOff, Sparkles, Upload, ImageIcon, FileText, Download, Package, Plus, X, Github, FolderOpen } from "lucide-react";
import { ScrollArea } from "./ui/scroll-area";
import { WorkflowNodeData } from "./WorkflowNode";
import { z } from "zod";
import { generateWorkflowName } from "@/lib/workflowUtils";
import { WorkflowBusinessExport } from "./WorkflowBusinessExport";

const workflowIdeaSchema = z.string().trim().min(10, "Description must be at least 10 characters").max(50000, "Description must be less than 50000 characters");

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
  const [videoUrls, setVideoUrls] = useState<string[]>([""]);
  const [githubRepoUrls, setGithubRepoUrls] = useState<string[]>([""]);
  const [ideProjects, setIdeProjects] = useState<File[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [showBusinessExport, setShowBusinessExport] = useState(false);
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
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
      if (error) throw error;
      if (data.nodes) {
        onWorkflowGenerated(data.nodes, { guardrailExplanations: data.guardrailExplanations, complianceStandards: data.complianceStandards, riskScore: data.riskScore });
        onOpenChange(false);
        toast({ title: "Workflow Generated!", description: `Created ${data.nodes.length} nodes` });
      }
    } catch (error: any) {
      toast({ title: "Generation Failed", description: error.message, variant: "destructive" });
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
    const validUrls = videoUrls.filter(u => u.trim());
    const validGithubUrls = githubRepoUrls.filter(u => u.trim());
    
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
      
      if (error) throw error;
      if (data.nodes) {
        onWorkflowGenerated(data.nodes, data.metadata);
        toast({ title: "Success!", description: `Generated from ${validUrls.length + validGithubUrls.length + ideProjects.length} sources` });
        onOpenChange(false);
      }
    } catch (error: any) {
      toast({ title: "Generation Failed", description: error.message, variant: "destructive" });
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

      if (error) throw error;
      if (data.nodes) {
        onWorkflowGenerated(data.nodes, data.metadata);
        onOpenChange(false);
        toast({ title: "Workflow Generated!", description: `Created from ${selectedImages.length} images` });
      }
    } catch (error: any) {
      toast({ title: "Analysis Failed", description: error.message, variant: "destructive" });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleJSONImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      if (!data.nodes) throw new Error('Invalid workflow file');
      onWorkflowGenerated(data.nodes, data.metadata);
      onOpenChange(false);
      toast({ title: "Workflow Imported", description: `Loaded ${data.nodes.length} nodes` });
    } catch (error: any) {
      toast({ title: "Import Failed", description: error.message, variant: "destructive" });
    }
  };

  const exportCombined = async () => {
    setIsExporting(true);
    try {
      const workflowData = { nodes, metadata: guardrailMetadata, name: workflowName };
      const blob = new Blob([JSON.stringify(workflowData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${generateWorkflowName(nodes)}.json`;
      a.click();
      toast({ title: "Exported!", description: "Workflow saved" });
    } catch (error: any) {
      toast({ title: "Export Failed", description: error.message, variant: "destructive" });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] flex flex-col">
        <DialogHeader className="px-6 pt-6 pb-4 shrink-0">
          <DialogTitle className="text-2xl">Workflow Generator</DialogTitle>
          <DialogDescription>Create workflows from multiple sources</DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="combined" className="flex-1 flex flex-col min-h-0">
          <TabsList className="w-full justify-start px-6 border-b rounded-none shrink-0">
            <TabsTrigger value="combined"><Package className="w-4 h-4 mr-2" />Multi-Source</TabsTrigger>
            <TabsTrigger value="text"><FileText className="w-4 h-4 mr-2" />Text</TabsTrigger>
            <TabsTrigger value="image"><ImageIcon className="w-4 h-4 mr-2" />Images</TabsTrigger>
            <TabsTrigger value="import"><Upload className="w-4 h-4 mr-2" />Import</TabsTrigger>
            <TabsTrigger value="export"><Download className="w-4 h-4 mr-2" />Export</TabsTrigger>
          </TabsList>

          <ScrollArea className="flex-1">
            <div className="px-6 pb-6">
              <TabsContent value="combined" className="mt-6 space-y-6">
                <div className="bg-primary/5 border-2 border-dashed rounded-xl p-6">
                  <h3 className="text-xl font-bold mb-2">Multi-Source Generator</h3>
                  <p className="text-muted-foreground">Combine videos, GitHub repos, and IDE projects</p>
                </div>

                <div className="border rounded-xl p-4 bg-card">
                  <div className="flex justify-between mb-3">
                    <h4 className="font-semibold">Video URLs</h4>
                    <Button onClick={() => setVideoUrls([...videoUrls, ""])} variant="outline" size="sm">
                      <Plus className="w-4 h-4 mr-1" />Add URL
                    </Button>
                  </div>
                  <div className="space-y-2">
                    {videoUrls.map((url, i) => (
                      <div key={i} className="flex gap-2">
                        <input type="url" value={url} onChange={(e) => { const n = [...videoUrls]; n[i] = e.target.value; setVideoUrls(n); }} placeholder="Video URL" className="flex-1 h-10 rounded-md border px-3 bg-background" />
                        {videoUrls.length > 1 && <Button onClick={() => setVideoUrls(videoUrls.filter((_, idx) => idx !== i))} variant="ghost" size="sm"><X className="w-4 h-4" /></Button>}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="border rounded-xl p-4 bg-card">
                  <div className="flex justify-between mb-3">
                    <h4 className="font-semibold flex items-center gap-2"><Github className="w-4 h-4" />GitHub Repos</h4>
                    <Button onClick={() => setGithubRepoUrls([...githubRepoUrls, ""])} variant="outline" size="sm">
                      <Plus className="w-4 h-4 mr-1" />Add Repo
                    </Button>
                  </div>
                  <div className="space-y-2">
                    {githubRepoUrls.map((url, i) => (
                      <div key={i} className="flex gap-2">
                        <input type="url" value={url} onChange={(e) => { const n = [...githubRepoUrls]; n[i] = e.target.value; setGithubRepoUrls(n); }} placeholder="https://github.com/user/repo" className="flex-1 h-10 rounded-md border px-3 bg-background" />
                        {githubRepoUrls.length > 1 && <Button onClick={() => setGithubRepoUrls(githubRepoUrls.filter((_, idx) => idx !== i))} variant="ghost" size="sm"><X className="w-4 h-4" /></Button>}
                      </div>
                    ))}
                  </div>
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

                <Button onClick={handleCombinedGenerate} disabled={isGenerating || (videoUrls.every(u => !u.trim()) && githubRepoUrls.every(u => !u.trim()) && ideProjects.length === 0)} className="w-full h-12" size="lg">
                  {isGenerating ? <><Loader2 className="w-5 h-5 mr-2 animate-spin" />Generating...</> : <><Sparkles className="w-5 h-5 mr-2" />Generate Workflow</>}
                </Button>
              </TabsContent>

              <TabsContent value="text" className="mt-6 space-y-6">
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

              <TabsContent value="image" className="mt-6 space-y-6">
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

              <TabsContent value="import" className="mt-6 space-y-6">
                <div className="bg-orange-500/5 border-2 border-dashed rounded-xl p-6">
                  <h3 className="text-xl font-bold mb-2">Import Workflow</h3>
                  <p className="text-muted-foreground">Load a JSON workflow file</p>
                </div>
                <div className="border rounded-lg p-6 bg-card">
                  <input ref={fileInputRef} type="file" accept=".json" onChange={handleJSONImport} className="hidden" />
                  <Button onClick={() => fileInputRef.current?.click()} variant="outline" size="lg" className="w-full">
                    <Upload className="w-5 h-5 mr-2" />Select JSON File
                  </Button>
                </div>
              </TabsContent>

              <TabsContent value="export" className="mt-6 space-y-6">
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
                </div>
              </TabsContent>
            </div>
          </ScrollArea>
        </Tabs>

        <WorkflowBusinessExport open={showBusinessExport} onOpenChange={setShowBusinessExport} nodes={nodes} workflowName={workflowName} guardrailMetadata={guardrailMetadata ? { explanations: guardrailMetadata.guardrailExplanations, complianceStandards: guardrailMetadata.complianceStandards, riskScore: guardrailMetadata.riskScore, policyAnalysis: guardrailMetadata.policyAnalysis } : undefined} />
      </DialogContent>
    </Dialog>
  );
};
