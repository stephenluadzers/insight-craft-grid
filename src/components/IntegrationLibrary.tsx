import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Library, Search, Mail, MessageSquare, Globe, Brain, Webhook, RefreshCw, GitBranch, Clock } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface IntegrationTemplate {
  id: string;
  name: string;
  category: string;
  icon?: string;
  description?: string;
  config_schema: any;
}

interface IntegrationLibraryProps {
  onAddNode: (type: string, title: string, config: any) => void;
}

const iconMap: Record<string, any> = {
  Mail, MessageSquare, Globe, Brain, Webhook, RefreshCw, GitBranch, Clock
};

export const IntegrationLibrary = ({ onAddNode }: IntegrationLibraryProps) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const { data: integrations, isLoading } = useQuery({
    queryKey: ["integration_templates"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("integration_templates")
        .select("*")
        .eq("is_active", true)
        .order("category", { ascending: true });

      if (error) throw error;
      return data as IntegrationTemplate[];
    },
  });

  const categories = integrations
    ? Array.from(new Set(integrations.map((i) => i.category)))
    : [];

  const filteredIntegrations = integrations?.filter((integration) => {
    const matchesSearch = integration.name.toLowerCase().includes(search.toLowerCase()) ||
      integration.description?.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = !selectedCategory || integration.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleAddIntegration = (integration: IntegrationTemplate) => {
    const nodeType = integration.category === "ai" ? "ai" : integration.category === "logic" ? "condition" : "action";
    const defaultConfig = Object.keys(integration.config_schema).reduce((acc, key) => {
      acc[key] = "";
      return acc;
    }, {} as any);

    onAddNode(nodeType, integration.name, defaultConfig);
    setOpen(false);
  };

  const IconComponent = (iconName?: string) => {
    const Icon = iconName ? iconMap[iconName] : Library;
    return Icon ? <Icon className="w-5 h-5" /> : <Library className="w-5 h-5" />;
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="flex items-center gap-2 rounded-xl hover:bg-accent">
          <Library className="w-4 h-4" />
          <span className="text-xs font-medium hidden sm:inline">Integrations</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Integration Library</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-4">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search integrations..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          <div className="flex gap-2 flex-wrap">
            <Button
              variant={selectedCategory === null ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedCategory(null)}
            >
              All
            </Button>
            {categories.map((category) => (
              <Button
                key={category}
                variant={selectedCategory === category ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedCategory(category)}
              >
                {category}
              </Button>
            ))}
          </div>

          <ScrollArea className="h-[500px]">
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">Loading integrations...</div>
            ) : filteredIntegrations && filteredIntegrations.length > 0 ? (
              <div className="grid grid-cols-2 gap-3">
                {filteredIntegrations.map((integration) => (
                  <Card
                    key={integration.id}
                    className="cursor-pointer hover:border-primary transition-colors"
                    onClick={() => handleAddIntegration(integration)}
                  >
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-base">
                        {IconComponent(integration.icon)}
                        {integration.name}
                      </CardTitle>
                      <CardDescription className="text-xs">
                        {integration.description}
                      </CardDescription>
                      <Badge variant="outline" className="w-fit mt-2">
                        {integration.category}
                      </Badge>
                    </CardHeader>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">No integrations found</div>
            )}
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
};