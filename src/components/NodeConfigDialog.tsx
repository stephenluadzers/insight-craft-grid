import { useState, useEffect, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { Badge } from "./ui/badge";
import { WorkflowNodeData } from "@/types/workflow";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { GuardrailConfigPanel } from "./GuardrailConfigPanel";
import { supabase } from "@/integrations/supabase/client";
import { Shield, CheckCircle2, XCircle, Loader2, ExternalLink, AlertTriangle, Key } from "lucide-react";

const nodeConfigSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(100, "Title must be less than 100 characters"),
  description: z.string().trim().max(500, "Description must be less than 500 characters"),
  config: z.record(z.unknown()),
});

interface CredentialValidation {
  field: string;
  value: string;
  status: 'idle' | 'validating' | 'valid' | 'invalid' | 'unknown';
  message?: string;
  detectedService?: { id: string; name: string; matchedPattern: string };
  helpUrl?: string;
  helpText?: string;
}

// Fields that commonly contain API keys/credentials
const CREDENTIAL_FIELD_PATTERNS = [
  'api_key', 'apikey', 'api-key', 'apiKey',
  'token', 'access_token', 'accessToken', 'auth_token', 'authToken',
  'secret', 'secret_key', 'secretKey',
  'password', 'bearer',
  'key', 'credentials',
  'slack_token', 'openai_key', 'stripe_key',
  'bot_token', 'webhook_secret',
];

function isCredentialField(fieldName: string): boolean {
  const lower = fieldName.toLowerCase();
  return CREDENTIAL_FIELD_PATTERNS.some(p => lower.includes(p.toLowerCase()));
}

interface NodeConfigDialogProps {
  node: WorkflowNodeData | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (node: WorkflowNodeData) => void;
}

export const NodeConfigDialog = ({ node, open, onOpenChange, onSave }: NodeConfigDialogProps) => {
  const [title, setTitle] = useState(node?.title || "");
  const [description, setDescription] = useState(node?.description || "");
  const [config, setConfig] = useState(JSON.stringify(node?.config || {}, null, 2));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [credentialValidations, setCredentialValidations] = useState<Record<string, CredentialValidation>>({});
  const { toast } = useToast();

  // Sync state when node prop changes
  useEffect(() => {
    if (node) {
      setTitle(node.title || "");
      setDescription(node.description || "");
      setConfig(JSON.stringify(node.config || {}, null, 2));
      setErrors({});
      setCredentialValidations({});
    }
  }, [node]);

  // Auto-detect and validate credentials when config changes
  useEffect(() => {
    if (!node) return;
    
    try {
      const parsed = JSON.parse(config);
      const detectedCredentials: Record<string, CredentialValidation> = {};
      
      for (const [key, value] of Object.entries(parsed)) {
        if (typeof value === 'string' && value.length >= 5 && isCredentialField(key)) {
          // Don't re-validate if already validated with same value
          const existing = credentialValidations[key];
          if (existing && existing.value === value && existing.status !== 'idle') {
            detectedCredentials[key] = existing;
          } else {
            detectedCredentials[key] = {
              field: key,
              value: value,
              status: 'idle',
            };
          }
        }
      }
      
      setCredentialValidations(prev => {
        // Only update if there are actual changes
        const newKeys = Object.keys(detectedCredentials);
        const prevKeys = Object.keys(prev);
        if (newKeys.length === prevKeys.length && newKeys.every(k => prev[k]?.value === detectedCredentials[k]?.value)) {
          return prev;
        }
        return detectedCredentials;
      });
    } catch {
      // Invalid JSON, skip
    }
  }, [config, node]);

  const validateCredential = useCallback(async (fieldName: string, value: string) => {
    setCredentialValidations(prev => ({
      ...prev,
      [fieldName]: { ...prev[fieldName], status: 'validating', field: fieldName, value },
    }));

    try {
      const { data, error } = await supabase.functions.invoke('validate-credential', {
        body: {
          apiKey: value,
          nodeType: node?.type || '',
          nodeTitle: node?.title || title,
        },
      });

      if (error) throw error;

      setCredentialValidations(prev => ({
        ...prev,
        [fieldName]: {
          field: fieldName,
          value,
          status: data.valid === true ? 'valid' : data.valid === false ? 'invalid' : 'unknown',
          message: data.message || data.error,
          detectedService: data.detectedService,
          helpUrl: data.helpUrl,
          helpText: data.helpText,
        },
      }));

      if (data.valid && data.detectedService) {
        toast({
          title: `${data.detectedService.name} Key Verified`,
          description: data.message,
        });
      }
    } catch (err: any) {
      setCredentialValidations(prev => ({
        ...prev,
        [fieldName]: {
          field: fieldName,
          value,
          status: 'unknown',
          message: "Could not validate this credential. It may still work.",
        },
      }));
    }
  }, [node, title, toast]);

  // Auto-validate detected credentials
  useEffect(() => {
    for (const [key, cred] of Object.entries(credentialValidations)) {
      if (cred.status === 'idle' && cred.value.length >= 5) {
        validateCredential(key, cred.value);
      }
    }
  }, [credentialValidations, validateCredential]);

  const hasContextPlaceholders = config.includes('{{context.');
  const hasCredentials = Object.keys(credentialValidations).length > 0;

  const handleSave = () => {
    if (!node) return;
    setErrors({});
    
    try {
      const parsedConfig = JSON.parse(config);
      const configSize = new Blob([config]).size;
      if (configSize > 100000) throw new Error("Configuration too large (max 100KB)");
      
      const validation = nodeConfigSchema.safeParse({ title, description, config: parsedConfig });
      
      if (!validation.success) {
        const fieldErrors: Record<string, string> = {};
        validation.error.errors.forEach((err) => {
          if (err.path[0]) fieldErrors[err.path[0] as string] = err.message;
        });
        setErrors(fieldErrors);
        toast({ title: "Validation Error", description: "Please check the form for errors", variant: "destructive" });
        return;
      }
      
      // Warn if any credentials are invalid but don't block
      const invalidCreds = Object.values(credentialValidations).filter(c => c.status === 'invalid');
      if (invalidCreds.length > 0) {
        toast({
          title: "⚠️ Invalid Credentials Detected",
          description: `${invalidCreds.length} credential(s) failed validation but will be saved. Check them before running the workflow.`,
          variant: "destructive",
        });
      }
      
      onSave({
        ...node,
        title: validation.data.title,
        description: validation.data.description,
        config: validation.data.config,
      });
      onOpenChange(false);
    } catch (error: any) {
      if (error instanceof SyntaxError) {
        setErrors({ config: "Invalid JSON format" });
        toast({ title: "Invalid Configuration", description: "The configuration must be valid JSON", variant: "destructive" });
      } else {
        toast({ title: "Error", description: error.message || "Failed to save configuration", variant: "destructive" });
      }
    }
  };

  if (!node) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Configure Node
            {hasCredentials && (
              <Badge variant="outline" className="text-xs gap-1">
                <Key className="w-3 h-3" />
                {Object.keys(credentialValidations).length} credential{Object.keys(credentialValidations).length > 1 ? 's' : ''} detected
              </Badge>
            )}
          </DialogTitle>
          <DialogDescription>
            Update the node's title, description, and configuration. API keys are auto-detected and validated.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Enter node title" maxLength={100} />
            {errors.title && <p className="text-xs text-destructive">{errors.title}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Input id="description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Enter node description" maxLength={500} />
            {errors.description && <p className="text-xs text-destructive">{errors.description}</p>}
          </div>

          {/* Credential Validation Panel */}
          {hasCredentials && (
            <div className="space-y-2 p-3 rounded-lg border border-border bg-muted/30">
              <div className="flex items-center gap-2 mb-2">
                <Shield className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium">Credential Validation</span>
              </div>
              {Object.values(credentialValidations).map((cred) => (
                <div key={cred.field} className="flex flex-col gap-1 p-2 rounded-md bg-background border border-border/50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <code className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono">{cred.field}</code>
                      {cred.detectedService && (
                        <Badge variant="secondary" className="text-xs">
                          {cred.detectedService.name}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      {cred.status === 'validating' && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
                      {cred.status === 'valid' && <CheckCircle2 className="w-4 h-4 text-green-500" />}
                      {cred.status === 'invalid' && <XCircle className="w-4 h-4 text-destructive" />}
                      {cred.status === 'unknown' && <AlertTriangle className="w-4 h-4 text-yellow-500" />}
                    </div>
                  </div>
                  {cred.message && (
                    <p className="text-xs text-muted-foreground">{cred.message}</p>
                  )}
                  {cred.status === 'invalid' && cred.helpUrl && (
                    <div className="flex items-center gap-2 mt-1">
                      <a
                        href={cred.helpUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-primary hover:underline flex items-center gap-1"
                      >
                        <ExternalLink className="w-3 h-3" />
                        Get a new key
                      </a>
                      {cred.helpText && (
                        <span className="text-xs text-muted-foreground">— {cred.helpText}</span>
                      )}
                    </div>
                  )}
                  {cred.status === 'invalid' && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="self-start text-xs h-6 px-2 mt-1"
                      onClick={() => validateCredential(cred.field, cred.value)}
                    >
                      <Loader2 className="w-3 h-3 mr-1" /> Re-validate
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}

          {node.type === 'guardrail' ? (
            <GuardrailConfigPanel
              config={JSON.parse(config)}
              onChange={(newConfig) => setConfig(JSON.stringify(newConfig, null, 2))}
            />
          ) : (
            <div className="space-y-2">
              <Label htmlFor="config">Configuration (JSON)</Label>
              {hasContextPlaceholders && (
                <div className="text-sm text-muted-foreground mb-2 p-2 glass rounded-md border border-border/50">
                  💡 <span className="font-semibold">Dynamic Data:</span> This config uses <code className="text-xs bg-muted px-1 py-0.5 rounded">{'{{context.field}}'}</code> syntax - values will be replaced with actual customer data during execution
                </div>
              )}
              <Textarea
                id="config"
                value={config}
                onChange={(e) => setConfig(e.target.value)}
                placeholder='{"key": "value"}'
                className="font-mono text-sm"
                rows={10}
              />
              {errors.config && <p className="text-xs text-destructive">{errors.config}</p>}
              <p className="text-xs text-muted-foreground">
                API keys in fields like <code className="bg-muted px-1 rounded">api_key</code>, <code className="bg-muted px-1 rounded">token</code>, <code className="bg-muted px-1 rounded">secret</code> are auto-detected and validated against their service.
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave}>Save Changes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
