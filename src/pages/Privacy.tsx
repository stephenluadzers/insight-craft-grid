import { useState } from 'react';
import { AppSidebar } from '@/components/AppSidebar';
import { SidebarProvider } from '@/components/ui/sidebar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { usePrivacy } from '@/contexts/PrivacyContext';
import { DataDeletionDialog } from '@/components/DataDeletionDialog';
import { useToast } from '@/hooks/use-toast';
import {
  Shield,
  Download,
  Trash2,
  Database,
  Brain,
  Bug,
  Mail,
  Users,
  FileText,
  Clock,
  ExternalLink,
} from 'lucide-react';

export default function Privacy() {
  const { consent, updateConsent, retentionDays, setRetentionDays, exportUserData } = usePrivacy();
  const { toast } = useToast();
  const [showDeletionDialog, setShowDeletionDialog] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const handleToggle = async (key: string) => {
    if (key === 'essential') return; // Cannot disable essential
    await updateConsent({ [key]: !consent?.[key as keyof typeof consent] });
    toast({
      title: 'Preference Updated',
      description: 'Your privacy preferences have been saved.',
    });
  };

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const blob = await exportUserData();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `flowfuse-data-export-${new Date().toISOString()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: 'Export Complete',
        description: 'Your data has been exported successfully.',
      });
    } catch (error) {
      toast({
        title: 'Export Failed',
        description: error instanceof Error ? error.message : 'An error occurred during export',
        variant: 'destructive',
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleRetentionChange = async (value: string) => {
    await setRetentionDays(parseInt(value, 10));
    toast({
      title: 'Retention Period Updated',
      description: `Execution history will be retained for ${value} days.`,
    });
  };

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <AppSidebar />
        <main className="flex-1 p-6 overflow-auto">
          <div className="max-w-4xl mx-auto space-y-6">
            <div>
              <h1 className="text-3xl font-bold mb-2">Privacy Settings</h1>
              <p className="text-muted-foreground">
                Manage your privacy preferences and control how FlowFuse uses your data.
              </p>
            </div>

            {/* Data Collection Preferences */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="w-5 h-5" />
                  Data Collection Preferences
                </CardTitle>
                <CardDescription>
                  Choose what data FlowFuse can collect and how it's used. Changes take effect immediately.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Essential */}
                <div className="flex items-start justify-between">
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2">
                      <Shield className="w-4 h-4 text-primary" />
                      <Label className="font-semibold">Essential (Required)</Label>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Required for core functionality: authentication, workflow management, and basic operations.
                    </p>
                  </div>
                  <Switch checked={true} disabled />
                </div>

                <Separator />

                {/* Analytics */}
                <div className="flex items-start justify-between">
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2">
                      <Database className="w-4 h-4 text-blue-500" />
                      <Label className="font-semibold cursor-pointer" htmlFor="analytics-switch">
                        Analytics
                      </Label>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Anonymous usage statistics and performance metrics to improve FlowFuse.
                    </p>
                  </div>
                  <Switch
                    id="analytics-switch"
                    checked={consent?.analytics ?? false}
                    onCheckedChange={() => handleToggle('analytics')}
                  />
                </div>

                <Separator />

                {/* AI Features */}
                <div className="flex items-start justify-between">
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2">
                      <Brain className="w-4 h-4 text-purple-500" />
                      <Label className="font-semibold cursor-pointer" htmlFor="ai-switch">
                        AI Features
                      </Label>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      AI-powered workflow generation, optimization, and recommendations via Lovable AI.
                    </p>
                  </div>
                  <Switch
                    id="ai-switch"
                    checked={consent?.aiFeatures ?? false}
                    onCheckedChange={() => handleToggle('aiFeatures')}
                  />
                </div>

                <Separator />

                {/* Crash Reporting */}
                <div className="flex items-start justify-between">
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2">
                      <Bug className="w-4 h-4 text-red-500" />
                      <Label className="font-semibold cursor-pointer" htmlFor="crash-switch">
                        Crash Reporting
                      </Label>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Anonymous crash reports to help fix bugs faster.
                    </p>
                  </div>
                  <Switch
                    id="crash-switch"
                    checked={consent?.crashReporting ?? false}
                    onCheckedChange={() => handleToggle('crashReporting')}
                  />
                </div>

                <Separator />

                {/* Marketing */}
                <div className="flex items-start justify-between">
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4 text-green-500" />
                      <Label className="font-semibold cursor-pointer" htmlFor="marketing-switch">
                        Marketing Communications
                      </Label>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Product updates, tips, and special offers via email.
                    </p>
                  </div>
                  <Switch
                    id="marketing-switch"
                    checked={consent?.marketing ?? false}
                    onCheckedChange={() => handleToggle('marketing')}
                  />
                </div>

                <Separator />

                {/* Third Party */}
                <div className="flex items-start justify-between">
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-orange-500" />
                      <Label className="font-semibold cursor-pointer" htmlFor="thirdparty-switch">
                        Third-Party Integrations
                      </Label>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Allow connected services to access necessary workflow data.
                    </p>
                  </div>
                  <Switch
                    id="thirdparty-switch"
                    checked={consent?.thirdParty ?? false}
                    onCheckedChange={() => handleToggle('thirdParty')}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Data Retention */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="w-5 h-5" />
                  Data Retention
                </CardTitle>
                <CardDescription>
                  Control how long FlowFuse retains your execution history and logs.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="retention">Execution History Retention Period</Label>
                  <Select value={retentionDays.toString()} onValueChange={handleRetentionChange}>
                    <SelectTrigger id="retention">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="7">7 days</SelectItem>
                      <SelectItem value="30">30 days (Recommended)</SelectItem>
                      <SelectItem value="90">90 days</SelectItem>
                      <SelectItem value="365">1 year</SelectItem>
                      <SelectItem value="999999">Indefinite</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-sm text-muted-foreground">
                    Execution history older than the selected period will be automatically deleted. Workflows are
                    retained indefinitely unless you delete them manually.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Data Management */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="w-5 h-5" />
                  Data Management
                </CardTitle>
                <CardDescription>Export or delete your data. These actions comply with GDPR and CCPA.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-start justify-between">
                  <div className="space-y-1 flex-1">
                    <Label className="font-semibold">Export Your Data</Label>
                    <p className="text-sm text-muted-foreground">
                      Download all your workflows, execution history, and profile data in JSON format.
                    </p>
                  </div>
                  <Button onClick={handleExport} disabled={isExporting}>
                    <Download className="mr-2 h-4 w-4" />
                    {isExporting ? 'Exporting...' : 'Export Data'}
                  </Button>
                </div>

                <Separator />

                <div className="flex items-start justify-between">
                  <div className="space-y-1 flex-1">
                    <Label className="font-semibold text-destructive">Delete Your Data</Label>
                    <p className="text-sm text-muted-foreground">
                      Permanently delete your execution history, workflows, or entire account. This cannot be undone.
                    </p>
                  </div>
                  <Button variant="destructive" onClick={() => setShowDeletionDialog(true)}>
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete Data
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Legal & Documentation */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Legal & Documentation
                </CardTitle>
                <CardDescription>Review our privacy policies and compliance documentation.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button variant="outline" className="w-full justify-start" asChild>
                  <a href="/legal" target="_blank">
                    <FileText className="mr-2 h-4 w-4" />
                    Privacy Policy & Terms
                    <ExternalLink className="ml-auto h-4 w-4" />
                  </a>
                </Button>
                <Button variant="outline" className="w-full justify-start" asChild>
                  <a href="/legal#ai-transparency" target="_blank">
                    <Brain className="mr-2 h-4 w-4" />
                    AI Transparency & Fair-Use Statement
                    <ExternalLink className="ml-auto h-4 w-4" />
                  </a>
                </Button>
                <Button variant="outline" className="w-full justify-start" asChild>
                  <a href="mailto:privacy@remora.dev">
                    <Mail className="mr-2 h-4 w-4" />
                    Contact Privacy Team
                  </a>
                </Button>
              </CardContent>
            </Card>

            <div className="text-sm text-muted-foreground">
              <p>
                Last updated: {consent?.timestamp ? new Date(consent.timestamp).toLocaleDateString() : 'N/A'}
              </p>
              <p className="mt-1">Consent Version: {consent?.version ?? 'N/A'}</p>
            </div>
          </div>
        </main>
      </div>

      <DataDeletionDialog open={showDeletionDialog} onOpenChange={setShowDeletionDialog} />
    </SidebarProvider>
  );
}
