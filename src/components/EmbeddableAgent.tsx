import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Code2, Palette, Eye, Copy, Check, Sparkles } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface EmbeddableAgentProps {
  workflowId?: string;
}

const EmbeddableAgent = ({ workflowId }: EmbeddableAgentProps) => {
  const [agentName, setAgentName] = useState('My AI Assistant');
  const [agentDescription, setAgentDescription] = useState('How can I help you today?');
  const [primaryColor, setPrimaryColor] = useState('#8B5CF6');
  const [position, setPosition] = useState<'bottom-right' | 'bottom-left'>('bottom-right');
  const [theme, setTheme] = useState<'light' | 'dark' | 'auto'>('auto');
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const generateEmbedCode = () => {
    const config = {
      agentId: workflowId || 'demo-agent',
      name: agentName,
      description: agentDescription,
      primaryColor,
      position,
      theme
    };

    return `<!-- AI Agent Widget -->
<script>
  window.aiAgentConfig = ${JSON.stringify(config, null, 2)};
</script>
<script src="https://cdn.yourplatform.com/agent-widget.js" defer></script>
<div id="ai-agent-widget"></div>`;
  };

  const generateReactCode = () => {
    return `import { AIAgentWidget } from '@yourplatform/react-widget';

function App() {
  return (
    <AIAgentWidget
      agentId="${workflowId || 'demo-agent'}"
      name="${agentName}"
      description="${agentDescription}"
      primaryColor="${primaryColor}"
      position="${position}"
      theme="${theme}"
    />
  );
}`;
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    
    toast({
      title: "Code Copied",
      description: "Embed code has been copied to clipboard",
    });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Configuration Panel */}
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Palette className="h-5 w-5 text-primary" />
              <CardTitle>Agent Customization</CardTitle>
            </div>
            <CardDescription>
              Design your embeddable AI agent widget
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Basic Settings */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="agent-name">Agent Name</Label>
                <Input
                  id="agent-name"
                  value={agentName}
                  onChange={(e) => setAgentName(e.target.value)}
                  placeholder="My AI Assistant"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="agent-description">Welcome Message</Label>
                <Textarea
                  id="agent-description"
                  value={agentDescription}
                  onChange={(e) => setAgentDescription(e.target.value)}
                  placeholder="How can I help you today?"
                  className="resize-none"
                  rows={3}
                />
              </div>
            </div>

            {/* Appearance */}
            <div className="space-y-4 pt-4 border-t">
              <h4 className="font-semibold text-sm">Appearance</h4>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="primary-color">Primary Color</Label>
                  <div className="flex gap-2">
                    <Input
                      id="primary-color"
                      type="color"
                      value={primaryColor}
                      onChange={(e) => setPrimaryColor(e.target.value)}
                      className="w-16 h-10 p-1"
                    />
                    <Input
                      value={primaryColor}
                      onChange={(e) => setPrimaryColor(e.target.value)}
                      className="flex-1"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="theme">Theme</Label>
                  <Select value={theme} onValueChange={(v: any) => setTheme(v)}>
                    <SelectTrigger id="theme">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="light">Light</SelectItem>
                      <SelectItem value="dark">Dark</SelectItem>
                      <SelectItem value="auto">Auto</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Widget Position</Label>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant={position === 'bottom-right' ? 'default' : 'outline'}
                    onClick={() => setPosition('bottom-right')}
                    className="h-auto py-3"
                  >
                    Bottom Right
                  </Button>
                  <Button
                    variant={position === 'bottom-left' ? 'default' : 'outline'}
                    onClick={() => setPosition('bottom-left')}
                    className="h-auto py-3"
                  >
                    Bottom Left
                  </Button>
                </div>
              </div>
            </div>

            {/* Advanced Settings */}
            <div className="space-y-4 pt-4 border-t">
              <h4 className="font-semibold text-sm">Advanced Settings</h4>
              
              <div className="space-y-2">
                <Label htmlFor="workflow-id">Connected Workflow</Label>
                <Input
                  id="workflow-id"
                  value={workflowId || ''}
                  disabled
                  placeholder="No workflow connected"
                />
              </div>

              <div className="flex items-center gap-4 text-sm">
                <Badge variant="secondary">Analytics Enabled</Badge>
                <Badge variant="secondary">GDPR Compliant</Badge>
                <Badge variant="secondary">Encrypted</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Embed Code */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Code2 className="h-5 w-5 text-primary" />
              <CardTitle>Embed Code</CardTitle>
            </div>
            <CardDescription>
              Copy and paste this code into your website
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="html">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="html">HTML</TabsTrigger>
                <TabsTrigger value="react">React</TabsTrigger>
              </TabsList>

              <TabsContent value="html" className="space-y-3">
                <div className="relative">
                  <pre className="bg-muted p-4 rounded-lg text-xs overflow-x-auto">
                    <code>{generateEmbedCode()}</code>
                  </pre>
                  <Button
                    size="sm"
                    variant="secondary"
                    className="absolute top-2 right-2"
                    onClick={() => handleCopyCode(generateEmbedCode())}
                  >
                    {copied ? (
                      <>
                        <Check className="h-4 w-4 mr-2" />
                        Copied
                      </>
                    ) : (
                      <>
                        <Copy className="h-4 w-4 mr-2" />
                        Copy
                      </>
                    )}
                  </Button>
                </div>
              </TabsContent>

              <TabsContent value="react" className="space-y-3">
                <div className="relative">
                  <pre className="bg-muted p-4 rounded-lg text-xs overflow-x-auto">
                    <code>{generateReactCode()}</code>
                  </pre>
                  <Button
                    size="sm"
                    variant="secondary"
                    className="absolute top-2 right-2"
                    onClick={() => handleCopyCode(generateReactCode())}
                  >
                    {copied ? (
                      <>
                        <Check className="h-4 w-4 mr-2" />
                        Copied
                      </>
                    ) : (
                      <>
                        <Copy className="h-4 w-4 mr-2" />
                        Copy
                      </>
                    )}
                  </Button>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>

      {/* Preview Panel */}
      <Card className="lg:sticky lg:top-6 h-fit">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Eye className="h-5 w-5 text-primary" />
            <CardTitle>Live Preview</CardTitle>
          </div>
          <CardDescription>
            See how your agent will appear to users
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Mock Website Preview */}
          <div className="border rounded-lg overflow-hidden bg-background">
            {/* Mock Header */}
            <div className="bg-muted p-4 border-b">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded bg-primary/20" />
                <div className="space-y-1">
                  <div className="h-3 w-24 bg-primary/20 rounded" />
                  <div className="h-2 w-16 bg-primary/10 rounded" />
                </div>
              </div>
            </div>

            {/* Mock Content */}
            <div className="p-6 space-y-4 min-h-[400px] relative">
              <div className="space-y-2">
                <div className="h-4 bg-muted rounded w-3/4" />
                <div className="h-4 bg-muted rounded w-1/2" />
                <div className="h-4 bg-muted rounded w-5/6" />
              </div>

              {/* Agent Widget Preview */}
              <div
                className={`absolute bottom-6 ${
                  position === 'bottom-right' ? 'right-6' : 'left-6'
                } space-y-3`}
              >
                {/* Chat Bubble */}
                <div 
                  className="bg-card border shadow-lg rounded-2xl w-80 overflow-hidden animate-in fade-in slide-in-from-bottom-4"
                  style={{ borderColor: primaryColor + '40' }}
                >
                  <div 
                    className="p-4 text-white"
                    style={{ backgroundColor: primaryColor }}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                        <Sparkles className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="font-semibold">{agentName}</div>
                        <div className="text-xs opacity-90">Online</div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="p-4 space-y-3 bg-background">
                    <div className="bg-muted rounded-lg p-3 text-sm">
                      {agentDescription}
                    </div>
                  </div>

                  <div className="p-3 border-t bg-muted/50">
                    <div className="flex items-center gap-2">
                      <Input 
                        placeholder="Type your message..." 
                        className="text-sm"
                        disabled
                      />
                      <Button size="sm" style={{ backgroundColor: primaryColor }}>
                        Send
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Trigger Button */}
                <div className="flex justify-end">
                  <Button
                    size="lg"
                    className="rounded-full shadow-lg h-14 w-14 p-0"
                    style={{ backgroundColor: primaryColor }}
                  >
                    <Sparkles className="h-6 w-6" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default EmbeddableAgent;
