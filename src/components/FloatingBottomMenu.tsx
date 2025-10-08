import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Sparkles, Store, Users, Zap, Code2, Bug, TestTube, 
  BarChart3, DollarSign, Menu, X, Layout
} from "lucide-react";

interface FloatingBottomMenuProps {
  onSelectView: (view: string) => void;
  currentView: string;
}

export function FloatingBottomMenu({ onSelectView, currentView }: FloatingBottomMenuProps) {
  const [isOpen, setIsOpen] = useState(false);

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

      {/* Expanded Menu Panel */}
      <div 
        className={`
          fixed bottom-16 left-0 right-0 bg-card border-t shadow-2xl z-50 
          transition-all duration-300 ease-out mx-auto max-w-4xl
          ${isOpen ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-full pointer-events-none'}
        `}
      >
        <div className="p-4 border-b">
          <h3 className="font-semibold text-lg">Quick Navigation</h3>
          <p className="text-sm text-muted-foreground">Switch between views</p>
        </div>
        <ScrollArea className="h-[400px]">
          <div className="p-2 grid grid-cols-2 gap-2">
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
                    flex items-start gap-3 p-3 rounded-lg
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

      {/* Bottom Navigation Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-card border-t shadow-lg z-50">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              size="sm"
              variant={isOpen ? "secondary" : "ghost"}
              onClick={() => setIsOpen(!isOpen)}
              className="gap-2"
            >
              {isOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
              <span className="hidden sm:inline">Quick Nav</span>
            </Button>
            {currentItem && (
              <div className="flex items-center gap-2 text-sm">
                <Icon className="h-4 w-4" />
                <span className="font-medium">{currentItem.label}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
