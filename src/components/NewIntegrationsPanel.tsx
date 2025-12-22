import { useState } from "react";
import { Globe, Video, FileSignature, Zap, ArrowRight, Check, ExternalLink, Search } from "lucide-react";
import { Button } from "./ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Input } from "./ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "./ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { ScrollArea } from "./ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface Integration {
  id: string;
  name: string;
  icon: React.ReactNode;
  description: string;
  category: "new" | "updated" | "popular";
  features: string[];
  triggers?: string[];
  actions?: string[];
  docsUrl?: string;
  isNew?: boolean;
  updateNote?: string;
}

interface NewIntegrationsPanelProps {
  onAddIntegration?: (integration: Integration) => void;
}

export const NewIntegrationsPanel = ({ onAddIntegration }: NewIntegrationsPanelProps) => {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIntegration, setSelectedIntegration] = useState<Integration | null>(null);
  const [connectedIntegrations, setConnectedIntegrations] = useState<string[]>([]);

  const integrations: Integration[] = [
    {
      id: "airtop",
      name: "Airtop",
      icon: <Globe className="w-5 h-5" />,
      description: "Use AI-powered cloud browsers to automate complex web tasks like navigating logins, extracting data, and interacting with websites.",
      category: "new",
      isNew: true,
      features: [
        "AI-powered cloud browsers",
        "Navigate complex logins",
        "Extract data from any website",
        "Interact with dynamic content",
        "Handle anti-bot protections",
      ],
      triggers: [
        "Page content changed",
        "Data extraction complete",
        "Browser session started",
      ],
      actions: [
        "Open URL in cloud browser",
        "Extract structured data",
        "Fill form fields",
        "Take screenshot",
        "Execute JavaScript",
      ],
      docsUrl: "https://docs.airtop.ai",
    },
    {
      id: "zoom",
      name: "Zoom",
      icon: <Video className="w-5 h-5" />,
      description: "Automate follow-ups, send alerts, or create tasks as soon as a message is posted in meeting chat.",
      category: "updated",
      updateNote: "New: Chat Message trigger for Meetings & Webinars",
      features: [
        "Meeting chat message triggers",
        "Webinar automation",
        "Automatic follow-ups",
        "Real-time notifications",
        "Task creation from chat",
      ],
      triggers: [
        "New Chat Message in Meeting",
        "New Chat Message in Webinar",
        "Meeting started",
        "Meeting ended",
        "Participant joined",
      ],
      actions: [
        "Create meeting",
        "Send meeting invite",
        "Add registrant",
        "Update meeting",
      ],
      docsUrl: "https://marketplace.zoom.us",
    },
    {
      id: "docusign",
      name: "DocuSign",
      icon: <FileSignature className="w-5 h-5" />,
      description: "Automate document sending and signing with no manual steps using templates.",
      category: "updated",
      updateNote: "New: Send Envelope Using Template & Create Signature Request actions",
      features: [
        "Template-based envelopes",
        "Automated signature requests",
        "No manual document handling",
        "Bulk document processing",
        "Status tracking",
      ],
      triggers: [
        "Envelope completed",
        "Envelope sent",
        "Recipient signed",
        "Envelope voided",
      ],
      actions: [
        "Send Envelope Using Template",
        "Create Signature Request",
        "Create envelope from document",
        "Add recipient",
        "Get envelope status",
      ],
      docsUrl: "https://developers.docusign.com",
    },
    {
      id: "email-by-zapier",
      name: "Email by Zapier",
      icon: <Zap className="w-5 h-5 text-orange-500" />,
      description: "Have a separate inbox just for your automated email workflows. Ditch the clutter!",
      category: "popular",
      features: [
        "Dedicated automation inbox",
        "No email clutter",
        "Parse incoming emails",
        "Send automated responses",
        "Email-to-task workflows",
      ],
      triggers: [
        "New inbound email",
        "Email with specific subject",
        "Email from specific sender",
      ],
      actions: [
        "Send outbound email",
        "Parse email content",
        "Extract attachments",
      ],
    },
    {
      id: "google-sheets",
      name: "Google Sheets",
      icon: (
        <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
          <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V5h14v14z"/>
          <path d="M7 7h4v2H7zm6 0h4v2h-4zm-6 4h4v2H7zm6 0h4v2h-4zm-6 4h4v2H7zm6 0h4v2h-4z"/>
        </svg>
      ),
      description: "Stop manually updating spreadsheets. Automate data flows between Sheets and 8,000+ apps.",
      category: "popular",
      features: [
        "Automatic row updates",
        "Multi-sheet workflows",
        "Data validation",
        "Calculated fields",
        "Scheduled syncs",
      ],
      triggers: [
        "New row added",
        "Row updated",
        "New spreadsheet",
      ],
      actions: [
        "Create row",
        "Update row",
        "Lookup row",
        "Create spreadsheet",
        "Copy worksheet",
      ],
    },
  ];

  const filteredIntegrations = integrations.filter(
    (i) =>
      i.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      i.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleConnect = (integration: Integration) => {
    setConnectedIntegrations([...connectedIntegrations, integration.id]);
    setSelectedIntegration(null);
    onAddIntegration?.(integration);
    
    toast({
      title: `${integration.name} connected!`,
      description: "Integration is now available in your workflows",
    });
  };

  const getCategoryBadge = (category: Integration["category"]) => {
    switch (category) {
      case "new":
        return <Badge className="bg-green-500">New</Badge>;
      case "updated":
        return <Badge variant="secondary">Updated</Badge>;
      default:
        return <Badge variant="outline">Popular</Badge>;
    }
  };

  return (
    <div className="h-full flex flex-col gap-4 p-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">New & Noteworthy</h2>
          <p className="text-sm text-muted-foreground">
            1 new integration + 14 updates this week
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search integrations..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Integrations tabs */}
      <Tabs defaultValue="all" className="flex-1">
        <TabsList className="w-full justify-start">
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="new">New</TabsTrigger>
          <TabsTrigger value="updated">Updated</TabsTrigger>
          <TabsTrigger value="popular">Popular</TabsTrigger>
        </TabsList>

        <ScrollArea className="h-[calc(100%-48px)] mt-3">
          <TabsContent value="all" className="m-0 space-y-3">
            {filteredIntegrations.map((integration) => (
              <IntegrationCard
                key={integration.id}
                integration={integration}
                isConnected={connectedIntegrations.includes(integration.id)}
                onSelect={() => setSelectedIntegration(integration)}
                categoryBadge={getCategoryBadge(integration.category)}
              />
            ))}
          </TabsContent>
          
          {["new", "updated", "popular"].map((category) => (
            <TabsContent key={category} value={category} className="m-0 space-y-3">
              {filteredIntegrations
                .filter((i) => i.category === category)
                .map((integration) => (
                  <IntegrationCard
                    key={integration.id}
                    integration={integration}
                    isConnected={connectedIntegrations.includes(integration.id)}
                    onSelect={() => setSelectedIntegration(integration)}
                    categoryBadge={getCategoryBadge(integration.category)}
                  />
                ))}
            </TabsContent>
          ))}
        </ScrollArea>
      </Tabs>

      {/* Integration detail dialog */}
      <Dialog open={!!selectedIntegration} onOpenChange={() => setSelectedIntegration(null)}>
        <DialogContent className="max-w-lg">
          {selectedIntegration && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
                    {selectedIntegration.icon}
                  </div>
                  <div>
                    <DialogTitle className="flex items-center gap-2">
                      {selectedIntegration.name}
                      {selectedIntegration.isNew && (
                        <Badge className="bg-green-500 text-xs">New</Badge>
                      )}
                    </DialogTitle>
                    <DialogDescription>
                      {selectedIntegration.updateNote || selectedIntegration.description}
                    </DialogDescription>
                  </div>
                </div>
              </DialogHeader>

              <div className="space-y-4 py-4">
                {/* Features */}
                <div>
                  <h4 className="text-sm font-medium mb-2">Features</h4>
                  <ul className="space-y-1.5">
                    {selectedIntegration.features.map((feature, i) => (
                      <li key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Check className="w-3.5 h-3.5 text-green-500" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Triggers */}
                {selectedIntegration.triggers && (
                  <div>
                    <h4 className="text-sm font-medium mb-2">Triggers</h4>
                    <div className="flex flex-wrap gap-1.5">
                      {selectedIntegration.triggers.map((trigger, i) => (
                        <Badge key={i} variant="outline" className="text-xs">
                          {trigger}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Actions */}
                {selectedIntegration.actions && (
                  <div>
                    <h4 className="text-sm font-medium mb-2">Actions</h4>
                    <div className="flex flex-wrap gap-1.5">
                      {selectedIntegration.actions.map((action, i) => (
                        <Badge key={i} variant="secondary" className="text-xs">
                          {action}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex gap-2 pt-2">
                  <Button
                    className="flex-1"
                    onClick={() => handleConnect(selectedIntegration)}
                    disabled={connectedIntegrations.includes(selectedIntegration.id)}
                  >
                    {connectedIntegrations.includes(selectedIntegration.id) ? (
                      <>
                        <Check className="w-4 h-4 mr-1.5" />
                        Connected
                      </>
                    ) : (
                      <>
                        Connect
                        <ArrowRight className="w-4 h-4 ml-1.5" />
                      </>
                    )}
                  </Button>
                  {selectedIntegration.docsUrl && (
                    <Button variant="outline" asChild>
                      <a href={selectedIntegration.docsUrl} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    </Button>
                  )}
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

interface IntegrationCardProps {
  integration: Integration;
  isConnected: boolean;
  onSelect: () => void;
  categoryBadge: React.ReactNode;
}

const IntegrationCard = ({ integration, isConnected, onSelect, categoryBadge }: IntegrationCardProps) => {
  return (
    <Card
      className={cn(
        "cursor-pointer transition-all hover:border-primary/50 hover:shadow-md",
        isConnected && "border-green-500/30 bg-green-500/5"
      )}
      onClick={onSelect}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div
            className={cn(
              "h-10 w-10 rounded-lg flex items-center justify-center flex-shrink-0",
              isConnected ? "bg-green-500/10 text-green-600" : "bg-primary/10 text-primary"
            )}
          >
            {isConnected ? <Check className="w-5 h-5" /> : integration.icon}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-medium truncate">{integration.name}</h3>
              {categoryBadge}
            </div>
            <p className="text-sm text-muted-foreground line-clamp-2">
              {integration.updateNote || integration.description}
            </p>
          </div>
          <ArrowRight className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-1" />
        </div>
      </CardContent>
    </Card>
  );
};
