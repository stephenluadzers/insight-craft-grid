import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import {
  Workflow, Bot, Zap, Settings, BarChart3, Shield,
  Code2, Globe, CreditCard, FileText, Play, Plus,
  Search, Clock, Webhook, LayoutDashboard, Package,
} from "lucide-react";

interface CommandPaletteProps {
  onNavigate?: (view: string) => void;
}

const navCommands = [
  { id: "canvas", label: "Workflow Canvas", icon: Workflow, group: "Navigate" },
  { id: "workflows", label: "My Workflows", icon: LayoutDashboard, group: "Navigate" },
  { id: "ai-builder", label: "AI Agent Builder", icon: Bot, group: "Navigate" },
  { id: "marketplace", label: "Template Marketplace", icon: Package, group: "Navigate" },
  { id: "analytics", label: "Analytics Dashboard", icon: BarChart3, group: "Navigate" },
  { id: "triggers", label: "Trigger Configuration", icon: Zap, group: "Navigate" },
];

const pageCommands = [
  { path: "/settings", label: "Settings", icon: Settings, group: "Pages" },
  { path: "/webhooks", label: "Webhooks", icon: Webhook, group: "Pages" },
  { path: "/api-keys", label: "API Keys", icon: Code2, group: "Pages" },
  { path: "/billing", label: "Billing & Plans", icon: CreditCard, group: "Pages" },
  { path: "/schedules", label: "Schedules", icon: Clock, group: "Pages" },
  { path: "/api-docs", label: "API Documentation", icon: FileText, group: "Pages" },
  { path: "/enterprise", label: "Enterprise", icon: Shield, group: "Pages" },
  { path: "/templates", label: "Templates", icon: Globe, group: "Pages" },
];

const actionCommands = [
  { id: "new-workflow", label: "Create New Workflow", icon: Plus, group: "Actions" },
  { id: "run-workflow", label: "Run Current Workflow", icon: Play, group: "Actions" },
  { id: "search-nodes", label: "Search Nodes", icon: Search, group: "Actions" },
];

export function CommandPalette({ onNavigate }: CommandPaletteProps) {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  const handleSelect = useCallback(
    (value: string) => {
      setOpen(false);

      // Nav commands
      const nav = navCommands.find((c) => c.id === value);
      if (nav && onNavigate) {
        onNavigate(nav.id);
        return;
      }

      // Page commands
      const page = pageCommands.find((c) => c.path === value);
      if (page) {
        navigate(page.path);
        return;
      }

      // Action commands handled by parent
      if (value === "new-workflow" && onNavigate) {
        onNavigate("canvas");
      }
    },
    [navigate, onNavigate]
  );

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Type a command or search..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>

        <CommandGroup heading="Navigate">
          {navCommands.map((cmd) => (
            <CommandItem key={cmd.id} value={cmd.id} onSelect={handleSelect}>
              <cmd.icon className="mr-2 h-4 w-4 text-muted-foreground" />
              <span>{cmd.label}</span>
            </CommandItem>
          ))}
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Pages">
          {pageCommands.map((cmd) => (
            <CommandItem key={cmd.path} value={cmd.path} onSelect={handleSelect}>
              <cmd.icon className="mr-2 h-4 w-4 text-muted-foreground" />
              <span>{cmd.label}</span>
            </CommandItem>
          ))}
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Actions">
          {actionCommands.map((cmd) => (
            <CommandItem key={cmd.id} value={cmd.id} onSelect={handleSelect}>
              <cmd.icon className="mr-2 h-4 w-4 text-muted-foreground" />
              <span>{cmd.label}</span>
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
