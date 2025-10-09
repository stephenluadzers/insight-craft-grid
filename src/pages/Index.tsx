import { useState, useRef } from "react";
import { WorkflowCanvas } from "@/components/WorkflowCanvas";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import AIAgentBuilder from '@/components/AIAgentBuilder';
import TemplateMarketplace from '@/components/TemplateMarketplace';
import CollaborativeWorkspace from '@/components/CollaborativeWorkspace';
import TriggerConfiguration from '@/components/TriggerConfiguration';
import EmbeddableAgent from '@/components/EmbeddableAgent';
import { WorkflowDebugger } from "@/components/WorkflowDebugger";
import { WorkflowTestSuite } from "@/components/WorkflowTestSuite";
import { WorkflowAnalyticsDashboard } from "@/components/WorkflowAnalyticsDashboard";
import { WorkflowCostEstimator } from "@/components/WorkflowCostEstimator";
import { FloatingBottomMenu } from "@/components/FloatingBottomMenu";

const Index = (): JSX.Element => {
  const [currentView, setCurrentView] = useState('canvas');
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
        
        <div className="flex-1 flex flex-col">
          <div className="flex-1 p-6 pb-20 overflow-auto">
            {currentView === 'canvas' && <WorkflowCanvas ref={canvasRef} />}
            {currentView === 'ai-builder' && <AIAgentBuilder onWorkflowGenerated={handleAIWorkflowGenerated} />}
            {currentView === 'triggers' && <TriggerConfiguration workflowId="demo-workflow" onTriggerCreated={(trigger) => console.log('Trigger created:', trigger)} />}
            {currentView === 'embed' && <EmbeddableAgent workflowId="demo-workflow" />}
            {currentView === 'marketplace' && <TemplateMarketplace onImportTemplate={handleTemplateImported} />}
            {currentView === 'collaboration' && <CollaborativeWorkspace />}
            {currentView === 'debug' && <WorkflowDebugger workflowId="demo-workflow" nodes={[]} />}
            {currentView === 'test' && <WorkflowTestSuite workflowId="demo-workflow" onRunTest={async (testCase) => ({ status: "success" })} />}
            {currentView === 'analytics' && <WorkflowAnalyticsDashboard workflowId="demo-workflow" timeRange="7d" />}
            {currentView === 'cost' && <WorkflowCostEstimator nodes={[]} executionsPerMonth={1000} />}
          </div>

          <FloatingBottomMenu 
            currentView={currentView}
            onSelectView={setCurrentView}
            onAddNode={(type, title, config) => canvasRef.current?.handleAddNode?.(type, title, config)}
            workflow={canvasRef.current?.workflow}
            onOptimized={(nodes) => canvasRef.current?.handleWorkflowOptimized?.(nodes)}
            onOpenAIGenerator={() => canvasRef.current?.handleOpenAIGenerator?.()}
            onSave={() => canvasRef.current?.handleSave?.()}
            isOptimizing={canvasRef.current?.isOptimizing ?? false}
            onOptimize={() => canvasRef.current?.handleOptimize?.()}
          />
        </div>
      </div>
    </SidebarProvider>
  );
};

export default Index;
