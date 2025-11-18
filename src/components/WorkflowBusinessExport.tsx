import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Download, Code, Container, Cloud, Workflow, FileCode2, Package, FileJson, Loader2 } from "lucide-react";
import { WorkflowNodeData } from "@/types/workflow";
import { exportWorkflowForBusiness, ExportPlatform } from "@/lib/workflowExport";
import { exportWorkflowToYAML, downloadYAML } from "@/lib/workflowExportYAML";
import { useToast } from "@/hooks/use-toast";

interface WorkflowBusinessExportProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  nodes: WorkflowNodeData[];
  workflowName: string;
  guardrailMetadata?: {
    explanations?: any[];
    complianceStandards?: string[];
    riskScore?: number;
    policyAnalysis?: any;
  };
}

interface PlatformOption {
  id: ExportPlatform;
  name: string;
  description: string;
  icon: any;
  category: 'no-code' | 'code' | 'cloud' | 'containers';
  difficulty: 'easy' | 'medium' | 'advanced';
  useCase: string;
}

const PLATFORM_OPTIONS: PlatformOption[] = [
  {
    id: 'n8n',
    name: 'n8n',
    description: 'Self-hosted workflow automation',
    icon: Workflow,
    category: 'no-code',
    difficulty: 'easy',
    useCase: 'Best for self-hosted automation with visual editor'
  },
  {
    id: 'make',
    name: 'Make (Integromat)',
    description: 'Cloud automation platform',
    icon: Cloud,
    category: 'no-code',
    difficulty: 'easy',
    useCase: 'Best for cloud-based automation with 1000+ integrations'
  },
  {
    id: 'python',
    name: 'Python Script',
    description: 'Standalone Python implementation',
    icon: FileCode2,
    category: 'code',
    difficulty: 'medium',
    useCase: 'Best for custom deployments, AWS Lambda, or cron jobs'
  },
  {
    id: 'typescript',
    name: 'TypeScript/Node.js',
    description: 'Modern JavaScript implementation',
    icon: Code,
    category: 'code',
    difficulty: 'medium',
    useCase: 'Best for Vercel, AWS Lambda, or Node.js servers'
  },
  {
    id: 'docker',
    name: 'Docker Container',
    description: 'Containerized deployment',
    icon: Container,
    category: 'containers',
    difficulty: 'advanced',
    useCase: 'Best for Kubernetes, ECS, or any container platform'
  },
  {
    id: 'github-actions',
    name: 'GitHub Actions',
    description: 'CI/CD workflow automation',
    icon: Package,
    category: 'cloud',
    difficulty: 'medium',
    useCase: 'Best for scheduled workflows in GitHub repositories'
  },
  {
    id: 'supabase-function',
    name: 'Supabase Function',
    description: 'Edge function deployment',
    icon: Cloud,
    category: 'cloud',
    difficulty: 'easy',
    useCase: 'Best for serverless edge computing with instant global deployment'
  },
];

export function WorkflowBusinessExport({ 
  open, 
  onOpenChange, 
  nodes, 
  workflowName,
  guardrailMetadata
}: WorkflowBusinessExportProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const { toast } = useToast();

  const handleExport = async (platform: ExportPlatform) => {
    setIsExporting(true);
    
    try {
      const blob = await exportWorkflowForBusiness(nodes, workflowName, {
        platform,
        includeDocs: true,
        includeTests: false,
        guardrailMetadata,
      });

      // Download the ZIP file
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${workflowName.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${platform}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: "Export Successful",
        description: `Workflow exported for ${PLATFORM_OPTIONS.find(p => p.id === platform)?.name}`,
      });
    } catch (error) {
      console.error('Export failed:', error);
      toast({
        title: "Export Failed",
        description: "Failed to export workflow. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  const filteredPlatforms = selectedCategory
    ? PLATFORM_OPTIONS.filter(p => p.category === selectedCategory)
    : PLATFORM_OPTIONS;

  const categories = [
    { id: 'no-code', label: 'No-Code Platforms', icon: Workflow },
    { id: 'code', label: 'Code-Based', icon: Code },
    { id: 'cloud', label: 'Cloud Services', icon: Cloud },
    { id: 'containers', label: 'Containers', icon: Container },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="w-5 h-5" />
            Export for Business Use
          </DialogTitle>
          <DialogDescription>
            Export your workflow to run in production environments. Choose your platform and get ready-to-deploy code with documentation.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Quick YAML Export */}
          <div className="border rounded-lg p-4 bg-muted/30">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <FileJson className="w-5 h-5" />
                <h3 className="font-semibold">Quick Export</h3>
              </div>
            </div>
            <p className="text-sm text-muted-foreground mb-3">
              Export your complete workflow architecture with all decision branches and nodes to YAML or n8n JSON format.
            </p>
            <div className="flex gap-2">
              <Button
                onClick={() => {
                  const yaml = exportWorkflowToYAML(nodes, workflowName);
                  downloadYAML(yaml, `${workflowName.toLowerCase().replace(/[^a-z0-9]/g, '-')}`);
                  toast({
                    title: "YAML Exported",
                    description: "Workflow exported to YAML format with complete architecture",
                  });
                }}
                variant="outline"
                className="flex-1"
              >
                <FileJson className="w-4 h-4 mr-2" />
                Export to YAML
              </Button>
              <Button
                onClick={() => handleExport('n8n')}
                disabled={isExporting}
                variant="outline"
                className="flex-1"
              >
                {isExporting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Workflow className="w-4 h-4 mr-2" />}
                Export to n8n JSON
              </Button>
            </div>
          </div>

          {/* Category Filter */}
          <div className="flex gap-2 flex-wrap">
            <Button
              variant={selectedCategory === null ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedCategory(null)}
            >
              All Platforms
            </Button>
            {categories.map(category => {
              const Icon = category.icon;
              return (
                <Button
                  key={category.id}
                  variant={selectedCategory === category.id ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedCategory(category.id)}
                >
                  <Icon className="w-4 h-4 mr-1" />
                  {category.label}
                </Button>
              );
            })}
          </div>

          {/* Platform Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredPlatforms.map(platform => {
              const Icon = platform.icon;
              return (
                <Card 
                  key={platform.id}
                  className="hover:border-primary transition-colors cursor-pointer"
                  onClick={() => handleExport(platform.id)}
                >
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <Icon className="w-5 h-5 text-primary" />
                        <CardTitle className="text-lg">{platform.name}</CardTitle>
                      </div>
                      <Badge 
                        variant={
                          platform.difficulty === 'easy' ? 'default' :
                          platform.difficulty === 'medium' ? 'secondary' : 'outline'
                        }
                      >
                        {platform.difficulty}
                      </Badge>
                    </div>
                    <CardDescription>{platform.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-3">
                      {platform.useCase}
                    </p>
                    <Button 
                      className="w-full" 
                      size="sm"
                      disabled={isExporting}
                    >
                      <Download className="w-4 h-4 mr-2" />
                      {isExporting ? 'Exporting...' : 'Export & Download'}
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Info Box */}
          <Card className="bg-muted/50">
            <CardContent className="pt-6">
              <div className="space-y-2 text-sm">
                <p className="font-medium">📦 What's Included:</p>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-2">
                  <li>Ready-to-run code in your chosen platform</li>
                  <li>Complete setup and deployment instructions</li>
                  <li>Security & Guardrails Report with reasoning</li>
                  <li>Compliance analysis and risk assessment</li>
                  <li>Environment variable templates</li>
                  <li>Configuration examples</li>
                  <li>Original FlowFuse workflow JSON for reference</li>
                </ul>
                
                <p className="font-medium mt-4">🚀 Next Steps:</p>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-2">
                  <li>Extract the ZIP file</li>
                  <li>Read the README.md for platform-specific instructions</li>
                  <li>Configure your environment variables</li>
                  <li>Deploy to your production environment</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}
