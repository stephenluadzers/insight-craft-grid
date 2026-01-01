import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import {
  Shield,
  Zap,
  DollarSign,
  RefreshCw,
  Scale,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Scan,
  Download,
  Wrench,
  TrendingUp,
} from 'lucide-react';
import { WorkflowNodeData } from '@/types/workflow';
import { scanWorkflow, calculateScanImpactOnROI, generateScanReport, ScanResult, ScanFinding } from '@/lib/workflowScanFramework';
import { toast } from 'sonner';

interface WorkflowScanPanelProps {
  nodes: WorkflowNodeData[];
  workflowName: string;
  baseROI?: {
    annualSavings: number;
    roiPercent: number;
    breakEvenDays: number;
  };
}

const categoryIcons = {
  performance: Zap,
  cost: DollarSign,
  reliability: RefreshCw,
  security: Shield,
  scalability: Scale,
};

const severityColors = {
  critical: 'bg-red-500',
  high: 'bg-orange-500',
  medium: 'bg-yellow-500',
  low: 'bg-blue-500',
  info: 'bg-gray-500',
};

const severityBadgeVariants = {
  critical: 'destructive' as const,
  high: 'destructive' as const,
  medium: 'secondary' as const,
  low: 'outline' as const,
  info: 'outline' as const,
};

export function WorkflowScanPanel({ nodes, workflowName, baseROI }: WorkflowScanPanelProps) {
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [roiImpact, setRoiImpact] = useState<ReturnType<typeof calculateScanImpactOnROI> | null>(null);

  const runScan = () => {
    setIsScanning(true);
    
    // Simulate scan delay for UX
    setTimeout(() => {
      const result = scanWorkflow(nodes, workflowName);
      setScanResult(result);
      
      if (baseROI) {
        const impact = calculateScanImpactOnROI(result, baseROI);
        setRoiImpact(impact);
      }
      
      setIsScanning(false);
      toast.success(`Scan complete: ${result.findings.length} findings`);
    }, 1500);
  };

  const downloadReport = () => {
    if (!scanResult) return;
    
    const report = generateScanReport(scanResult);
    const blob = new Blob([report], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${workflowName}-scan-report.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('Report downloaded');
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreIcon = (score: number) => {
    if (score >= 80) return <CheckCircle className="h-5 w-5 text-green-600" />;
    if (score >= 60) return <AlertTriangle className="h-5 w-5 text-yellow-600" />;
    return <XCircle className="h-5 w-5 text-red-600" />;
  };

  return (
    <div className="space-y-6">
      {/* Scan Controls */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Scan className="h-5 w-5" />
                Workflow Scan Framework
              </CardTitle>
              <CardDescription>
                Analyze your workflow for optimization opportunities
              </CardDescription>
            </div>
            <div className="flex gap-2">
              {scanResult && (
                <Button variant="outline" size="sm" onClick={downloadReport}>
                  <Download className="h-4 w-4 mr-2" />
                  Download Report
                </Button>
              )}
              <Button onClick={runScan} disabled={isScanning}>
                {isScanning ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Scanning...
                  </>
                ) : (
                  <>
                    <Scan className="h-4 w-4 mr-2" />
                    Run Scan
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {scanResult && (
        <>
          {/* Overall Score */}
          <Card className={`border-2 ${scanResult.overallScore >= 80 ? 'border-green-500/30' : scanResult.overallScore >= 60 ? 'border-yellow-500/30' : 'border-red-500/30'}`}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  {getScoreIcon(scanResult.overallScore)}
                  <div>
                    <h3 className="text-2xl font-bold">Overall Score</h3>
                    <p className="text-sm text-muted-foreground">
                      {scanResult.findings.length} issues found
                    </p>
                  </div>
                </div>
                <div className={`text-5xl font-bold ${getScoreColor(scanResult.overallScore)}`}>
                  {scanResult.overallScore}
                </div>
              </div>
              
              <Progress 
                value={scanResult.overallScore} 
                className="h-3"
              />
              
              {/* Category Scores */}
              <div className="grid grid-cols-5 gap-4 mt-6">
                {Object.entries(scanResult.categoryScores).map(([category, score]) => {
                  const Icon = categoryIcons[category as keyof typeof categoryIcons];
                  return (
                    <div key={category} className="text-center">
                      <div className={`flex items-center justify-center gap-1 ${getScoreColor(score)}`}>
                        <Icon className="h-4 w-4" />
                        <span className="text-lg font-bold">{score}</span>
                      </div>
                      <p className="text-xs text-muted-foreground capitalize">{category}</p>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          <Tabs defaultValue="findings" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="findings">
                Findings ({scanResult.findings.length})
              </TabsTrigger>
              <TabsTrigger value="optimization">Optimization Potential</TabsTrigger>
              <TabsTrigger value="roi-impact">ROI Impact</TabsTrigger>
            </TabsList>

            <TabsContent value="findings" className="space-y-4">
              {scanResult.findings.length === 0 ? (
                <Card>
                  <CardContent className="pt-6 text-center">
                    <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-3" />
                    <h3 className="text-lg font-semibold">No Issues Found</h3>
                    <p className="text-muted-foreground">
                      Your workflow passes all optimization checks
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <Accordion type="multiple" className="space-y-2">
                  {scanResult.findings.map((finding) => (
                    <AccordionItem 
                      key={finding.id} 
                      value={finding.id}
                      className="border rounded-lg px-4"
                    >
                      <AccordionTrigger className="hover:no-underline">
                        <div className="flex items-center gap-3">
                          <div className={`w-2 h-2 rounded-full ${severityColors[finding.severity]}`} />
                          <Badge variant={severityBadgeVariants[finding.severity]} className="uppercase text-xs">
                            {finding.severity}
                          </Badge>
                          <span className="font-mono text-sm text-muted-foreground">
                            {finding.id}
                          </span>
                          <span className="font-medium">{finding.title}</span>
                          {finding.autoFixable && (
                            <Badge variant="outline" className="text-xs">
                              <Wrench className="h-3 w-3 mr-1" />
                              Auto-fixable
                            </Badge>
                          )}
                        </div>
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="space-y-4 pb-2">
                          <p className="text-muted-foreground">{finding.description}</p>
                          
                          <div className="grid grid-cols-3 gap-4">
                            <div className="p-3 bg-muted rounded-lg">
                              <div className="flex items-center gap-2 text-sm font-medium mb-1">
                                <DollarSign className="h-4 w-4" />
                                Cost Impact
                              </div>
                              <p className="text-lg font-bold">
                                ${(finding.impact.costImpact / 100).toFixed(2)}/exec
                              </p>
                            </div>
                            <div className="p-3 bg-muted rounded-lg">
                              <div className="flex items-center gap-2 text-sm font-medium mb-1">
                                <Zap className="h-4 w-4" />
                                Time Impact
                              </div>
                              <p className="text-lg font-bold">
                                {finding.impact.timeImpact}ms
                              </p>
                            </div>
                            <div className="p-3 bg-muted rounded-lg">
                              <div className="flex items-center gap-2 text-sm font-medium mb-1">
                                <RefreshCw className="h-4 w-4" />
                                Reliability
                              </div>
                              <p className={`text-lg font-bold ${finding.impact.reliabilityImpact < 0 ? 'text-red-600' : 'text-green-600'}`}>
                                {finding.impact.reliabilityImpact}%
                              </p>
                            </div>
                          </div>

                          <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg">
                            <h4 className="font-semibold mb-2 flex items-center gap-2">
                              <TrendingUp className="h-4 w-4" />
                              Recommendation
                            </h4>
                            <p className="text-sm">{finding.recommendation}</p>
                          </div>

                          {finding.affectedNodes.length > 0 && (
                            <div className="text-sm text-muted-foreground">
                              Affected nodes: {finding.affectedNodes.join(', ')}
                            </div>
                          )}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              )}
            </TabsContent>

            <TabsContent value="optimization" className="space-y-4">
              <div className="grid md:grid-cols-3 gap-4">
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-3 mb-2">
                      <DollarSign className="h-5 w-5 text-green-600" />
                      <span className="text-sm font-medium">Potential Cost Savings</span>
                    </div>
                    <p className="text-3xl font-bold text-green-600">
                      ${scanResult.optimizationPotential.costSavingsPerYear.toLocaleString()}
                    </p>
                    <p className="text-sm text-muted-foreground">per year</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-3 mb-2">
                      <Zap className="h-5 w-5 text-blue-600" />
                      <span className="text-sm font-medium">Time Reduction</span>
                    </div>
                    <p className="text-3xl font-bold text-blue-600">
                      {scanResult.optimizationPotential.timeReductionPercent}%
                    </p>
                    <p className="text-sm text-muted-foreground">faster execution</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-3 mb-2">
                      <RefreshCw className="h-5 w-5 text-purple-600" />
                      <span className="text-sm font-medium">Reliability Boost</span>
                    </div>
                    <p className="text-3xl font-bold text-purple-600">
                      +{scanResult.optimizationPotential.reliabilityImprovement}%
                    </p>
                    <p className="text-sm text-muted-foreground">improvement potential</p>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Quick Wins</CardTitle>
                  <CardDescription>Auto-fixable issues you can resolve immediately</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {scanResult.findings
                      .filter(f => f.autoFixable)
                      .map(f => (
                        <div 
                          key={f.id}
                          className="flex items-center justify-between p-3 bg-muted rounded-lg"
                        >
                          <div className="flex items-center gap-3">
                            <Wrench className="h-4 w-4 text-muted-foreground" />
                            <span>{f.title}</span>
                          </div>
                          <Button size="sm" variant="outline">
                            Apply Fix
                          </Button>
                        </div>
                      ))}
                    {scanResult.findings.filter(f => f.autoFixable).length === 0 && (
                      <p className="text-muted-foreground text-center py-4">
                        No auto-fixable issues found
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="roi-impact" className="space-y-4">
              {roiImpact ? (
                <>
                  <div className="grid md:grid-cols-2 gap-4">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Current vs Optimized ROI</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                          <span>Annual Savings</span>
                          <div className="text-right">
                            <span className="text-muted-foreground line-through mr-2">
                              ${baseROI?.annualSavings.toLocaleString()}
                            </span>
                            <span className="text-green-600 font-bold">
                              ${roiImpact.adjustedAnnualSavings.toLocaleString()}
                            </span>
                          </div>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                          <span>ROI Percentage</span>
                          <div className="text-right">
                            <span className="text-muted-foreground line-through mr-2">
                              {baseROI?.roiPercent.toFixed(0)}%
                            </span>
                            <span className="text-green-600 font-bold">
                              {roiImpact.adjustedROIPercent.toFixed(0)}%
                            </span>
                          </div>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                          <span>Break-Even</span>
                          <div className="text-right">
                            <span className="text-muted-foreground line-through mr-2">
                              {baseROI?.breakEvenDays} days
                            </span>
                            <span className="text-green-600 font-bold">
                              {roiImpact.adjustedBreakEvenDays} days
                            </span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 border-green-500/30">
                      <CardContent className="pt-6 text-center">
                        <h3 className="text-sm font-medium text-muted-foreground mb-2">
                          Additional Annual Savings
                        </h3>
                        <p className="text-4xl font-bold text-green-600">
                          +${roiImpact.potentialAdditionalSavings.toLocaleString()}
                        </p>
                        <p className="text-sm text-muted-foreground mt-2">
                          by implementing scan recommendations
                        </p>
                      </CardContent>
                    </Card>
                  </div>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Priority Recommendations</CardTitle>
                      <CardDescription>
                        Top actions to maximize ROI improvement
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ol className="space-y-3">
                        {roiImpact.optimizationRecommendations.map((rec, i) => (
                          <li key={i} className="flex gap-3 p-3 bg-muted rounded-lg">
                            <span className="flex-shrink-0 w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-bold">
                              {i + 1}
                            </span>
                            <span>{rec}</span>
                          </li>
                        ))}
                      </ol>
                    </CardContent>
                  </Card>
                </>
              ) : (
                <Card>
                  <CardContent className="pt-6 text-center text-muted-foreground">
                    <p>ROI impact analysis requires base ROI data</p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        </>
      )}

      {!scanResult && !isScanning && (
        <Card>
          <CardContent className="pt-6 text-center">
            <Scan className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Ready to Scan</h3>
            <p className="text-muted-foreground mb-4">
              Click "Run Scan" to analyze your workflow for performance, cost, reliability, security, and scalability issues.
            </p>
            <Button onClick={runScan}>
              <Scan className="h-4 w-4 mr-2" />
              Run Scan
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
