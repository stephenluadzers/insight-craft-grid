import { Plus, Zap, Mail, Database, FileText, Image, Moon, Sun } from "lucide-react";
import { Button } from "./ui/button";
import { NodeType } from "./WorkflowNode";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";

interface FloatingToolbarProps {
  onAddNode: (type: NodeType) => void;
}

const nodeButtons: Array<{ type: NodeType; icon: typeof Zap; label: string }> = [
  { type: "trigger", icon: Zap, label: "Trigger" },
  { type: "action", icon: Mail, label: "Action" },
  { type: "condition", icon: FileText, label: "Condition" },
  { type: "data", icon: Database, label: "Data" },
  { type: "ai", icon: Image, label: "AI" },
];

export const FloatingToolbar = ({ onAddNode }: FloatingToolbarProps) => {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    // Check initial theme
    const dark = document.documentElement.classList.contains("dark");
    setIsDark(dark);
  }, []);

  const toggleTheme = () => {
    const newTheme = !isDark;
    setIsDark(newTheme);
    document.documentElement.classList.toggle("dark", newTheme);
  };

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-slide-up">
      <div className="flex items-center gap-2 p-2 rounded-2xl bg-card/95 backdrop-blur-xl border border-border shadow-lg">
        {/* Add Node Buttons */}
        {nodeButtons.map(({ type, icon: Icon, label }) => (
          <Button
            key={type}
            onClick={() => onAddNode(type)}
            variant="ghost"
            size="sm"
            className={cn(
              "flex items-center gap-2 rounded-xl transition-all",
              "hover:bg-primary hover:text-primary-foreground",
              "active:scale-95"
            )}
          >
            <Icon className="w-4 h-4" />
            <span className="text-xs font-medium hidden sm:inline">{label}</span>
          </Button>
        ))}

        {/* Divider */}
        <div className="w-px h-6 bg-border" />

        {/* Theme Toggle */}
        <Button
          onClick={toggleTheme}
          variant="ghost"
          size="sm"
          className="rounded-xl hover:bg-accent hover:text-accent-foreground"
        >
          {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </Button>
      </div>
    </div>
  );
};
