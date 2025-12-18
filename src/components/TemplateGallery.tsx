import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, Image, Video, Type, Music, Workflow, Sparkles, Layers } from "lucide-react";
import { cn } from "@/lib/utils";
import type { WorkflowNodeData } from "@/types/workflow";

interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  category: "image" | "video" | "text" | "audio" | "automation" | "multi";
  nodeCount: number;
  nodes: WorkflowNodeData[];
  thumbnail?: string;
  featured?: boolean;
}

interface TemplateGalleryProps {
  onSelectTemplate: (nodes: WorkflowNodeData[], name: string) => void;
}

const TEMPLATE_CATEGORIES = [
  { id: "all", label: "All", icon: Layers },
  { id: "image", label: "Image", icon: Image },
  { id: "video", label: "Video", icon: Video },
  { id: "text", label: "Text", icon: Type },
  { id: "audio", label: "Audio", icon: Music },
  { id: "automation", label: "Automation", icon: Workflow },
];

// Pre-built templates inspired by Easy-Peasy.AI
const TEMPLATES: WorkflowTemplate[] = [
  {
    id: "text-to-image-starter",
    name: "Text to Image - Starter",
    description: "Generate images from text prompts with AI-written enhancement",
    category: "image",
    nodeCount: 5,
    featured: true,
    nodes: [
      { id: "1", type: "trigger", title: "User Input", description: "Receive text prompt", x: 100, y: 100 },
      { id: "2", type: "text_generation", title: "Enhance Prompt", description: "AI improves the prompt", x: 100, y: 280 },
      { id: "3", type: "text_to_image", title: "Generate Image", description: "Create image from enhanced prompt", x: 100, y: 460 },
      { id: "4", type: "upscale_image", title: "Upscale", description: "Enhance resolution", x: 100, y: 640 },
      { id: "5", type: "action", title: "Deliver", description: "Return final image", x: 100, y: 820 },
    ],
  },
  {
    id: "image-to-video",
    name: "Image to Video Animation",
    description: "Transform static images into animated videos with AI",
    category: "video",
    nodeCount: 7,
    featured: true,
    nodes: [
      { id: "1", type: "trigger", title: "Image Upload", description: "Receive input image", x: 100, y: 100 },
      { id: "2", type: "ai", title: "Analyze Scene", description: "Understand image content", x: 100, y: 280 },
      { id: "3", type: "text_generation", title: "Generate Motion", description: "Create motion instructions", x: 100, y: 460 },
      { id: "4", type: "image_to_video", title: "Animate", description: "Generate video from image", x: 100, y: 640 },
      { id: "5", type: "guardrail", title: "Content Check", description: "Verify output quality", x: 100, y: 820 },
      { id: "6", type: "ai_validator", title: "Validate", description: "Quality assurance", x: 100, y: 1000 },
      { id: "7", type: "action", title: "Export Video", description: "Deliver final video", x: 100, y: 1180 },
    ],
  },
  {
    id: "content-pipeline",
    name: "Content Creation Pipeline",
    description: "End-to-end content generation: text, images, and audio",
    category: "multi",
    nodeCount: 12,
    nodes: [
      { id: "1", type: "trigger", title: "Topic Input", description: "Receive content topic", x: 100, y: 100 },
      { id: "2", type: "text_generation", title: "Research", description: "Generate research notes", x: 100, y: 280 },
      { id: "3", type: "text_generation", title: "Write Draft", description: "Create article draft", x: 100, y: 460 },
      { id: "4", type: "ai_validator", title: "Review", description: "Check quality", x: 100, y: 640 },
      { id: "5", type: "text_to_image", title: "Hero Image", description: "Generate featured image", x: 350, y: 640 },
      { id: "6", type: "text_to_image", title: "Thumbnails", description: "Create social images", x: 600, y: 640 },
      { id: "7", type: "audio_synthesis", title: "Audio Version", description: "Text-to-speech", x: 100, y: 820 },
      { id: "8", type: "guardrail", title: "Compliance", description: "Check guidelines", x: 100, y: 1000 },
      { id: "9", type: "ai_orchestrator", title: "Package", description: "Bundle all assets", x: 100, y: 1180 },
      { id: "10", type: "connector", title: "CMS Publish", description: "Push to CMS", x: 100, y: 1360 },
      { id: "11", type: "connector", title: "Social Share", description: "Post to social", x: 350, y: 1360 },
      { id: "12", type: "action", title: "Notify", description: "Send completion alert", x: 600, y: 1360 },
    ],
  },
  {
    id: "style-transfer",
    name: "Batch Style Transfer",
    description: "Apply consistent style across multiple images",
    category: "image",
    nodeCount: 6,
    nodes: [
      { id: "1", type: "trigger", title: "Image Batch", description: "Receive multiple images", x: 100, y: 100 },
      { id: "2", type: "data", title: "Style Reference", description: "Load style template", x: 350, y: 100 },
      { id: "3", type: "ai", title: "Extract Style", description: "Analyze style features", x: 225, y: 280 },
      { id: "4", type: "style_transfer", title: "Apply Style", description: "Transfer to all images", x: 100, y: 460 },
      { id: "5", type: "ai_validator", title: "Consistency Check", description: "Verify uniform output", x: 100, y: 640 },
      { id: "6", type: "action", title: "Export Batch", description: "Save styled images", x: 100, y: 820 },
    ],
  },
  {
    id: "transcribe-summarize",
    name: "Audio to Summary",
    description: "Transcribe audio and generate intelligent summaries",
    category: "audio",
    nodeCount: 5,
    nodes: [
      { id: "1", type: "trigger", title: "Audio Input", description: "Receive audio file", x: 100, y: 100 },
      { id: "2", type: "transcription", title: "Transcribe", description: "Convert speech to text", x: 100, y: 280 },
      { id: "3", type: "text_generation", title: "Summarize", description: "Create concise summary", x: 100, y: 460 },
      { id: "4", type: "text_generation", title: "Key Points", description: "Extract action items", x: 100, y: 640 },
      { id: "5", type: "action", title: "Deliver", description: "Send summary report", x: 100, y: 820 },
    ],
  },
  {
    id: "smart-automation",
    name: "Smart Data Automation",
    description: "AI-powered data processing with guardrails",
    category: "automation",
    nodeCount: 8,
    nodes: [
      { id: "1", type: "trigger", title: "Data Webhook", description: "Receive data payload", x: 100, y: 100 },
      { id: "2", type: "guardrail", title: "Input Validation", description: "Validate incoming data", x: 100, y: 280 },
      { id: "3", type: "ai", title: "Classify", description: "AI classification", x: 100, y: 460 },
      { id: "4", type: "condition", title: "Route", description: "Branch based on type", x: 100, y: 640 },
      { id: "5", type: "ai_executor", title: "Process A", description: "Handle type A", x: -50, y: 820 },
      { id: "6", type: "ai_executor", title: "Process B", description: "Handle type B", x: 250, y: 820 },
      { id: "7", type: "storage", title: "Store Results", description: "Save to database", x: 100, y: 1000 },
      { id: "8", type: "action", title: "Notify", description: "Send notifications", x: 100, y: 1180 },
    ],
  },
];

export const TemplateGallery = ({ onSelectTemplate }: TemplateGalleryProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");

  const filteredTemplates = TEMPLATES.filter((template) => {
    const matchesSearch =
      template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory =
      selectedCategory === "all" || template.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const categoryIcon = (cat: string) => {
    switch (cat) {
      case "image":
        return Image;
      case "video":
        return Video;
      case "text":
        return Type;
      case "audio":
        return Music;
      case "automation":
        return Workflow;
      default:
        return Sparkles;
    }
  };

  return (
    <Card className="h-full border-border/50 bg-card/50 backdrop-blur-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-primary" />
          <CardTitle className="text-lg">Ready-to-Use Templates</CardTitle>
        </div>
        <CardDescription>
          Start with pre-built workflows and customize to your needs
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search templates..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Category tabs */}
        <Tabs value={selectedCategory} onValueChange={setSelectedCategory}>
          <TabsList className="grid grid-cols-6 w-full">
            {TEMPLATE_CATEGORIES.map((cat) => {
              const Icon = cat.icon;
              return (
                <TabsTrigger key={cat.id} value={cat.id} className="text-xs">
                  <Icon className="w-3 h-3 mr-1" />
                  {cat.label}
                </TabsTrigger>
              );
            })}
          </TabsList>
        </Tabs>

        {/* Template grid */}
        <ScrollArea className="h-[400px]">
          <div className="grid grid-cols-1 gap-3">
            {filteredTemplates.map((template) => {
              const CategoryIcon = categoryIcon(template.category);
              return (
                <div
                  key={template.id}
                  className={cn(
                    "relative p-4 rounded-lg border cursor-pointer transition-all",
                    "border-border/50 hover:border-primary/50 hover:bg-primary/5",
                    template.featured && "ring-1 ring-primary/30"
                  )}
                  onClick={() => onSelectTemplate(template.nodes, template.name)}
                >
                  {template.featured && (
                    <Badge className="absolute -top-2 -right-2 text-[10px]">
                      Featured
                    </Badge>
                  )}

                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <CategoryIcon className="w-5 h-5 text-primary" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-medium text-sm truncate">
                          {template.name}
                        </h4>
                        <Badge variant="secondary" className="text-[10px]">
                          {template.nodeCount} nodes
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {template.description}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}

            {filteredTemplates.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-8">
                No templates found. Try a different search.
              </p>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};
