import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Calendar, Clock, Webhook, Mail, MessageSquare, Zap, Globe } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface TriggerConfigurationProps {
  workflowId: string;
  onTriggerCreated: (trigger: any) => void;
}

const TriggerConfiguration = ({ workflowId, onTriggerCreated }: TriggerConfigurationProps) => {
  const [triggerType, setTriggerType] = useState('webhook');
  const [isEnabled, setIsEnabled] = useState(true);
  const { toast } = useToast();

  // Schedule settings
  const [scheduleFrequency, setScheduleFrequency] = useState('daily');
  const [scheduleTime, setScheduleTime] = useState('09:00');
  const [scheduleTimezone, setScheduleTimezone] = useState('UTC');

  // Webhook settings
  const [webhookPath, setWebhookPath] = useState('');
  const [webhookMethod, setWebhookMethod] = useState('POST');

  // Email settings
  const [emailAddress, setEmailAddress] = useState('');
  const [emailSubjectFilter, setEmailSubjectFilter] = useState('');

  // Chat settings
  const [chatChannelId, setChatChannelId] = useState('');
  const [chatKeywords, setChatKeywords] = useState('');

  const triggerTypes = [
    {
      id: 'webhook',
      name: 'Webhook',
      description: 'Trigger via HTTP request',
      icon: Webhook,
      color: 'text-blue-500'
    },
    {
      id: 'schedule',
      name: 'Schedule',
      description: 'Run on a timer or cron schedule',
      icon: Clock,
      color: 'text-purple-500'
    },
    {
      id: 'email',
      name: 'Email',
      description: 'Trigger when email received',
      icon: Mail,
      color: 'text-green-500'
    },
    {
      id: 'chat',
      name: 'Chat Message',
      description: 'Respond to chat messages',
      icon: MessageSquare,
      color: 'text-orange-500'
    },
    {
      id: 'form',
      name: 'Form Submit',
      description: 'Trigger when form is submitted',
      icon: Globe,
      color: 'text-pink-500'
    },
    {
      id: 'event',
      name: 'Custom Event',
      description: 'Trigger on application events',
      icon: Zap,
      color: 'text-yellow-500'
    }
  ];

  const handleCreateTrigger = () => {
    const trigger: any = {
      workflow_id: workflowId,
      trigger_type: triggerType,
      is_enabled: isEnabled,
      config: {}
    };

    // Add type-specific configuration
    switch (triggerType) {
      case 'schedule':
        trigger.config = {
          frequency: scheduleFrequency,
          time: scheduleTime,
          timezone: scheduleTimezone
        };
        break;
      case 'webhook':
        trigger.config = {
          path: webhookPath,
          method: webhookMethod
        };
        break;
      case 'email':
        trigger.config = {
          email: emailAddress,
          subject_filter: emailSubjectFilter
        };
        break;
      case 'chat':
        trigger.config = {
          channel_id: chatChannelId,
          keywords: chatKeywords.split(',').map(k => k.trim())
        };
        break;
    }

    onTriggerCreated(trigger);
    
    toast({
      title: "Trigger Created",
      description: `${triggerTypes.find(t => t.id === triggerType)?.name} trigger has been configured`,
    });
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Workflow Triggers</CardTitle>
            <CardDescription>
              Configure how and when your workflow should execute
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Label htmlFor="trigger-enabled">Enabled</Label>
            <Switch
              id="trigger-enabled"
              checked={isEnabled}
              onCheckedChange={setIsEnabled}
            />
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Trigger Type Selection */}
        <div className="space-y-3">
          <Label>Trigger Type</Label>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {triggerTypes.map((type) => {
              const Icon = type.icon;
              return (
                <Button
                  key={type.id}
                  variant={triggerType === type.id ? 'default' : 'outline'}
                  className="h-auto py-4 flex-col gap-2"
                  onClick={() => setTriggerType(type.id)}
                >
                  <Icon className={`h-5 w-5 ${triggerType === type.id ? 'text-primary-foreground' : type.color}`} />
                  <div className="text-center">
                    <div className="font-semibold text-sm">{type.name}</div>
                    <div className="text-xs opacity-75">{type.description}</div>
                  </div>
                </Button>
              );
            })}
          </div>
        </div>

        {/* Trigger Configuration */}
        <div className="border rounded-lg p-4 space-y-4">
          <div className="flex items-center gap-2">
            <Badge variant="secondary">Configuration</Badge>
          </div>

          {triggerType === 'schedule' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="frequency">Frequency</Label>
                  <Select value={scheduleFrequency} onValueChange={setScheduleFrequency}>
                    <SelectTrigger id="frequency">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="hourly">Every Hour</SelectItem>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                      <SelectItem value="custom">Custom Cron</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="time">Time</Label>
                  <Input
                    id="time"
                    type="time"
                    value={scheduleTime}
                    onChange={(e) => setScheduleTime(e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="timezone">Timezone</Label>
                <Select value={scheduleTimezone} onValueChange={setScheduleTimezone}>
                  <SelectTrigger id="timezone">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="UTC">UTC</SelectItem>
                    <SelectItem value="America/New_York">Eastern Time</SelectItem>
                    <SelectItem value="America/Chicago">Central Time</SelectItem>
                    <SelectItem value="America/Los_Angeles">Pacific Time</SelectItem>
                    <SelectItem value="Europe/London">London</SelectItem>
                    <SelectItem value="Asia/Tokyo">Tokyo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {triggerType === 'webhook' && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="webhook-path">Webhook Path</Label>
                <Input
                  id="webhook-path"
                  placeholder="/api/trigger/my-workflow"
                  value={webhookPath}
                  onChange={(e) => setWebhookPath(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  This will be accessible at: https://your-domain.com{webhookPath}
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="webhook-method">HTTP Method</Label>
                <Select value={webhookMethod} onValueChange={setWebhookMethod}>
                  <SelectTrigger id="webhook-method">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="GET">GET</SelectItem>
                    <SelectItem value="POST">POST</SelectItem>
                    <SelectItem value="PUT">PUT</SelectItem>
                    <SelectItem value="PATCH">PATCH</SelectItem>
                    <SelectItem value="DELETE">DELETE</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {triggerType === 'email' && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Monitored Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="workflow@yourdomain.com"
                  value={emailAddress}
                  onChange={(e) => setEmailAddress(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="subject-filter">Subject Filter (Optional)</Label>
                <Input
                  id="subject-filter"
                  placeholder="e.g., [URGENT] or contains keyword"
                  value={emailSubjectFilter}
                  onChange={(e) => setEmailSubjectFilter(e.target.value)}
                />
              </div>
            </div>
          )}

          {triggerType === 'chat' && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="channel">Channel/Room ID</Label>
                <Input
                  id="channel"
                  placeholder="general-chat"
                  value={chatChannelId}
                  onChange={(e) => setChatChannelId(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="keywords">Trigger Keywords (comma-separated)</Label>
                <Input
                  id="keywords"
                  placeholder="help, support, urgent"
                  value={chatKeywords}
                  onChange={(e) => setChatKeywords(e.target.value)}
                />
              </div>
            </div>
          )}

          {triggerType === 'form' && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Form Integration</Label>
                <p className="text-sm text-muted-foreground">
                  Embed this form on your website to trigger workflows on submission.
                </p>
                <div className="bg-muted p-3 rounded text-xs font-mono">
                  {'<form action="/api/workflows/trigger" method="POST">...</form>'}
                </div>
              </div>
            </div>
          )}

          {triggerType === 'event' && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="event-name">Event Name</Label>
                <Input
                  id="event-name"
                  placeholder="user.created, order.completed"
                />
              </div>
              <div className="space-y-2">
                <Label>Event Source</Label>
                <Select defaultValue="application">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="application">Application Events</SelectItem>
                    <SelectItem value="database">Database Changes</SelectItem>
                    <SelectItem value="external">External System</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
        </div>

        <Button onClick={handleCreateTrigger} className="w-full" size="lg">
          <Zap className="h-4 w-4 mr-2" />
          Create Trigger
        </Button>
      </CardContent>
    </Card>
  );
};

export default TriggerConfiguration;
