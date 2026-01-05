import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  TrendingUp,
  DollarSign,
  Clock,
  Target,
  Download,
  Sparkles,
  BarChart3,
  Scan,
} from 'lucide-react';
import { WorkflowNodeData } from '@/types/workflow';
import { generateWorkflowDownloadPackage } from '@/lib/workflowDownload';
import { toast } from 'sonner';
import { WorkflowScanPanel } from './WorkflowScanPanel';

interface ROIData {
  timeSavings: {
    manualHoursPerDay: number;
    automatedMinutesPerDay: number;
    hoursSavedPerDay: number;
    annualHoursSaved: number;
  };
  costSavings: {
    hourlyRate: number;
    dailyManualCost: number;
    dailyAutomationCost: number;
    netDailySavings: number;
    annualSavings: number;
  };
  revenuePotential: {
    timeFreedup: string;
    scalingCapacity: string;
    customerSatisfaction: string;
  };
  breakEven: {
    setupTimeHours: number;
    setupCost: number;
    daysToBreakEven: number;
    roiAfterOneYear: number;
  };
}

interface WorkflowROIReportProps {
  nodes: WorkflowNodeData[];
  workflowName: string;
}

function calculateROI(nodes: WorkflowNodeData[]): ROIData {
  const nodeCount = nodes.length;
  const hasAI = nodes.some(n => n.type === 'ai');
  const hasIntegrations = nodes.some(n => n.type === 'action');
  
  const manualHoursPerDay = Math.min(nodeCount * 0.5, 8);
  const automatedMinutesPerDay = nodeCount * 2;
  const hoursSavedPerDay = manualHoursPerDay - (automatedMinutesPerDay / 60);
  const annualHoursSaved = hoursSavedPerDay * 365;
  
  const hourlyRate = hasAI ? 35 : 25;
  const dailyManualCost = manualHoursPerDay * hourlyRate;
  const dailyAutomationCost = hasAI ? 2.5 : 0.5;
  const netDailySavings = dailyManualCost - dailyAutomationCost;
  const annualSavings = netDailySavings * 365;
  
  const setupTimeHours = hasIntegrations ? nodeCount * 0.75 : nodeCount * 0.5;
  const setupCost = setupTimeHours * hourlyRate;
  const daysToBreakEven = Math.ceil(setupCost / netDailySavings);
  const roiAfterOneYear = ((annualSavings - setupCost) / setupCost) * 100;
  
  return {
    timeSavings: {
      manualHoursPerDay,
      automatedMinutesPerDay,
      hoursSavedPerDay,
      annualHoursSaved
    },
    costSavings: {
      hourlyRate,
      dailyManualCost,
      dailyAutomationCost,
      netDailySavings,
      annualSavings
    },
    revenuePotential: {
      timeFreedup: `${Math.round(annualHoursSaved)} hours per year can be redirected to revenue-generating activities`,
      scalingCapacity: `Can now handle ${Math.round(nodeCount * 10)}x more volume with the same effort`,
      customerSatisfaction: hasAI ? "AI-powered responses improve quality and consistency" : "Faster response times improve customer retention"
    },
    breakEven: {
      setupTimeHours,
      setupCost,
      daysToBreakEven,
      roiAfterOneYear
    }
  };
}

export const WorkflowROIReport = ({ nodes, workflowName }: WorkflowROIReportProps) => {
  const roi = calculateROI(nodes);

  const handleDownloadReport = async () => {
    try {
      const { blob, fileName } = await generateWorkflowDownloadPackage(nodes, workflowName);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('Enterprise package downloaded');
    } catch (error) {
      toast.error('Failed to download package');
    }
  };

  const year1 = roi.costSavings.annualSavings - roi.breakEven.setupCost;
  const year2 = roi.costSavings.annualSavings * 1.1;
  const year3 = roi.costSavings.annualSavings * 1.2;
  const year4 = roi.costSavings.annualSavings * 1.3;
  const year5 = roi.costSavings.annualSavings * 1.4;
  const total5Year = year1 + year2 + year3 + year4 + year5;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold flex items-center gap-3">
            <Sparkles className="h-8 w-8 text-primary" />
            Enterprise ROI Report
          </h2>
          <p className="text-muted-foreground mt-1">
            Financial impact analysis for {workflowName}
          </p>
        </div>
        <Button onClick={handleDownloadReport} size="lg">
          <Download className="h-4 w-4 mr-2" />
          Download Complete Package
        </Button>
      </div>

      {/* Executive Summary */}
      <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10">
        <CardHeader>
          <CardTitle className="text-2xl">Executive Summary</CardTitle>
          <CardDescription>Key financial metrics at a glance</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-muted-foreground">
                <DollarSign className="h-4 w-4" />
                <span className="text-sm font-medium">Annual Savings</span>
              </div>
              <p className="text-3xl font-bold text-green-600">
                ${Math.round(roi.costSavings.annualSavings).toLocaleString()}
              </p>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Target className="h-4 w-4" />
                <span className="text-sm font-medium">Break-Even</span>
              </div>
              <p className="text-3xl font-bold text-blue-600">
                {roi.breakEven.daysToBreakEven} days
              </p>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-muted-foreground">
                <TrendingUp className="h-4 w-4" />
                <span className="text-sm font-medium">First Year ROI</span>
              </div>
              <p className="text-3xl font-bold text-purple-600">
                {Math.round(roi.breakEven.roiAfterOneYear)}%
              </p>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span className="text-sm font-medium">Time Saved</span>
              </div>
              <p className="text-3xl font-bold text-orange-600">
                {Math.round(roi.timeSavings.annualHoursSaved)}h/yr
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="financial" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="financial">Financial Impact</TabsTrigger>
          <TabsTrigger value="time">Time Savings</TabsTrigger>
          <TabsTrigger value="revenue">Revenue Potential</TabsTrigger>
          <TabsTrigger value="projection">5-Year Projection</TabsTrigger>
          <TabsTrigger value="scan" className="flex items-center gap-1">
            <Scan className="h-3 w-3" />
            Scan Analysis
          </TabsTrigger>
        </TabsList>

        <TabsContent value="financial" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Cost Savings Analysis</CardTitle>
              <CardDescription>Detailed breakdown of cost reduction</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h3 className="font-semibold text-lg">Daily Operations</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                      <span className="text-sm">Manual Process Cost</span>
                      <Badge variant="outline" className="text-lg">
                        ${roi.costSavings.dailyManualCost.toFixed(2)}
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                      <span className="text-sm">Automation Cost</span>
                      <Badge variant="outline" className="text-lg">
                        ${roi.costSavings.dailyAutomationCost.toFixed(2)}
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                      <span className="text-sm font-semibold">Net Daily Savings</span>
                      <Badge className="text-lg bg-green-600">
                        ${roi.costSavings.netDailySavings.toFixed(2)}
                      </Badge>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="font-semibold text-lg">Annual Impact</h3>
                  <div className="p-6 bg-gradient-to-br from-green-500/10 to-emerald-500/10 rounded-lg border border-green-500/20">
                    <p className="text-sm text-muted-foreground mb-2">Total Annual Savings</p>
                    <p className="text-4xl font-bold text-green-600 mb-3">
                      ${Math.round(roi.costSavings.annualSavings).toLocaleString()}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Based on ${roi.costSavings.hourlyRate}/hour labor rate
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="time" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Time Efficiency Gains</CardTitle>
              <CardDescription>How automation transforms your time investment</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid md:grid-cols-3 gap-6">
                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground mb-2">Manual Process</p>
                  <p className="text-3xl font-bold mb-1">
                    {roi.timeSavings.manualHoursPerDay.toFixed(1)}h
                  </p>
                  <p className="text-xs text-muted-foreground">per day</p>
                </div>

                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground mb-2">Automated Process</p>
                  <p className="text-3xl font-bold mb-1">
                    {roi.timeSavings.automatedMinutesPerDay}min
                  </p>
                  <p className="text-xs text-muted-foreground">per day</p>
                </div>

                <div className="p-4 bg-primary/10 rounded-lg border border-primary/20">
                  <p className="text-sm text-muted-foreground mb-2">Time Saved Daily</p>
                  <p className="text-3xl font-bold text-primary mb-1">
                    {roi.timeSavings.hoursSavedPerDay.toFixed(1)}h
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {Math.round(roi.timeSavings.annualHoursSaved)} hours/year
                  </p>
                </div>
              </div>

              <div className="p-6 bg-gradient-to-r from-blue-500/10 to-cyan-500/10 rounded-lg border border-blue-500/20">
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  What You Can Do With Saved Time
                </h3>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-start gap-2">
                    <span className="text-blue-600 mt-1">•</span>
                    <span>{roi.revenuePotential.timeFreedup}</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-600 mt-1">•</span>
                    <span>{roi.revenuePotential.scalingCapacity}</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-600 mt-1">•</span>
                    <span>{roi.revenuePotential.customerSatisfaction}</span>
                  </li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="revenue" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Revenue Growth Opportunities</CardTitle>
              <CardDescription>How this workflow unlocks business growth</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div className="p-6 bg-gradient-to-br from-purple-500/10 to-pink-500/10 rounded-lg border border-purple-500/20">
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <BarChart3 className="h-5 w-5 text-purple-600" />
                    Capacity Expansion
                  </h3>
                  <p className="text-sm text-muted-foreground mb-2">
                    {roi.revenuePotential.scalingCapacity}
                  </p>
                  <p className="text-2xl font-bold text-purple-600 mt-4">
                    {Math.round(nodes.length * 10)}x
                  </p>
                  <p className="text-xs text-muted-foreground">More volume capacity</p>
                </div>

                <div className="p-6 bg-gradient-to-br from-orange-500/10 to-red-500/10 rounded-lg border border-orange-500/20">
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-orange-600" />
                    Time to Revenue
                  </h3>
                  <p className="text-sm text-muted-foreground mb-2">
                    Freed time redirected to revenue-generating work
                  </p>
                  <p className="text-2xl font-bold text-orange-600 mt-4">
                    ${Math.round(roi.timeSavings.annualHoursSaved * roi.costSavings.hourlyRate * 1.5).toLocaleString()}
                  </p>
                  <p className="text-xs text-muted-foreground">Potential annual revenue increase</p>
                </div>
              </div>

              <div className="p-6 bg-muted rounded-lg">
                <h3 className="font-semibold mb-3">Quality & Customer Impact</h3>
                <p className="text-sm text-muted-foreground">
                  {roi.revenuePotential.customerSatisfaction}
                </p>
                <div className="grid grid-cols-3 gap-4 mt-4">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-primary">15-25%</p>
                    <p className="text-xs text-muted-foreground">Improved customer retention</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-primary">30-40%</p>
                    <p className="text-xs text-muted-foreground">Faster response times</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-primary">50%+</p>
                    <p className="text-xs text-muted-foreground">Error reduction</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="projection" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>5-Year Financial Projection</CardTitle>
              <CardDescription>Long-term value creation from this workflow</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-3">
                {[
                  { year: 1, value: year1, label: 'Year 1 (After Setup)' },
                  { year: 2, value: year2, label: 'Year 2 (+10% efficiency)' },
                  { year: 3, value: year3, label: 'Year 3 (+20% efficiency)' },
                  { year: 4, value: year4, label: 'Year 4 (+30% efficiency)' },
                  { year: 5, value: year5, label: 'Year 5 (+40% efficiency)' },
                ].map((item) => (
                  <div key={item.year} className="flex items-center justify-between p-4 bg-muted rounded-lg">
                    <span className="font-medium">{item.label}</span>
                    <Badge variant="outline" className="text-lg">
                      ${Math.round(item.value).toLocaleString()}
                    </Badge>
                  </div>
                ))}
                
                <div className="flex items-center justify-between p-6 bg-gradient-to-r from-green-500/20 to-emerald-500/20 rounded-lg border-2 border-green-500/40 mt-4">
                  <span className="font-bold text-lg">Total 5-Year Value</span>
                  <Badge className="text-2xl py-2 px-4 bg-green-600">
                    ${Math.round(total5Year).toLocaleString()}
                  </Badge>
                </div>
              </div>

              <div className="p-6 bg-muted rounded-lg space-y-3">
                <h3 className="font-semibold">Break-Even Analysis</h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Initial Investment</p>
                    <p className="text-xl font-bold">
                      ${Math.round(roi.breakEven.setupCost).toLocaleString()}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {roi.breakEven.setupTimeHours.toFixed(1)} hours setup time
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Break-Even Point</p>
                    <p className="text-xl font-bold text-green-600">
                      {roi.breakEven.daysToBreakEven} days
                    </p>
                    <p className="text-xs text-muted-foreground">
                      ROI: {Math.round(roi.breakEven.roiAfterOneYear)}% after year 1
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="scan" className="space-y-4">
          <WorkflowScanPanel 
            nodes={nodes} 
            workflowName={workflowName}
            baseROI={{
              annualSavings: roi.costSavings.annualSavings,
              roiPercent: roi.breakEven.roiAfterOneYear,
              breakEvenDays: roi.breakEven.daysToBreakEven,
            }}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};
