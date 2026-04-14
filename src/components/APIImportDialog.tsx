import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { Badge } from "./ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Label } from "./ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { WorkflowNodeData } from "@/types/workflow";
import { Link2, Upload, Library, Loader2, Globe, Key, Zap, ArrowRight } from "lucide-react";

interface APIImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onWorkflowGenerated: (nodes: WorkflowNodeData[], metadata?: any) => void;
}

const POPULAR_APIS = [
  { name: "Stripe", category: "Payments", description: "Payment processing, subscriptions, invoices", baseUrl: "https://api.stripe.com/v1", icon: "💳" },
  { name: "Slack", category: "Communication", description: "Messaging, channels, notifications", baseUrl: "https://slack.com/api", icon: "💬" },
  { name: "OpenAI", category: "AI", description: "GPT, DALL-E, embeddings, completions", baseUrl: "https://api.openai.com/v1", icon: "🤖" },
  { name: "GitHub", category: "Development", description: "Repos, issues, PRs, actions", baseUrl: "https://api.github.com", icon: "🐙" },
  { name: "Twilio", category: "Communication", description: "SMS, voice, WhatsApp messaging", baseUrl: "https://api.twilio.com/2010-04-01", icon: "📱" },
  { name: "SendGrid", category: "Email", description: "Transactional & marketing emails", baseUrl: "https://api.sendgrid.com/v3", icon: "📧" },
  { name: "Google Sheets", category: "Productivity", description: "Spreadsheet data read/write", baseUrl: "https://sheets.googleapis.com/v4", icon: "📊" },
  { name: "Airtable", category: "Database", description: "Database records, views, automations", baseUrl: "https://api.airtable.com/v0", icon: "📋" },
  { name: "HubSpot", category: "CRM", description: "Contacts, deals, tickets, marketing", baseUrl: "https://api.hubapi.com/crm/v3", icon: "🎯" },
  { name: "Shopify", category: "E-Commerce", description: "Products, orders, customers", baseUrl: "https://admin.shopify.com/api/2024-01", icon: "🛒" },
  { name: "Notion", category: "Productivity", description: "Pages, databases, blocks", baseUrl: "https://api.notion.com/v1", icon: "📝" },
  { name: "Jira", category: "Project Management", description: "Issues, projects, sprints", baseUrl: "https://your-domain.atlassian.net/rest/api/3", icon: "📌" },
];

export const APIImportDialog = ({ open, onOpenChange, onWorkflowGenerated }: APIImportDialogProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("url");
  const { toast } = useToast();

  // URL tab state
  const [apiUrl, setApiUrl] = useState("");
  const [apiMethod, setApiMethod] = useState("GET");
  const [apiHeaders, setApiHeaders] = useState("");
  const [apiDescription, setApiDescription] = useState("");

  // Spec tab state
  const [specContent, setSpecContent] = useState("");
  const [specFile, setSpecFile] = useState<File | null>(null);

  // Library tab state
  const [selectedApi, setSelectedApi] = useState<typeof POPULAR_APIS[0] | null>(null);
  const [libraryPrompt, setLibraryPrompt] = useState("");
  const [searchFilter, setSearchFilter] = useState("");

  const generateFromAPI = async (apiInfo: {
    type: "url" | "spec" | "library";
    url?: string;
    method?: string;
    headers?: string;
    description?: string;
    specContent?: string;
    apiName?: string;
    baseUrl?: string;
    prompt?: string;
  }) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-workflow-from-api", {
        body: apiInfo,
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      const generatedNodes: WorkflowNodeData[] = (data.workflow?.nodes || []).map((node: any, i: number) => ({
        id: node.id || `api-node-${i}`,
        type: node.type || "action",
        title: node.title || `Step ${i + 1}`,
        description: node.description || "",
        x: node.x ?? 100,
        y: node.y ?? 100 + i * 180,
        config: node.config || {},
      }));

      if (generatedNodes.length === 0) {
        throw new Error("No workflow nodes were generated");
      }

      onWorkflowGenerated(generatedNodes, {
        guardrailExplanations: data.guardrails?.explanations || [],
        complianceStandards: data.guardrails?.compliance || [],
      });

      toast({
        title: "API Workflow Generated",
        description: `Created ${generatedNodes.length} nodes from API`,
      });

      onOpenChange(false);
      resetForm();
    } catch (err: any) {
      toast({
        title: "Generation Failed",
        description: err.message || "Could not generate workflow from API",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setApiUrl("");
    setApiMethod("GET");
    setApiHeaders("");
    setApiDescription("");
    setSpecContent("");
    setSpecFile(null);
    setSelectedApi(null);
    setLibraryPrompt("");
  };

  const handleUrlSubmit = () => {
    if (!apiUrl.trim()) {
      toast({ title: "Enter an API URL", variant: "destructive" });
      return;
    }
    generateFromAPI({
      type: "url",
      url: apiUrl.trim(),
      method: apiMethod,
      headers: apiHeaders,
      description: apiDescription,
    });
  };

  const handleSpecSubmit = async () => {
    let content = specContent;
    if (specFile) {
      content = await specFile.text();
    }
    if (!content.trim()) {
      toast({ title: "Provide an OpenAPI/Swagger spec", variant: "destructive" });
      return;
    }
    generateFromAPI({ type: "spec", specContent: content });
  };

  const handleLibrarySubmit = () => {
    if (!selectedApi) {
      toast({ title: "Select an API", variant: "destructive" });
      return;
    }
    generateFromAPI({
      type: "library",
      apiName: selectedApi.name,
      baseUrl: selectedApi.baseUrl,
      description: selectedApi.description,
      prompt: libraryPrompt || `Create a workflow that integrates with ${selectedApi.name}`,
    });
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSpecFile(file);
      setSpecContent("");
    }
  };

  const filteredApis = POPULAR_APIS.filter(
    (api) =>
      !searchFilter ||
      api.name.toLowerCase().includes(searchFilter.toLowerCase()) ||
      api.category.toLowerCase().includes(searchFilter.toLowerCase())
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5 text-primary" />
            Import API to Workflow
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="url" className="flex items-center gap-1.5">
              <Link2 className="h-3.5 w-3.5" />
              URL
            </TabsTrigger>
            <TabsTrigger value="spec" className="flex items-center gap-1.5">
              <Upload className="h-3.5 w-3.5" />
              OpenAPI Spec
            </TabsTrigger>
            <TabsTrigger value="library" className="flex items-center gap-1.5">
              <Library className="h-3.5 w-3.5" />
              API Library
            </TabsTrigger>
          </TabsList>

          {/* URL Tab */}
          <TabsContent value="url" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>API Endpoint URL</Label>
              <div className="flex gap-2">
                <Select value={apiMethod} onValueChange={setApiMethod}>
                  <SelectTrigger className="w-28">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {["GET", "POST", "PUT", "PATCH", "DELETE"].map((m) => (
                      <SelectItem key={m} value={m}>{m}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  placeholder="https://api.example.com/v1/resource"
                  value={apiUrl}
                  onChange={(e) => setApiUrl(e.target.value)}
                  className="flex-1"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Headers (JSON, optional)</Label>
              <Textarea
                placeholder='{"Authorization": "Bearer token", "Content-Type": "application/json"}'
                value={apiHeaders}
                onChange={(e) => setApiHeaders(e.target.value)}
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label>What should this API workflow do?</Label>
              <Textarea
                placeholder="Describe the workflow: e.g., 'Fetch user data, validate it, then send a notification'"
                value={apiDescription}
                onChange={(e) => setApiDescription(e.target.value)}
                rows={2}
              />
            </div>

            <Button onClick={handleUrlSubmit} disabled={isLoading} className="w-full">
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Zap className="h-4 w-4 mr-2" />}
              Generate Workflow from URL
            </Button>
          </TabsContent>

          {/* OpenAPI Spec Tab */}
          <TabsContent value="spec" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>Upload OpenAPI/Swagger File</Label>
              <Input
                type="file"
                accept=".json,.yaml,.yml"
                onChange={handleFileUpload}
              />
              {specFile && (
                <p className="text-sm text-muted-foreground">
                  Selected: {specFile.name}
                </p>
              )}
            </div>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">or paste directly</span>
              </div>
            </div>

            <div className="space-y-2">
              <Label>OpenAPI/Swagger Spec (JSON or YAML)</Label>
              <Textarea
                placeholder={`{\n  "openapi": "3.0.0",\n  "info": { "title": "My API" },\n  "paths": { ... }\n}`}
                value={specContent}
                onChange={(e) => { setSpecContent(e.target.value); setSpecFile(null); }}
                rows={8}
                className="font-mono text-xs"
              />
            </div>

            <Button onClick={handleSpecSubmit} disabled={isLoading} className="w-full">
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Zap className="h-4 w-4 mr-2" />}
              Generate Workflow from Spec
            </Button>
          </TabsContent>

          {/* Library Tab */}
          <TabsContent value="library" className="space-y-4 mt-4">
            <Input
              placeholder="Search APIs..."
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
            />

            <div className="grid grid-cols-2 gap-2 max-h-56 overflow-y-auto">
              {filteredApis.map((api) => (
                <Card
                  key={api.name}
                  className={`cursor-pointer transition-all hover:border-primary/50 ${selectedApi?.name === api.name ? "border-primary ring-2 ring-primary/20" : ""}`}
                  onClick={() => setSelectedApi(api)}
                >
                  <CardHeader className="p-3 pb-1">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <span>{api.icon}</span> {api.name}
                    </CardTitle>
                    <CardDescription className="text-xs">{api.description}</CardDescription>
                  </CardHeader>
                  <CardContent className="p-3 pt-0">
                    <Badge variant="secondary" className="text-[10px]">{api.category}</Badge>
                  </CardContent>
                </Card>
              ))}
            </div>

            {selectedApi && (
              <div className="space-y-2 p-3 rounded-lg bg-muted/50">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{selectedApi.icon}</span>
                  <div>
                    <p className="font-medium text-sm">{selectedApi.name}</p>
                    <p className="text-xs text-muted-foreground">{selectedApi.baseUrl}</p>
                  </div>
                </div>
                <Label>What workflow do you want? (optional)</Label>
                <Textarea
                  placeholder={`e.g., "When a new order comes in, process the payment and send a receipt"`}
                  value={libraryPrompt}
                  onChange={(e) => setLibraryPrompt(e.target.value)}
                  rows={2}
                />
              </div>
            )}

            <Button onClick={handleLibrarySubmit} disabled={isLoading || !selectedApi} className="w-full">
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <ArrowRight className="h-4 w-4 mr-2" />}
              Generate {selectedApi?.name || "API"} Workflow
            </Button>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
