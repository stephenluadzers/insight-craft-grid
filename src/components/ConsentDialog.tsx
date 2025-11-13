import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { usePrivacy } from '@/contexts/PrivacyContext';
import { Shield, Database, Brain, Bug, Mail, Users } from 'lucide-react';

export function ConsentDialog() {
  const { showConsentDialog, setShowConsentDialog, updateConsent } = usePrivacy();
  const [preferences, setPreferences] = useState({
    essential: true,
    analytics: false,
    aiFeatures: false,
    crashReporting: false,
    marketing: false,
    thirdParty: false,
  });
  const [showAdvanced, setShowAdvanced] = useState(false);

  const handleAcceptAll = async () => {
    await updateConsent({
      essential: true,
      analytics: true,
      aiFeatures: true,
      crashReporting: true,
      marketing: true,
      thirdParty: false,
    });
    setShowConsentDialog(false);
  };

  const handleEssentialOnly = async () => {
    await updateConsent({
      essential: true,
      analytics: false,
      aiFeatures: false,
      crashReporting: false,
      marketing: false,
      thirdParty: false,
    });
    setShowConsentDialog(false);
  };

  const handleSavePreferences = async () => {
    await updateConsent(preferences);
    setShowConsentDialog(false);
  };

  const togglePreference = (key: keyof typeof preferences) => {
    if (key === 'essential') return; // Cannot disable essential
    setPreferences((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <Dialog open={showConsentDialog} onOpenChange={() => {}}>
      <DialogContent className="max-w-2xl" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="text-2xl">Privacy & Data Consent</DialogTitle>
          <DialogDescription>
            We respect your privacy. Choose how FlowFuse can use your data.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-4">
          <div className="space-y-6">
            {/* Essential */}
            <div className="flex items-start justify-between space-x-4">
              <div className="flex items-start space-x-3 flex-1">
                <Shield className="w-5 h-5 mt-1 text-primary" />
                <div className="space-y-1 flex-1">
                  <div className="flex items-center justify-between">
                    <Label className="text-base font-semibold">Essential (Required)</Label>
                    <Switch checked={true} disabled />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Required for core app functionality: authentication, saving workflows, and basic operations.
                  </p>
                </div>
              </div>
            </div>

            <Separator />

            {/* Analytics */}
            <div className="flex items-start justify-between space-x-4">
              <div className="flex items-start space-x-3 flex-1">
                <Database className="w-5 h-5 mt-1 text-blue-500" />
                <div className="space-y-1 flex-1">
                  <div className="flex items-center justify-between">
                    <Label className="text-base font-semibold cursor-pointer" htmlFor="analytics">
                      Analytics
                    </Label>
                    <Switch
                      id="analytics"
                      checked={preferences.analytics}
                      onCheckedChange={() => togglePreference('analytics')}
                    />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Help us improve FlowFuse by collecting anonymous usage statistics and performance metrics.
                  </p>
                </div>
              </div>
            </div>

            <Separator />

            {/* AI Features */}
            <div className="flex items-start justify-between space-x-4">
              <div className="flex items-start space-x-3 flex-1">
                <Brain className="w-5 h-5 mt-1 text-purple-500" />
                <div className="space-y-1 flex-1">
                  <div className="flex items-center justify-between">
                    <Label className="text-base font-semibold cursor-pointer" htmlFor="aiFeatures">
                      AI Features
                    </Label>
                    <Switch
                      id="aiFeatures"
                      checked={preferences.aiFeatures}
                      onCheckedChange={() => togglePreference('aiFeatures')}
                    />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Enable AI-powered workflow generation, optimization, and recommendations. Your data is processed
                    by Lovable AI with privacy protections.
                  </p>
                </div>
              </div>
            </div>

            <Separator />

            {/* Crash Reporting */}
            <div className="flex items-start justify-between space-x-4">
              <div className="flex items-start space-x-3 flex-1">
                <Bug className="w-5 h-5 mt-1 text-red-500" />
                <div className="space-y-1 flex-1">
                  <div className="flex items-center justify-between">
                    <Label className="text-base font-semibold cursor-pointer" htmlFor="crashReporting">
                      Crash Reporting
                    </Label>
                    <Switch
                      id="crashReporting"
                      checked={preferences.crashReporting}
                      onCheckedChange={() => togglePreference('crashReporting')}
                    />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Send anonymous crash reports to help us fix bugs faster. No personal data is included.
                  </p>
                </div>
              </div>
            </div>

            {showAdvanced && (
              <>
                <Separator />

                {/* Marketing */}
                <div className="flex items-start justify-between space-x-4">
                  <div className="flex items-start space-x-3 flex-1">
                    <Mail className="w-5 h-5 mt-1 text-green-500" />
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center justify-between">
                        <Label className="text-base font-semibold cursor-pointer" htmlFor="marketing">
                          Marketing Communications
                        </Label>
                        <Switch
                          id="marketing"
                          checked={preferences.marketing}
                          onCheckedChange={() => togglePreference('marketing')}
                        />
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Receive product updates, tips, and special offers via email. Unsubscribe anytime.
                      </p>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Third Party */}
                <div className="flex items-start justify-between space-x-4">
                  <div className="flex items-start space-x-3 flex-1">
                    <Users className="w-5 h-5 mt-1 text-orange-500" />
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center justify-between">
                        <Label className="text-base font-semibold cursor-pointer" htmlFor="thirdParty">
                          Third-Party Integrations
                        </Label>
                        <Switch
                          id="thirdParty"
                          checked={preferences.thirdParty}
                          onCheckedChange={() => togglePreference('thirdParty')}
                        />
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Allow third-party services you connect to access necessary workflow data. You control which
                        services.
                      </p>
                    </div>
                  </div>
                </div>
              </>
            )}

            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="w-full"
            >
              {showAdvanced ? 'Hide' : 'Show'} Advanced Options
            </Button>
          </div>
        </ScrollArea>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={handleEssentialOnly}>
            Essential Only
          </Button>
          {showAdvanced ? (
            <Button onClick={handleSavePreferences}>Save My Preferences</Button>
          ) : (
            <Button onClick={handleAcceptAll}>Accept All</Button>
          )}
        </DialogFooter>

        <p className="text-xs text-muted-foreground text-center mt-2">
          You can change these preferences anytime in Settings → Privacy.
          <br />
          By continuing, you agree to our Privacy Policy and Terms of Service.
        </p>
      </DialogContent>
    </Dialog>
  );
}
