import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { usePrivacy } from '@/contexts/PrivacyContext';
import { Brain, Shield, Database, AlertTriangle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';

export function AIUsageDisclosure() {
  const { showAIDisclosure, setShowAIDisclosure, updateConsent } = usePrivacy();

  const handleAccept = async () => {
    await updateConsent({ aiFeatures: true });
    setShowAIDisclosure(false);
  };

  const handleDecline = () => {
    setShowAIDisclosure(false);
  };

  return (
    <Dialog open={showAIDisclosure} onOpenChange={setShowAIDisclosure}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Brain className="w-6 h-6 text-purple-500" />
            AI Features & Data Usage
          </DialogTitle>
          <DialogDescription>
            Learn how FlowFuse uses AI to enhance your workflow automation experience
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-4">
          <div className="space-y-6">
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>Important:</strong> AI features involve processing your workflow data through external AI
                models. Please review the details below before proceeding.
              </AlertDescription>
            </Alert>

            {/* What AI Does */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Brain className="w-5 h-5 text-purple-500" />
                <h3 className="font-semibold">What AI Does</h3>
              </div>
              <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground ml-7">
                <li>Analyzes workflow structures to suggest optimizations</li>
                <li>Generates workflows from natural language descriptions</li>
                <li>Creates workflows from images, videos, and voice inputs</li>
                <li>Recommends integrations and improvements</li>
                <li>Predicts potential workflow failures</li>
                <li>Explains workflow logic in plain language</li>
              </ul>
            </div>

            <Separator />

            {/* Data Processed */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Database className="w-5 h-5 text-blue-500" />
                <h3 className="font-semibold">Data Processed by AI</h3>
              </div>
              <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground ml-7">
                <li>Workflow node configurations and connections</li>
                <li>Workflow names, descriptions, and metadata</li>
                <li>Execution history and performance metrics (when analyzing performance)</li>
                <li>User-provided text, images, or voice inputs (when creating workflows)</li>
                <li>Integration configurations (when suggesting improvements)</li>
              </ul>
              <p className="text-sm text-muted-foreground mt-2 ml-7">
                <strong>Not included:</strong> Passwords, API keys, authentication tokens, or sensitive credentials
                are never sent to AI models.
              </p>
            </div>

            <Separator />

            {/* AI Provider */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-green-500" />
                <h3 className="font-semibold">AI Provider & Privacy</h3>
              </div>
              <div className="space-y-2 text-sm text-muted-foreground ml-7">
                <p>
                  FlowFuse uses <strong>Lovable AI Gateway</strong>, which provides access to industry-leading AI
                  models including Google Gemini and OpenAI GPT.
                </p>
                <p className="font-semibold mt-2">Data Handling:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>All data is transmitted over encrypted HTTPS connections</li>
                  <li>AI models process data in-transit only (not stored by AI providers)</li>
                  <li>No data is used for training AI models</li>
                  <li>Processing occurs in secure, compliant data centers</li>
                  <li>You can disable AI features at any time in Settings</li>
                </ul>
              </div>
            </div>

            <Separator />

            {/* User Control */}
            <div className="space-y-2">
              <h3 className="font-semibold">Your Control</h3>
              <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground ml-7">
                <li>AI features are entirely optional - you can use FlowFuse without them</li>
                <li>Each AI action is triggered by you - nothing happens automatically</li>
                <li>You can review and modify all AI-generated content before saving</li>
                <li>Disable AI features anytime in Settings → Privacy → AI Features</li>
                <li>Request deletion of any data processed by AI</li>
              </ul>
            </div>

            <Separator />

            {/* Compliance */}
            <div className="space-y-2">
              <h3 className="font-semibold">Compliance & Standards</h3>
              <p className="text-sm text-muted-foreground ml-7">
                Our AI implementation complies with:
              </p>
              <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground ml-7">
                <li>Apple App Store Guidelines 4.7 & 4.7.2 (AI disclosure)</li>
                <li>Google Play AI transparency requirements</li>
                <li>GDPR data processing principles</li>
                <li>SOC 2 security standards</li>
              </ul>
            </div>

            <Alert className="mt-4">
              <AlertDescription className="text-xs">
                <strong>Transparency Note:</strong> All AI-generated workflows and content are clearly labeled with
                an "AI Generated" badge. You always know when AI has been involved in creating or modifying your
                workflows.
              </AlertDescription>
            </Alert>
          </div>
        </ScrollArea>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={handleDecline}>
            Decline (Use Without AI)
          </Button>
          <Button onClick={handleAccept}>Accept & Enable AI</Button>
        </DialogFooter>

        <p className="text-xs text-muted-foreground text-center mt-2">
          For more details, see our{' '}
          <a href="/legal" className="underline">
            AI Transparency & Fair-Use Statement
          </a>
        </p>
      </DialogContent>
    </Dialog>
  );
}
