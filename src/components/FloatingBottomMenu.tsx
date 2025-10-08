import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Sparkles, Store, Users, Zap, Code2, Bug, TestTube, 
  BarChart3, DollarSign, Menu, X, Layout, Mail, Database, 
  FileText, Image as ImageIcon, Moon, Sun, Loader2, Save
} from "lucide-react";
import { NodeType } from "./WorkflowNode";
import { cn } from "@/lib/utils";
import { IntegrationLibrary } from "./IntegrationLibrary";

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
  onOptimize
}: FloatingBottomMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isDark, setIsDark] = useState(false);

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
    { id: 'canvas', label: 'Canvas', icon: Layout, description: 'Visual workflow builder' },
    { id: 'ai-builder', label: 'AI Builder', icon: Sparkles, description: 'Generate workflows with AI' },
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
        <div className="px-4 py-2.5 flex items-center gap-3 overflow-x-auto">
          {/* Menu Button */}
          <Button
            size="lg"
            className="h-10 w-10 rounded-full shadow-lg p-0 flex-shrink-0"
            onClick={() => setIsOpen(!isOpen)}
          >
            {isOpen ? (
              <X className="h-5 w-5" />
            ) : (
              <Menu className="h-5 w-5" />
            )}
          </Button>
          
          {/* Current View Label */}
          {currentItem && (
            <>
              <div className="flex items-center gap-2 flex-shrink-0">
                <Icon className="h-4 w-4 text-muted-foreground" />
                <p className="text-sm font-medium">{currentItem.label}</p>
              </div>
              <div className="w-px h-6 bg-border flex-shrink-0" />
            </>
          )}

          {/* Canvas Controls - Only show when on canvas view */}
          {currentView === 'canvas' && onAddNode && (
            <>
              {/* AI Generator */}
              <Button
                onClick={onOpenAIGenerator}
                variant="ghost"
                size="sm"
                className={cn(
                  "flex items-center gap-2 rounded-xl flex-shrink-0",
                  "bg-gradient-accent hover:shadow-glow",
                  "text-primary-foreground"
                )}
              >
                <Sparkles className="w-4 h-4" />
                <span className="text-xs font-medium hidden sm:inline">AI Generator</span>
              </Button>

              <div className="w-px h-6 bg-border flex-shrink-0" />

              {/* Integration Library */}
              <IntegrationLibrary onAddNode={onAddNode} />

              <div className="w-px h-6 bg-border flex-shrink-0" />

              {/* Add Node Buttons */}
              {nodeButtons.map(({ type, icon: NodeIcon, label }) => (
                <Button
                  key={type}
                  onClick={() => onAddNode(type)}
                  variant="ghost"
                  size="sm"
                  className={cn(
                    "flex items-center gap-2 rounded-xl transition-all flex-shrink-0",
                    "hover:bg-primary hover:text-primary-foreground",
                    "active:scale-95"
                  )}
                >
                  <NodeIcon className="w-4 h-4" />
                  <span className="text-xs font-medium hidden sm:inline">{label}</span>
                </Button>
              ))}

              <div className="w-px h-6 bg-border flex-shrink-0" />

              {/* AI Optimizer */}
              <Button
                onClick={onOptimize}
                disabled={isOptimizing || !workflow?.nodes?.length}
                variant="ghost"
                size="sm"
                className={cn(
                  "flex items-center gap-2 rounded-xl flex-shrink-0",
                  "hover:bg-accent hover:text-accent-foreground",
                  "disabled:opacity-50 disabled:pointer-events-none"
                )}
              >
                {isOptimizing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span className="text-xs font-medium hidden sm:inline">Optimizing...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span className="text-xs font-medium hidden sm:inline">AI Optimize</span>
                  </>
                )}
              </Button>

              <div className="w-px h-6 bg-border flex-shrink-0" />

              {/* Save Button */}
              <Button
                onClick={onSave}
                variant="ghost"
                size="sm"
                className="flex items-center gap-2 rounded-xl hover:bg-accent hover:text-accent-foreground flex-shrink-0"
              >
                <Save className="w-4 h-4" />
                <span className="text-xs font-medium hidden sm:inline">Save</span>
              </Button>

              <div className="w-px h-6 bg-border flex-shrink-0" />
            </>
          )}

          {/* Theme Toggle - Always visible */}
          <Button
            onClick={toggleTheme}
            variant="ghost"
            size="sm"
            className="rounded-xl hover:bg-accent hover:text-accent-foreground flex-shrink-0 ml-auto"
          >
            {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </Button>
        </div>
      </div>
    </>
  );
}
