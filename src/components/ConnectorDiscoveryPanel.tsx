import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Search, 
  Zap, 
  Database, 
  Mail, 
  MessageSquare, 
  FileText, 
  Calendar,
  ShoppingCart,
  CreditCard,
  BarChart,
  Cloud,
  Code,
  Globe,
  CheckCircle,
  Plus,
  ArrowRight,
  Sparkles
} from "lucide-react";
import { toast } from "sonner";

interface Connector {
  id: string;
  name: string;
  description: string;
  category: string;
  icon: React.ReactNode;
  popular?: boolean;
  status: 'available' | 'coming_soon' | 'connected';
  actions: string[];
  triggers: string[];
}

const connectors: Connector[] = [
  {
    id: 'slack',
    name: 'Slack',
    description: 'Send messages, create channels, and react to events',
    category: 'communication',
    icon: <MessageSquare className="h-5 w-5" />,
    popular: true,
    status: 'available',
    actions: ['Send Message', 'Create Channel', 'Upload File', 'Update Status'],
    triggers: ['New Message', 'Reaction Added', 'Channel Created']
  },
  {
    id: 'gmail',
    name: 'Gmail',
    description: 'Send, read, and organize emails automatically',
    category: 'communication',
    icon: <Mail className="h-5 w-5" />,
    popular: true,
    status: 'available',
    actions: ['Send Email', 'Create Draft', 'Add Label', 'Move to Folder'],
    triggers: ['New Email', 'Email Opened', 'Attachment Received']
  },
  {
    id: 'notion',
    name: 'Notion',
    description: 'Create pages, update databases, and sync content',
    category: 'productivity',
    icon: <FileText className="h-5 w-5" />,
    popular: true,
    status: 'available',
    actions: ['Create Page', 'Update Database', 'Add Block', 'Create Database'],
    triggers: ['Page Updated', 'Database Item Created', 'Page Shared']
  },
  {
    id: 'google-calendar',
    name: 'Google Calendar',
    description: 'Create events, send invites, and manage schedules',
    category: 'productivity',
    icon: <Calendar className="h-5 w-5" />,
    status: 'available',
    actions: ['Create Event', 'Update Event', 'Delete Event', 'Add Attendee'],
    triggers: ['Event Starting', 'Event Created', 'RSVP Changed']
  },
  {
    id: 'stripe',
    name: 'Stripe',
    description: 'Process payments, manage subscriptions, and handle invoices',
    category: 'payments',
    icon: <CreditCard className="h-5 w-5" />,
    popular: true,
    status: 'available',
    actions: ['Create Payment Link', 'Send Invoice', 'Update Subscription', 'Refund Payment'],
    triggers: ['Payment Received', 'Subscription Created', 'Invoice Paid']
  },
  {
    id: 'shopify',
    name: 'Shopify',
    description: 'Manage products, orders, and customers',
    category: 'ecommerce',
    icon: <ShoppingCart className="h-5 w-5" />,
    status: 'available',
    actions: ['Create Product', 'Update Inventory', 'Create Order', 'Add Customer'],
    triggers: ['New Order', 'Product Updated', 'Customer Created']
  },
  {
    id: 'airtable',
    name: 'Airtable',
    description: 'Create records, update bases, and sync data',
    category: 'database',
    icon: <Database className="h-5 w-5" />,
    status: 'available',
    actions: ['Create Record', 'Update Record', 'Find Records', 'Delete Record'],
    triggers: ['New Record', 'Record Updated', 'Record Deleted']
  },
  {
    id: 'google-analytics',
    name: 'Google Analytics',
    description: 'Track events, retrieve reports, and analyze data',
    category: 'analytics',
    icon: <BarChart className="h-5 w-5" />,
    status: 'available',
    actions: ['Get Report', 'Track Event', 'Create Goal'],
    triggers: ['Goal Completed', 'Traffic Spike Detected']
  },
  {
    id: 'aws',
    name: 'AWS',
    description: 'Manage S3, Lambda, and other AWS services',
    category: 'cloud',
    icon: <Cloud className="h-5 w-5" />,
    status: 'available',
    actions: ['Upload to S3', 'Invoke Lambda', 'Send SQS Message', 'Publish to SNS'],
    triggers: ['S3 Object Created', 'Lambda Invoked', 'SQS Message Received']
  },
  {
    id: 'github',
    name: 'GitHub',
    description: 'Manage repos, issues, and pull requests',
    category: 'developer',
    icon: <Code className="h-5 w-5" />,
    status: 'available',
    actions: ['Create Issue', 'Create PR', 'Add Comment', 'Merge Branch'],
    triggers: ['Push Event', 'PR Created', 'Issue Opened', 'Review Requested']
  },
  {
    id: 'webhook',
    name: 'Webhook',
    description: 'Send and receive HTTP requests',
    category: 'developer',
    icon: <Globe className="h-5 w-5" />,
    status: 'available',
    actions: ['Send Request', 'Parse Response', 'Retry on Failure'],
    triggers: ['Webhook Received', 'Scheduled Check']
  },
  {
    id: 'openai',
    name: 'OpenAI',
    description: 'Generate text, analyze content, and create embeddings',
    category: 'ai',
    icon: <Sparkles className="h-5 w-5" />,
    popular: true,
    status: 'available',
    actions: ['Generate Text', 'Analyze Image', 'Create Embedding', 'Moderate Content'],
    triggers: []
  }
];

const categories = [
  { id: 'all', label: 'All', icon: <Zap className="h-4 w-4" /> },
  { id: 'communication', label: 'Communication', icon: <MessageSquare className="h-4 w-4" /> },
  { id: 'productivity', label: 'Productivity', icon: <Calendar className="h-4 w-4" /> },
  { id: 'payments', label: 'Payments', icon: <CreditCard className="h-4 w-4" /> },
  { id: 'database', label: 'Database', icon: <Database className="h-4 w-4" /> },
  { id: 'ai', label: 'AI', icon: <Sparkles className="h-4 w-4" /> },
  { id: 'developer', label: 'Developer', icon: <Code className="h-4 w-4" /> }
];

export const ConnectorDiscoveryPanel = () => {
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [connectedIds, setConnectedIds] = useState<Set<string>>(new Set(['webhook']));

  const filteredConnectors = connectors.filter(c => {
    const matchesSearch = c.name.toLowerCase().includes(search.toLowerCase()) ||
                         c.description.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || c.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleConnect = (connector: Connector) => {
    toast.success(`Connected to ${connector.name}`);
    setConnectedIds(prev => new Set([...prev, connector.id]));
  };

  const popularConnectors = connectors.filter(c => c.popular);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Integrations</h2>
        <p className="text-muted-foreground">Connect your favorite tools and automate your workflows</p>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search integrations..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Popular connectors */}
      {!search && selectedCategory === 'all' && (
        <div>
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <Zap className="h-4 w-4 text-yellow-500" />
            Popular Integrations
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {popularConnectors.map(connector => (
              <Card 
                key={connector.id} 
                className="p-4 hover:border-primary/50 transition-colors cursor-pointer group"
                onClick={() => handleConnect(connector)}
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-muted group-hover:bg-primary/10 transition-colors">
                    {connector.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{connector.name}</p>
                    {connectedIds.has(connector.id) && (
                      <Badge variant="secondary" className="text-xs">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Connected
                      </Badge>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Categories */}
      <Tabs value={selectedCategory} onValueChange={setSelectedCategory}>
        <TabsList className="flex-wrap h-auto gap-1">
          {categories.map(cat => (
            <TabsTrigger key={cat.id} value={cat.id} className="gap-1.5">
              {cat.icon}
              {cat.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value={selectedCategory} className="mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredConnectors.map(connector => (
              <Card key={connector.id} className="p-4 hover:shadow-md transition-shadow">
                <div className="flex items-start gap-3 mb-3">
                  <div className="p-2 rounded-lg bg-muted">
                    {connector.icon}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-semibold">{connector.name}</h4>
                      {connector.popular && (
                        <Badge variant="secondary" className="text-xs">Popular</Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">{connector.description}</p>
                  </div>
                </div>

                {/* Actions & Triggers */}
                <div className="space-y-2 mb-4">
                  {connector.triggers.length > 0 && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Triggers</p>
                      <div className="flex flex-wrap gap-1">
                        {connector.triggers.slice(0, 2).map(t => (
                          <Badge key={t} variant="outline" className="text-xs">{t}</Badge>
                        ))}
                        {connector.triggers.length > 2 && (
                          <Badge variant="outline" className="text-xs">+{connector.triggers.length - 2}</Badge>
                        )}
                      </div>
                    </div>
                  )}
                  {connector.actions.length > 0 && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Actions</p>
                      <div className="flex flex-wrap gap-1">
                        {connector.actions.slice(0, 2).map(a => (
                          <Badge key={a} variant="outline" className="text-xs">{a}</Badge>
                        ))}
                        {connector.actions.length > 2 && (
                          <Badge variant="outline" className="text-xs">+{connector.actions.length - 2}</Badge>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                <Button 
                  className="w-full gap-2" 
                  variant={connectedIds.has(connector.id) ? "secondary" : "default"}
                  onClick={() => handleConnect(connector)}
                >
                  {connectedIds.has(connector.id) ? (
                    <>
                      <CheckCircle className="h-4 w-4" />
                      Connected
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4" />
                      Connect
                    </>
                  )}
                </Button>
              </Card>
            ))}
          </div>

          {filteredConnectors.length === 0 && (
            <Card className="p-12 text-center">
              <Search className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="font-semibold mb-2">No integrations found</h3>
              <p className="text-muted-foreground">Try adjusting your search or category filter</p>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Request integration */}
      <Card className="p-6 bg-muted/50">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold">Can't find what you need?</h3>
            <p className="text-sm text-muted-foreground">Request a new integration and we'll prioritize it</p>
          </div>
          <Button variant="outline" className="gap-2">
            Request Integration
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </Card>
    </div>
  );
};
