import { Label } from "./ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { Shield, Lock, CheckCircle, AlertTriangle } from "lucide-react";

interface GuardrailConfigPanelProps {
  config: any;
  onChange: (config: any) => void;
}

export const GuardrailConfigPanel = ({ config, onChange }: GuardrailConfigPanelProps) => {
  const guardrailType = config.guardrailType || 'validation';

  const updateConfig = (key: string, value: any) => {
    onChange({ ...config, [key]: value });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-orange-500">
        <Shield className="w-5 h-5" />
        <h3 className="font-semibold">Guardrail Configuration</h3>
      </div>

      <div className="space-y-2">
        <Label>Guardrail Type</Label>
        <Select value={guardrailType} onValueChange={(value) => updateConfig('guardrailType', value)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="rate_limit">Rate Limiting</SelectItem>
            <SelectItem value="input_validation">Input Validation</SelectItem>
            <SelectItem value="output_validation">Output Validation</SelectItem>
            <SelectItem value="security_check">Security Check</SelectItem>
            <SelectItem value="compliance_check">Compliance Check</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {guardrailType === 'rate_limit' && (
        <div className="space-y-3 p-4 bg-muted/50 rounded-lg">
          <div className="space-y-2">
            <Label>Request Limit</Label>
            <Input
              type="number"
              value={config.limit || 100}
              onChange={(e) => updateConfig('limit', parseInt(e.target.value))}
              placeholder="100"
            />
          </div>
          <div className="space-y-2">
            <Label>Time Window (seconds)</Label>
            <Input
              type="number"
              value={config.window || 60}
              onChange={(e) => updateConfig('window', parseInt(e.target.value))}
              placeholder="60"
            />
          </div>
        </div>
      )}

      {guardrailType === 'input_validation' && (
        <div className="space-y-3 p-4 bg-muted/50 rounded-lg">
          <Label>Validation Rules (JSON)</Label>
          <Textarea
            value={JSON.stringify(config.rules || {}, null, 2)}
            onChange={(e) => {
              try {
                updateConfig('rules', JSON.parse(e.target.value));
              } catch {}
            }}
            placeholder='{"email": {"required": true, "type": "string", "pattern": "^[^@]+@[^@]+$"}}'
            className="font-mono text-sm"
            rows={6}
          />
          <p className="text-xs text-muted-foreground">
            Supported rules: required, type, minLength, maxLength, pattern
          </p>
        </div>
      )}

      {guardrailType === 'output_validation' && (
        <div className="space-y-3 p-4 bg-muted/50 rounded-lg">
          <Label>Expected Schema (JSON)</Label>
          <Textarea
            value={JSON.stringify(config.schema || {}, null, 2)}
            onChange={(e) => {
              try {
                updateConfig('schema', JSON.parse(e.target.value));
              } catch {}
            }}
            placeholder='{"status": "string", "data": "object"}'
            className="font-mono text-sm"
            rows={4}
          />
        </div>
      )}

      {guardrailType === 'security_check' && (
        <div className="space-y-3 p-4 bg-muted/50 rounded-lg">
          <Label>Security Checks</Label>
          <div className="space-y-2">
            {['no_sql_injection', 'no_xss', 'sanitize_input'].map((check) => (
              <label key={check} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={(config.checks || []).includes(check)}
                  onChange={(e) => {
                    const checks = config.checks || [];
                    if (e.target.checked) {
                      updateConfig('checks', [...checks, check]);
                    } else {
                      updateConfig('checks', checks.filter((c: string) => c !== check));
                    }
                  }}
                  className="rounded"
                />
                <span className="text-sm">{check.replace(/_/g, ' ').toUpperCase()}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      {guardrailType === 'compliance_check' && (
        <div className="space-y-3 p-4 bg-muted/50 rounded-lg">
          <Label>Compliance Standards</Label>
          <div className="space-y-2">
            {['gdpr', 'pci_dss', 'hipaa'].map((standard) => (
              <label key={standard} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={(config.standards || []).includes(standard)}
                  onChange={(e) => {
                    const standards = config.standards || [];
                    if (e.target.checked) {
                      updateConfig('standards', [...standards, standard]);
                    } else {
                      updateConfig('standards', standards.filter((s: string) => s !== standard));
                    }
                  }}
                  className="rounded"
                />
                <span className="text-sm font-mono">{standard.toUpperCase()}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      <div className="pt-4 border-t">
        <div className="flex items-start gap-2 text-xs text-muted-foreground">
          <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <p>
            Guardrails provide safety checks and validation. If checks fail, workflow execution will be blocked.
          </p>
        </div>
      </div>
    </div>
  );
};