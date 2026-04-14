import { useState, useRef } from "react";
import { WorkflowCanvas } from "@/components/WorkflowCanvas";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import AIAgentBuilder from '@/components/AIAgentBuilder';
import TemplateMarketplace from '@/components/TemplateMarketplace';
import { CollaborationPanel } from '@/components/CollaborationPanel';
import TriggerConfiguration from '@/components/TriggerConfiguration';
import EmbeddableAgent from '@/components/EmbeddableAgent';
import { WorkflowDebugger } from "@/components/WorkflowDebugger";
import { WorkflowTestSuite } from "@/components/WorkflowTestSuite";
import { WorkflowAnalyticsDashboard } from "@/components/WorkflowAnalyticsDashboard";
import { WorkflowCostEstimator } from "@/components/WorkflowCostEstimator";
import { FloatingBottomMenu } from "@/components/FloatingBottomMenu";
import { WorkflowList } from "@/components/WorkflowList";
import { WorkflowSandbox } from "@/components/WorkflowSandbox";
import { WorkflowBIDashboard } from "@/components/WorkflowBIDashboard";
import { LegalFooter } from "@/components/LegalFooter";
import AIWorkflowPipeline from "@/components/AIWorkflowPipeline";
import { CommandPalette } from "@/components/CommandPalette";
import { ExecutionStream } from "@/components/ExecutionStream";
import { OnboardingOverlay } from "@/components/OnboardingOverlay";
import { LiveMetricsPanel } from "@/components/LiveMetricsPanel";

const Index = (): JSX.Element => {
  const [currentView, setCurrentView] = useState('canvas');
  const [workflow, setWorkflow] = useState<any>(null);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [workflowId, setWorkflowId] = useState<string | null>(null);
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  const [executionId, setExecutionId] = useState<string | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(true);
  const canvasRef = useRef<any>(null);

  const handleAIWorkflowGenerated = (workflow: any) => {
    console.log('AI Workflow generated:', workflow);
  };

  const handleTemplateImported = (template: any) => {
    console.log('Template imported:', template);
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <CommandPalette onNavigate={setCurrentView} />
        <ExecutionStream executionId={executionId} onClose={() => setExecutionId(null)} />
        <OnboardingOverlay onComplete={() => setShowOnboarding(false)} onNavigate={setCurrentView} />
        
        <div className="flex-1 flex flex-col">
          <div className="flex-1 p-6 pb-20 overflow-auto">
            {currentView === 'canvas' && (
              <WorkflowCanvas 
                ref={canvasRef} 
                onWorkflowChange={setWorkflow}
                onOptimizingChange={setIsOptimizing}
              />
            )}
            {currentView === 'workflows' && (
              <WorkflowList onLoadWorkflow={(nodes) => {
                setCurrentView('canvas');
                setTimeout(() => canvasRef.current?.loadWorkflow?.(nodes), 100);
              }} />
            )}
            {currentView === 'ai-builder' && <AIAgentBuilder onWorkflowGenerated={handleAIWorkflowGenerated} />}
            {currentView === 'triggers' && <TriggerConfiguration workflowId="demo-workflow" onTriggerCreated={(trigger) => console.log('Trigger created:', trigger)} />}
            {currentView === 'embed' && <EmbeddableAgent workflowId="demo-workflow" />}
            {currentView === 'marketplace' && <TemplateMarketplace onImportTemplate={handleTemplateImported} />}
            {currentView === 'collaboration' && <CollaborationPanel workflowId={workflowId} workspaceId={workspaceId} />}
            {currentView === 'debug' && <WorkflowDebugger workflowId="demo-workflow" nodes={[]} />}
            {currentView === 'test' && <WorkflowTestSuite workflowId="demo-workflow" onRunTest={async (testCase) => ({ status: "success" })} />}
            {currentView === 'sandbox' && workflow && <WorkflowSandbox workflowId="demo-workflow" nodes={workflow?.nodes || []} />}
            {currentView === 'business-intelligence' && <WorkflowBIDashboard workflowId="demo-workflow" workspaceId="demo-workspace" />}
            {currentView === 'analytics' && <WorkflowAnalyticsDashboard workflowId="demo-workflow" timeRange="7d" />}
            {currentView === 'pipeline' && <AIWorkflowPipeline onWorkflowGenerated={(nodes) => {
              setCurrentView('canvas');
              setTimeout(() => canvasRef.current?.loadWorkflow?.(nodes), 100);
            }} />}
            {currentView === 'cost' && <WorkflowCostEstimator nodes={[]} executionsPerMonth={1000} />}
            {currentView === 'metrics' && (
              <LiveMetricsPanel
                totalExecutions={1247}
                successRate={96.3}
                avgDurationMs={2340}
                activeWorkflows={12}
                sparklineData={[45, 62, 38, 71, 55, 89, 67]}
                recentActivity={[
                  { type: "success", label: "Email Campaign Workflow completed", time: "2m ago" },
                  { type: "success", label: "Data Sync Pipeline finished", time: "5m ago" },
                  { type: "error", label: "API Integration timed out", time: "12m ago" },
                  { type: "success", label: "AI Analysis Workflow completed", time: "18m ago" },
                  { type: "success", label: "Report Generation finished", time: "25m ago" },
                ]}
              />
            )}
          </div>

          <FloatingBottomMenu 
            currentView={currentView}
            onSelectView={setCurrentView}
            onAddNode={(type, title, config) => canvasRef.current?.handleAddNode?.(type, title, config)}
            workflow={workflow}
            onOptimized={(nodes) => canvasRef.current?.handleWorkflowOptimized?.(nodes)}
            onOpenAIGenerator={() => canvasRef.current?.handleOpenAIGenerator?.()}
            onSave={() => canvasRef.current?.handleSave?.()}
            isOptimizing={isOptimizing}
            onOptimize={async () => {
              await canvasRef.current?.handleOptimize?.();
            }}
            onDownload={() => canvasRef.current?.handleDownload?.()}
            onGitHubImport={(nodes, name) => canvasRef.current?.handleGitHubImport?.(nodes, name)}
            onOpenAPIImport={() => canvasRef.current?.handleOpenAPIImport?.()}
          />
          
          <LegalFooter />
        </div>
      </div>
    </SidebarProvider>
  );
};

export default Index;
