import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Sparkles, Store, Users, Zap, Code2, Bug, TestTube, 
  BarChart3, DollarSign, Menu, X, Layout, Mail, Database, 
  FileText, Image as ImageIcon, Moon, Sun, Loader2, Save, Download, Github, Upload,
  Layers, FolderOpen, TestTube2, TrendingUp, Play
} from "lucide-react";
import { NodeType } from "./WorkflowNode";
import { cn } from "@/lib/utils";
import { IntegrationLibrary } from "./IntegrationLibrary";
import { GitHubImportDialog } from "./GitHubImportDialog";

interface FloatingBottomMenuProps {
  onSelectView: (view: string) => void;
  currentView: string;
  // Canvas-specific props
  onAddNode?: (type: NodeType, title?: string, config?: any) => void;
  workflow?: any;
  onOptimized?: (nodes: any[]) => void;
  onOpenAIGenerator?: () => void;
  onSave?: () => void;
  isOptimizing?: boolean;
  onOptimize?: () => void;
  onDownload?: () => void;
  onGitHubImport?: (nodes: any[], name: string) => void;
}

const nodeButtons: Array<{ type: NodeType; icon: typeof Zap; label: string }> = [
  { type: "trigger", icon: Zap, label: "Trigger" },
  { type: "action", icon: Mail, label: "Action" },
  { type: "condition", icon: FileText, label: "Condition" },
  { type: "data", icon: Database, label: "Data" },
  { type: "ai", icon: ImageIcon, label: "AI" },
];

export function FloatingBottomMenu({ 
  onSelectView, 
  currentView,
  onAddNode,
  workflow,
  onOptimized,
  onOpenAIGenerator,
  onSave,
  isOptimizing = false,
  onOptimize,
  onDownload,
  onGitHubImport
}: FloatingBottomMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isDark, setIsDark] = useState(false);
  const [showGitHubImport, setShowGitHubImport] = useState(false);

  useEffect(() => {
    const dark = document.documentElement.classList.contains("dark");
    setIsDark(dark);
  }, []);

  const toggleTheme = () => {
    const newTheme = !isDark;
    setIsDark(newTheme);
    document.documentElement.classList.toggle("dark", newTheme);
  };

  const menuItems = [
    { id: 'canvas', label: 'Canvas', icon: Layers, description: 'Visual workflow builder' },
    { id: 'workflows', label: 'Workflows', icon: FolderOpen, description: 'Manage saved workflows' },
    { id: 'ai-builder', label: 'AI Builder', icon: Sparkles, description: 'Generate workflows with AI' },
    { id: 'predictions', label: 'Predictive Alerts', icon: Zap, description: 'AI failure prevention' },
    { id: 'nl-command', label: 'Natural Language', icon: Sparkles, description: 'Control with plain English' },
    { id: 'health', label: 'Health Score', icon: TrendingUp, description: 'AI quality scoring' },
    { id: 'integrations', label: 'Smart Suggestions', icon: Sparkles, description: 'AI-discovered optimizations' },
    { id: 'intelligence', label: 'Cross-Workflow', icon: TrendingUp, description: 'Redundancy analysis' },
    { id: 'sandbox', label: 'Sandbox', icon: TestTube2, description: 'Test workflows safely' },
    { id: 'business-intelligence', label: 'Business Intelligence', icon: TrendingUp, description: 'Track ROI and costs' },
    { id: 'triggers', label: 'Triggers', icon: Zap, description: 'Configure workflow triggers' },
    { id: 'embed', label: 'Embed', icon: Code2, description: 'Embed agents anywhere' },
    { id: 'marketplace', label: 'Marketplace', icon: Store, description: 'Browse templates' },
    { id: 'collaboration', label: 'Team', icon: Users, description: 'Collaborate with team' },
    { id: 'debug', label: 'Debug', icon: Bug, description: 'Step-through debugger' },
    { id: 'test', label: 'Test', icon: TestTube, description: 'Automated testing' },
    { id: 'analytics', label: 'Analytics', icon: BarChart3, description: 'Performance insights' },
    { id: 'cost', label: 'Cost', icon: DollarSign, description: 'Cost estimation' },
  ];

  const currentItem = menuItems.find(item => item.id === currentView);
  const Icon = currentItem?.icon || Layout;

  return (
    <>
      {/* Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Menu Panel - positioned above the bottom bar */}
      <div 
        className={`
          fixed bottom-20 left-6 bg-card border rounded-lg shadow-2xl z-50 
          transition-all duration-300 ease-out
          ${isOpen ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'}
        `}
        style={{ width: '360px' }}
      >
        <div className="p-4 border-b">
          <h3 className="font-semibold text-lg">Quick Navigation</h3>
          <p className="text-sm text-muted-foreground">Switch between views</p>
        </div>
        <ScrollArea className="h-[500px]">
          <div className="p-2">
            {menuItems.map((item) => {
              const ItemIcon = item.icon;
              const isActive = currentView === item.id;
              
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    onSelectView(item.id);
                    setIsOpen(false);
                  }}
                  className={`
                    w-full flex items-start gap-3 p-3 rounded-lg mb-1
                    transition-colors duration-200
                    ${isActive 
                      ? 'bg-primary text-primary-foreground' 
                      : 'hover:bg-muted'
                    }
                  `}
                >
                  <ItemIcon className="h-5 w-5 mt-0.5 flex-shrink-0" />
                  <div className="flex-1 text-left">
                    <div className="font-medium">{item.label}</div>
                    <div className={`text-xs ${isActive ? 'text-primary-foreground/80' : 'text-muted-foreground'}`}>
                      {item.description}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </ScrollArea>
      </div>

      {/* Bottom Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-card/95 backdrop-blur-xl border-t shadow-lg z-50">
        <div className="px-3 py-3 flex items-center gap-2 overflow-x-auto scrollbar-hide">
          {/* Navigation Section */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <Button
              size="sm"
              variant="outline"
              className="h-9 rounded-lg shadow-sm"
              onClick={() => setIsOpen(!isOpen)}
            >
              {isOpen ? (
                <>
                  <X className="h-4 w-4 mr-1.5" />
                  <span className="text-xs font-medium">Close</span>
                </>
              ) : (
                <>
                  <Menu className="h-4 w-4 mr-1.5" />
                  <span className="text-xs font-medium">Menu</span>
                </>
              )}
            </Button>
            
            {currentItem && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-muted/50">
                <Icon className="h-4 w-4 text-muted-foreground" />
                <span className="text-xs font-medium">{currentItem.label}</span>
              </div>
            )}
          </div>

          {/* Canvas Tools - Only visible on canvas view */}
          {currentView === 'canvas' && (
            <>
              <div className="w-px h-6 bg-border flex-shrink-0 mx-1" />
              
              {/* AI Tools Group */}
              <div className="flex items-center gap-2 flex-shrink-0">
                <Button
                  onClick={onOpenAIGenerator}
                  size="sm"
                  className={cn(
                    "h-9 rounded-lg shadow-sm",
                    "bg-gradient-accent hover:shadow-glow",
                    "text-primary-foreground"
                  )}
                >
                  <Sparkles className="w-4 h-4 mr-1.5" />
                  <span className="text-xs font-medium">AI Generator</span>
                </Button>

                <Button
                  onClick={onOptimize}
                  disabled={isOptimizing || !workflow?.nodes?.length}
                  size="sm"
                  variant="outline"
                  className={cn(
                    "h-9 rounded-lg shadow-sm min-w-[44px] touch-manipulation",
                    isOptimizing && "bg-primary/10 border-primary",
                    !isOptimizing && "hover:bg-primary hover:text-primary-foreground active:scale-95 transition-all"
                  )}
                >
                  {isOptimizing ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-1.5 animate-spin text-primary" />
                      <span className="text-xs font-medium">Optimizing...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 mr-1.5" />
                      <span className="text-xs font-medium">AI Optimize</span>
                    </>
                  )}
                </Button>
              </div>

              <div className="w-px h-6 bg-border flex-shrink-0 mx-1" />

              {/* Integration Library */}
              <IntegrationLibrary onAddNode={onAddNode} />

              <div className="w-px h-6 bg-border flex-shrink-0 mx-1" />

              {/* Node Types Group */}
              <div className="flex items-center gap-1.5 flex-shrink-0">
                {nodeButtons.map(({ type, icon: NodeIcon, label }) => (
                  <Button
                    key={type}
                    onClick={() => onAddNode(type)}
                    variant="outline"
                    size="sm"
                    className="h-9 rounded-lg shadow-sm hover:bg-primary hover:text-primary-foreground transition-all"
                  >
                    <NodeIcon className="w-4 h-4 mr-1.5" />
                    <span className="text-xs font-medium">{label}</span>
                  </Button>
                ))}
              </div>

              <div className="w-px h-6 bg-border flex-shrink-0 mx-1" />

              {/* Action Buttons Group */}
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <Button
                  onClick={() => setShowGitHubImport(true)}
                  variant="outline"
                  size="sm"
                  className="h-9 rounded-lg shadow-sm hover:bg-accent hover:text-accent-foreground min-w-[44px]"
                >
                  <Github className="w-4 h-4 mr-1.5" />
                  <span className="text-xs font-medium hidden sm:inline">Import</span>
                </Button>

                <Button
                  onClick={onDownload}
                  variant="outline"
                  size="sm"
                  className="h-9 rounded-lg shadow-sm hover:bg-accent hover:text-accent-foreground min-w-[44px]"
                  disabled={!workflow?.nodes?.length}
                >
                  <Download className="w-4 h-4 mr-1.5" />
                  <span className="text-xs font-medium hidden sm:inline">Download</span>
                </Button>
                
                <Button
                  onClick={onSave}
                  variant="outline"
                  size="sm"
                  className="h-9 rounded-lg shadow-sm hover:bg-accent hover:text-accent-foreground min-w-[44px]"
                >
                  <Save className="w-4 h-4 mr-1.5" />
                  <span className="text-xs font-medium hidden sm:inline">Save</span>
                </Button>
              </div>

              <GitHubImportDialog
                open={showGitHubImport}
                onOpenChange={setShowGitHubImport}
                onImport={(nodes, name) => {
                  onGitHubImport?.(nodes, name);
                  setShowGitHubImport(false);
                }}
              />
            </>
          )}

          {/* Theme Toggle - Always visible at the end */}
          <div className="w-px h-6 bg-border flex-shrink-0 mx-1 ml-auto" />
          <Button
            onClick={toggleTheme}
            variant="outline"
            size="sm"
            className="h-9 rounded-lg shadow-sm hover:bg-accent hover:text-accent-foreground flex-shrink-0"
          >
            {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </Button>
        </div>
      </div>
    </>
  );
}
