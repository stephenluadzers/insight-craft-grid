import { WorkflowCanvas } from "@/components/WorkflowCanvas";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import AIAgentBuilder from '@/components/AIAgentBuilder';
import TemplateMarketplace from '@/components/TemplateMarketplace';
import CollaborativeWorkspace from '@/components/CollaborativeWorkspace';
import TriggerConfiguration from '@/components/TriggerConfiguration';
import EmbeddableAgent from '@/components/EmbeddableAgent';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Sparkles, Store, Users, Zap, Code2 } from 'lucide-react';

const Index = (): JSX.Element => {
  const handleAIWorkflowGenerated = (workflow: any) => {
    // This will be handled by WorkflowCanvas in future iterations
    console.log('AI Workflow generated:', workflow);
  };

  const handleTemplateImported = (template: any) => {
    // This will be handled by WorkflowCanvas in future iterations
    console.log('Template imported:', template);
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        
        <div className="flex-1 flex flex-col p-6">
          <div className="mb-6">
            <h1 className="text-3xl font-bold tracking-tight">Enterprise Workflow Platform</h1>
            <p className="text-muted-foreground mt-1">AI-powered automation with enterprise security</p>
          </div>

          <Tabs defaultValue="canvas" className="flex-1">
            <TabsList className="grid w-full grid-cols-6">
              <TabsTrigger value="canvas">Canvas</TabsTrigger>
              <TabsTrigger value="ai-builder">
                <Sparkles className="h-4 w-4 mr-2" />
                AI Builder
              </TabsTrigger>
              <TabsTrigger value="triggers">
                <Zap className="h-4 w-4 mr-2" />
                Triggers
              </TabsTrigger>
              <TabsTrigger value="embed">
                <Code2 className="h-4 w-4 mr-2" />
                Embed
              </TabsTrigger>
              <TabsTrigger value="marketplace">
                <Store className="h-4 w-4 mr-2" />
                Marketplace
              </TabsTrigger>
              <TabsTrigger value="collaboration">
                <Users className="h-4 w-4 mr-2" />
                Team
              </TabsTrigger>
            </TabsList>

            <TabsContent value="canvas" className="flex-1 mt-6">
              <WorkflowCanvas />
            </TabsContent>

            <TabsContent value="ai-builder" className="mt-6">
              <AIAgentBuilder onWorkflowGenerated={handleAIWorkflowGenerated} />
            </TabsContent>

            <TabsContent value="triggers" className="mt-6">
              <TriggerConfiguration 
                workflowId="demo-workflow" 
                onTriggerCreated={(trigger) => console.log('Trigger created:', trigger)} 
              />
            </TabsContent>

            <TabsContent value="embed" className="mt-6">
              <EmbeddableAgent workflowId="demo-workflow" />
            </TabsContent>

            <TabsContent value="marketplace" className="mt-6">
              <TemplateMarketplace onImportTemplate={handleTemplateImported} />
            </TabsContent>

            <TabsContent value="collaboration" className="mt-6">
              <CollaborativeWorkspace />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default Index;
