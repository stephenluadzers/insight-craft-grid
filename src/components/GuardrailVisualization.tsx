import { Shield, AlertTriangle, CheckCircle, Info } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { ScrollArea } from "./ui/scroll-area";
import { Separator } from "./ui/separator";

interface GuardrailExplanation {
  guardrailId: string;
  ruleName: string;
  reason: string;
  triggeredBy: string[];
  complianceStandards: string[];
  severity: string;
  nodeId: string;
  timestamp: string;
}

interface GuardrailVisualizationProps {
  explanations: GuardrailExplanation[];
  complianceStandards: string[];
}

const severityConfig = {
  critical: { icon: AlertTriangle, color: 'text-red-500', bg: 'bg-red-500/10' },
  high: { icon: AlertTriangle, color: 'text-orange-500', bg: 'bg-orange-500/10' },
  medium: { icon: Info, color: 'text-yellow-500', bg: 'bg-yellow-500/10' },
  low: { icon: CheckCircle, color: 'text-blue-500', bg: 'bg-blue-500/10' },
};

export const GuardrailVisualization = ({ explanations, complianceStandards }: GuardrailVisualizationProps) => {
  if (!explanations || explanations.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Guardrail Analysis
          </CardTitle>
          <CardDescription>No guardrails detected in this workflow</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const criticalCount = explanations.filter(e => e.severity === 'critical').length;
  const highCount = explanations.filter(e => e.severity === 'high').length;

  return (
    <Card className="border-orange-500/20">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-orange-500" />
              Guardrail Protection Active
            </CardTitle>
            <CardDescription>
              {explanations.length} security layer{explanations.length !== 1 ? 's' : ''} automatically added
            </CardDescription>
          </div>
          <div className="flex gap-2">
            {complianceStandards.map(standard => (
              <Badge key={standard} variant="outline" className="border-orange-500/50">
                {standard}
              </Badge>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Summary Stats */}
          <div className="grid grid-cols-3 gap-4 p-4 bg-muted/50 rounded-lg">
            <div className="text-center">
              <div className="text-2xl font-bold text-red-500">{criticalCount}</div>
              <div className="text-xs text-muted-foreground">Critical</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-500">{highCount}</div>
              <div className="text-xs text-muted-foreground">High Priority</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">{explanations.length}</div>
              <div className="text-xs text-muted-foreground">Total Layers</div>
            </div>
          </div>

          <Separator />

          {/* Detailed Explanations */}
          <ScrollArea className="h-[400px] pr-4">
            <div className="space-y-3">
              {explanations.map((explanation, index) => {
                const config = severityConfig[explanation.severity as keyof typeof severityConfig] || severityConfig.medium;
                const Icon = config.icon;

                return (
                  <div
                    key={explanation.nodeId}
                    className={`p-4 rounded-lg border ${config.bg} border-border`}
                  >
                    <div className="flex items-start gap-3">
                      <Icon className={`w-5 h-5 mt-0.5 flex-shrink-0 ${config.color}`} />
                      <div className="flex-1 space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="font-semibold text-sm">{explanation.ruleName}</h4>
                          <Badge variant="outline" className={`${config.color} text-xs`}>
                            {explanation.severity}
                          </Badge>
                        </div>
                        
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          {explanation.reason}
                        </p>

                        {explanation.triggeredBy.length > 0 && (
                          <div className="flex flex-wrap gap-1 pt-2">
                            <span className="text-xs text-muted-foreground">Context:</span>
                            {explanation.triggeredBy.map(trigger => (
                              <Badge key={trigger} variant="secondary" className="text-xs">
                                {trigger}
                              </Badge>
                            ))}
                          </div>
                        )}

                        {explanation.complianceStandards.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            <span className="text-xs text-muted-foreground">Standards:</span>
                            {explanation.complianceStandards.map(standard => (
                              <Badge key={standard} variant="outline" className="text-xs border-orange-500/50">
                                {standard}
                              </Badge>
                            ))}
                          </div>
                        )}

                        <div className="text-xs text-muted-foreground pt-1">
                          Node ID: <code className="text-xs bg-muted px-1 rounded">{explanation.nodeId}</code>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>

          {/* Compliance Footer */}
          {complianceStandards.length > 0 && (
            <>
              <Separator />
              <div className="flex items-start gap-2 p-3 bg-green-500/10 rounded-lg border border-green-500/20">
                <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                <div className="text-sm">
                  <strong className="text-green-500">Compliance-Ready:</strong>
                  <p className="text-muted-foreground mt-1">
                    This workflow has been automatically configured to meet {complianceStandards.join(', ')} requirements.
                    All guardrails are production-ready and enterprise-compliant.
                  </p>
                </div>
              </div>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
};