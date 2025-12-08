import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Slider } from "@/components/ui/slider";
import { useToast } from "@/hooks/use-toast";
import { Switch } from "@/components/ui/switch";
import { 
  FileText, 
  Database, 
  Brain, 
  Layers, 
  Search, 
  MessageSquare,
  Zap,
  Settings2,
  Upload,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  RefreshCw,
  HardDrive,
  Globe,
  Mic,
  Image,
  FileSearch,
  Shield
} from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

// Types for AI Node configurations
interface AINodeConfig {
  id: string;
  type: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  category: "llm" | "embedding" | "vector" | "speech" | "ocr" | "image" | "moderation";
  settings: Record<string, any>;
}

const aiNodeCategories = [
  { 
    id: "llm", 
    name: "LLM / Chat", 
    icon: <Brain className="h-4 w-4" />,
    description: "Large Language Models for text generation and chat"
  },
  { 
    id: "embedding", 
    name: "Embeddings", 
    icon: <Layers className="h-4 w-4" />,
    description: "Convert text to vector embeddings"
  },
  { 
    id: "vector", 
    name: "Vector DB", 
    icon: <Database className="h-4 w-4" />,
    description: "Store and query vector embeddings"
  },
  { 
    id: "speech", 
    name: "Speech", 
    icon: <Mic className="h-4 w-4" />,
    description: "Speech-to-text and text-to-speech"
  },
  { 
    id: "ocr", 
    name: "OCR / Document", 
    icon: <FileSearch className="h-4 w-4" />,
    description: "Extract text from images and PDFs"
  },
  { 
    id: "image", 
    name: "Image", 
    icon: <Image className="h-4 w-4" />,
    description: "Image generation and vision models"
  },
  { 
    id: "moderation", 
    name: "Moderation", 
    icon: <Shield className="h-4 w-4" />,
    description: "Content moderation and filtering"
  },
];

export function RAGAgentNodes() {
  const { toast } = useToast();
  const [selectedCategory, setSelectedCategory] = useState<string>("llm");

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                AI Nodes Library
              </CardTitle>
              <CardDescription>
                70+ AI nodes for building intelligent workflows
              </CardDescription>
            </div>
            <Badge variant="secondary" className="text-lg px-3 py-1">
              70+ Nodes
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-7">
            {aiNodeCategories.map((category) => (
              <Button
                key={category.id}
                variant={selectedCategory === category.id ? "default" : "outline"}
                className="flex flex-col h-auto py-3 gap-1"
                onClick={() => setSelectedCategory(category.id)}
              >
                {category.icon}
                <span className="text-xs">{category.name}</span>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Category Content */}
      {selectedCategory === "llm" && <LLMNodesSection />}
      {selectedCategory === "embedding" && <EmbeddingNodesSection />}
      {selectedCategory === "vector" && <VectorDBNodesSection />}
      {selectedCategory === "speech" && <SpeechNodesSection />}
      {selectedCategory === "ocr" && <OCRNodesSection />}
      {selectedCategory === "image" && <ImageNodesSection />}
      {selectedCategory === "moderation" && <ModerationNodesSection />}

      {/* RAG Pipeline Builder */}
      <RAGPipelineBuilder />
    </div>
  );
}

function LLMNodesSection() {
  const [model, setModel] = useState("gpt-4");
  const [temperature, setTemperature] = useState([0.7]);
  const [maxTokens, setMaxTokens] = useState([2048]);
  const [streaming, setStreaming] = useState(true);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Brain className="h-5 w-5" />
          LLM / Chat Nodes
        </CardTitle>
        <CardDescription>
          Configure large language models for text generation and conversations
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Available Models */}
        <div className="grid gap-4 md:grid-cols-3">
          {[
            { name: "OpenAI GPT-4", models: ["gpt-4", "gpt-4-turbo", "gpt-3.5-turbo"], provider: "OpenAI" },
            { name: "Anthropic Claude", models: ["claude-3-opus", "claude-3-sonnet", "claude-3-haiku"], provider: "Anthropic" },
            { name: "Google Gemini", models: ["gemini-pro", "gemini-pro-vision", "gemini-ultra"], provider: "Google" },
          ].map((provider) => (
            <div key={provider.name} className="p-4 border rounded-lg">
              <h4 className="font-medium mb-2">{provider.name}</h4>
              <div className="space-y-1">
                {provider.models.map((m) => (
                  <Badge key={m} variant="outline" className="mr-1 text-xs">
                    {m}
                  </Badge>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Configuration */}
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Model</Label>
              <Select value={model} onValueChange={setModel}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="gpt-4">GPT-4</SelectItem>
                  <SelectItem value="gpt-4-turbo">GPT-4 Turbo</SelectItem>
                  <SelectItem value="claude-3-opus">Claude 3 Opus</SelectItem>
                  <SelectItem value="gemini-pro">Gemini Pro</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between">
                <Label>Temperature</Label>
                <span className="text-sm text-muted-foreground">{temperature[0]}</span>
              </div>
              <Slider
                value={temperature}
                onValueChange={setTemperature}
                min={0}
                max={2}
                step={0.1}
              />
              <p className="text-xs text-muted-foreground">
                Lower = more focused, Higher = more creative
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between">
                <Label>Max Tokens</Label>
                <span className="text-sm text-muted-foreground">{maxTokens[0]}</span>
              </div>
              <Slider
                value={maxTokens}
                onValueChange={setMaxTokens}
                min={256}
                max={8192}
                step={256}
              />
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>System Prompt</Label>
              <Textarea
                placeholder="You are a helpful AI assistant..."
                className="h-32"
              />
            </div>

            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div>
                <Label>Enable Streaming</Label>
                <p className="text-xs text-muted-foreground">Stream responses token by token</p>
              </div>
              <Switch checked={streaming} onCheckedChange={setStreaming} />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function EmbeddingNodesSection() {
  const [chunkSize, setChunkSize] = useState([512]);
  const [chunkOverlap, setChunkOverlap] = useState([50]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Layers className="h-5 w-5" />
          Embedding Nodes
        </CardTitle>
        <CardDescription>
          Convert text into vector embeddings for semantic search and RAG
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2">
          {/* Embedding Models */}
          <div className="space-y-4">
            <Label>Embedding Model</Label>
            <Select defaultValue="openai-ada">
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="openai-ada">OpenAI text-embedding-ada-002</SelectItem>
                <SelectItem value="openai-3-small">OpenAI text-embedding-3-small</SelectItem>
                <SelectItem value="openai-3-large">OpenAI text-embedding-3-large</SelectItem>
                <SelectItem value="cohere">Cohere Embed</SelectItem>
                <SelectItem value="huggingface">HuggingFace Sentence Transformers</SelectItem>
              </SelectContent>
            </Select>

            <div className="p-4 border rounded-lg bg-muted/50">
              <h5 className="font-medium mb-2">Model Info</h5>
              <div className="text-sm space-y-1">
                <p>Dimensions: <span className="text-muted-foreground">1536</span></p>
                <p>Max Tokens: <span className="text-muted-foreground">8191</span></p>
                <p>Cost: <span className="text-muted-foreground">$0.0001 / 1K tokens</span></p>
              </div>
            </div>
          </div>

          {/* Chunking Settings */}
          <div className="space-y-4">
            <h4 className="font-medium">Chunking Configuration</h4>
            
            <div className="space-y-2">
              <div className="flex justify-between">
                <Label>Chunk Size (tokens)</Label>
                <span className="text-sm text-muted-foreground">{chunkSize[0]}</span>
              </div>
              <Slider
                value={chunkSize}
                onValueChange={setChunkSize}
                min={128}
                max={2048}
                step={64}
              />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between">
                <Label>Chunk Overlap</Label>
                <span className="text-sm text-muted-foreground">{chunkOverlap[0]}</span>
              </div>
              <Slider
                value={chunkOverlap}
                onValueChange={setChunkOverlap}
                min={0}
                max={200}
                step={10}
              />
            </div>

            <div className="space-y-2">
              <Label>Chunking Strategy</Label>
              <Select defaultValue="recursive">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="recursive">Recursive Character Splitting</SelectItem>
                  <SelectItem value="sentence">Sentence Splitting</SelectItem>
                  <SelectItem value="paragraph">Paragraph Splitting</SelectItem>
                  <SelectItem value="semantic">Semantic Splitting</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function VectorDBNodesSection() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="h-5 w-5" />
          Vector Database Nodes
        </CardTitle>
        <CardDescription>
          Store and query vector embeddings for semantic search
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 md:grid-cols-3">
          {[
            { name: "Qdrant", icon: "🔷", description: "High-performance vector database" },
            { name: "Pinecone", icon: "🌲", description: "Managed vector database service" },
            { name: "Milvus", icon: "🐬", description: "Open-source vector database" },
            { name: "Weaviate", icon: "🔶", description: "AI-native vector database" },
            { name: "Chroma", icon: "🎨", description: "Lightweight embedding database" },
            { name: "Supabase pgvector", icon: "⚡", description: "PostgreSQL vector extension" },
          ].map((db) => (
            <div key={db.name} className="p-4 border rounded-lg hover:border-primary transition-colors cursor-pointer">
              <div className="flex items-center gap-3 mb-2">
                <span className="text-2xl">{db.icon}</span>
                <div>
                  <h4 className="font-medium">{db.name}</h4>
                  <p className="text-xs text-muted-foreground">{db.description}</p>
                </div>
              </div>
              <div className="flex gap-2 mt-3">
                <Badge variant="outline" className="text-xs">Insert</Badge>
                <Badge variant="outline" className="text-xs">Query</Badge>
                <Badge variant="outline" className="text-xs">Delete</Badge>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 p-4 border rounded-lg bg-muted/50">
          <h4 className="font-medium mb-3">Query Configuration</h4>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Top K Results</Label>
              <Input type="number" defaultValue="5" />
            </div>
            <div className="space-y-2">
              <Label>Similarity Threshold</Label>
              <Input type="number" defaultValue="0.7" step="0.1" />
            </div>
            <div className="space-y-2">
              <Label>Distance Metric</Label>
              <Select defaultValue="cosine">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cosine">Cosine Similarity</SelectItem>
                  <SelectItem value="euclidean">Euclidean Distance</SelectItem>
                  <SelectItem value="dot">Dot Product</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Metadata Filter</Label>
              <Input placeholder='{"category": "docs"}' />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function SpeechNodesSection() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mic className="h-5 w-5" />
          Speech Nodes
        </CardTitle>
        <CardDescription>
          Speech-to-text transcription and text-to-speech synthesis
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="stt">
          <TabsList>
            <TabsTrigger value="stt">Speech-to-Text</TabsTrigger>
            <TabsTrigger value="tts">Text-to-Speech</TabsTrigger>
          </TabsList>

          <TabsContent value="stt" className="space-y-4 pt-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Provider</Label>
                <Select defaultValue="whisper">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="whisper">OpenAI Whisper</SelectItem>
                    <SelectItem value="deepgram">Deepgram</SelectItem>
                    <SelectItem value="assemblyai">AssemblyAI</SelectItem>
                    <SelectItem value="google">Google Speech-to-Text</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Language</Label>
                <Select defaultValue="auto">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="auto">Auto-detect</SelectItem>
                    <SelectItem value="en">English</SelectItem>
                    <SelectItem value="es">Spanish</SelectItem>
                    <SelectItem value="fr">French</SelectItem>
                    <SelectItem value="de">German</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div>
                <Label>Include Timestamps</Label>
                <p className="text-xs text-muted-foreground">Add word-level timestamps</p>
              </div>
              <Switch />
            </div>
          </TabsContent>

          <TabsContent value="tts" className="space-y-4 pt-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Provider</Label>
                <Select defaultValue="elevenlabs">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="elevenlabs">ElevenLabs</SelectItem>
                    <SelectItem value="openai">OpenAI TTS</SelectItem>
                    <SelectItem value="amazon">Amazon Polly</SelectItem>
                    <SelectItem value="google">Google TTS</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Voice</Label>
                <Select defaultValue="alloy">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="alloy">Alloy</SelectItem>
                    <SelectItem value="echo">Echo</SelectItem>
                    <SelectItem value="fable">Fable</SelectItem>
                    <SelectItem value="onyx">Onyx</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

function OCRNodesSection() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileSearch className="h-5 w-5" />
          OCR / Document Nodes
        </CardTitle>
        <CardDescription>
          Extract text and structure from documents, images, and PDFs
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 md:grid-cols-2">
          {[
            { name: "PDF Parser", icon: <FileText className="h-6 w-6" />, formats: ["PDF", "DOCX"] },
            { name: "OCR Engine", icon: <FileSearch className="h-6 w-6" />, formats: ["PNG", "JPG", "TIFF"] },
            { name: "Table Extractor", icon: <Database className="h-6 w-6" />, formats: ["PDF", "Images"] },
            { name: "Form Parser", icon: <Settings2 className="h-6 w-6" />, formats: ["PDF Forms"] },
          ].map((node) => (
            <div key={node.name} className="p-4 border rounded-lg">
              <div className="flex items-center gap-3 mb-3">
                {node.icon}
                <h4 className="font-medium">{node.name}</h4>
              </div>
              <div className="flex gap-1 flex-wrap">
                {node.formats.map((format) => (
                  <Badge key={format} variant="secondary" className="text-xs">
                    {format}
                  </Badge>
                ))}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function ImageNodesSection() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Image className="h-5 w-5" />
          Image Nodes
        </CardTitle>
        <CardDescription>
          Image generation, vision, and analysis
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="generation">
          <TabsList>
            <TabsTrigger value="generation">Generation</TabsTrigger>
            <TabsTrigger value="vision">Vision</TabsTrigger>
            <TabsTrigger value="editing">Editing</TabsTrigger>
          </TabsList>

          <TabsContent value="generation" className="pt-4">
            <div className="grid gap-4 md:grid-cols-3">
              {[
                { name: "DALL-E 3", provider: "OpenAI" },
                { name: "Midjourney", provider: "Midjourney" },
                { name: "Stable Diffusion", provider: "Stability AI" },
              ].map((model) => (
                <div key={model.name} className="p-4 border rounded-lg">
                  <h4 className="font-medium">{model.name}</h4>
                  <p className="text-xs text-muted-foreground">{model.provider}</p>
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="vision" className="pt-4">
            <div className="grid gap-4 md:grid-cols-3">
              {[
                { name: "GPT-4 Vision", description: "Analyze and describe images" },
                { name: "Claude Vision", description: "Multi-modal image understanding" },
                { name: "Gemini Vision", description: "Image and video analysis" },
              ].map((model) => (
                <div key={model.name} className="p-4 border rounded-lg">
                  <h4 className="font-medium">{model.name}</h4>
                  <p className="text-xs text-muted-foreground">{model.description}</p>
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="editing" className="pt-4">
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Image editing capabilities including inpainting, outpainting, and variations.
              </p>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

function ModerationNodesSection() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Moderation Nodes
        </CardTitle>
        <CardDescription>
          Content moderation, sentiment analysis, and safety filters
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 md:grid-cols-2">
          {[
            { name: "Content Moderation", description: "Detect harmful or inappropriate content", icon: <Shield /> },
            { name: "Sentiment Analysis", description: "Analyze text sentiment and emotion", icon: <MessageSquare /> },
            { name: "Toxicity Filter", description: "Filter toxic or offensive language", icon: <AlertCircle /> },
            { name: "PII Detection", description: "Detect personal identifiable information", icon: <FileText /> },
          ].map((node) => (
            <div key={node.name} className="p-4 border rounded-lg flex items-start gap-3">
              <div className="p-2 bg-muted rounded">{node.icon}</div>
              <div>
                <h4 className="font-medium">{node.name}</h4>
                <p className="text-sm text-muted-foreground">{node.description}</p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function RAGPipelineBuilder() {
  const { toast } = useToast();

  const handleBuildPipeline = () => {
    toast({
      title: "RAG Pipeline Created",
      description: "Your retrieval-augmented generation pipeline is ready.",
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Zap className="h-5 w-5 text-primary" />
          RAG Pipeline Builder
        </CardTitle>
        <CardDescription>
          Quickly build a complete retrieval-augmented generation workflow
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-4 overflow-x-auto py-4">
          {[
            { step: 1, name: "Upload", icon: <Upload className="h-5 w-5" />, description: "PDF, DOCX, TXT" },
            { step: 2, name: "Chunk", icon: <Layers className="h-5 w-5" />, description: "Split into segments" },
            { step: 3, name: "Embed", icon: <HardDrive className="h-5 w-5" />, description: "Generate vectors" },
            { step: 4, name: "Store", icon: <Database className="h-5 w-5" />, description: "Vector database" },
            { step: 5, name: "Retrieve", icon: <Search className="h-5 w-5" />, description: "Semantic search" },
            { step: 6, name: "Generate", icon: <Brain className="h-5 w-5" />, description: "LLM response" },
          ].map((step, index) => (
            <div key={step.step} className="flex items-center">
              <div className="flex flex-col items-center min-w-[100px]">
                <div className="w-12 h-12 rounded-full border-2 border-primary bg-primary/10 flex items-center justify-center">
                  {step.icon}
                </div>
                <span className="mt-2 font-medium text-sm">{step.name}</span>
                <span className="text-xs text-muted-foreground">{step.description}</span>
              </div>
              {index < 5 && (
                <ArrowRight className="h-5 w-5 mx-2 text-muted-foreground" />
              )}
            </div>
          ))}
        </div>

        <div className="flex justify-end mt-4">
          <Button onClick={handleBuildPipeline}>
            <Zap className="h-4 w-4 mr-2" />
            Create RAG Pipeline
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// Import for AlertCircle that was missing
import { AlertCircle } from "lucide-react";
