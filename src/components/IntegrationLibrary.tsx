import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Library, Search, Mail, MessageSquare, Globe, Brain, Webhook, RefreshCw,
  GitBranch, Clock, Settings, Merge, Split, Code, Network, Timer, Terminal,
  Send, Hash, Sheet, FileText, Database, Star, Pin, PinOff, History,
  ArrowDownAZ, ArrowUpAZ, Sparkles, X,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
} from "@/components/ui/dropdown-menu";

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
  Mail, MessageSquare, Globe, Brain, Webhook, RefreshCw, GitBranch, Clock,
  Settings, Merge, Split, Code, Network, Timer, Terminal, Send, Hash, Sheet,
  FileText, Database, Search,
};

const LS_FAV = "remora.integrations.favorites";
const LS_PIN = "remora.integrations.pinned";
const LS_RECENT = "remora.integrations.recent";

type SortMode = "category" | "az" | "za" | "recent" | "favorites";

const loadSet = (key: string): Set<string> => {
  try { return new Set(JSON.parse(localStorage.getItem(key) || "[]")); } catch { return new Set(); }
};
const saveSet = (key: string, s: Set<string>) =>
  localStorage.setItem(key, JSON.stringify(Array.from(s)));
const loadList = (key: string): string[] => {
  try { return JSON.parse(localStorage.getItem(key) || "[]"); } catch { return []; }
};

export const IntegrationLibrary = ({ onAddNode }: IntegrationLibraryProps) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(new Set());
  const [sort, setSort] = useState<SortMode>("category");
  const [onlyFavorites, setOnlyFavorites] = useState(false);
  const [favorites, setFavorites] = useState<Set<string>>(() => loadSet(LS_FAV));
  const [pinned, setPinned] = useState<Set<string>>(() => loadSet(LS_PIN));
  const [recent, setRecent] = useState<string[]>(() => loadList(LS_RECENT));

  useEffect(() => saveSet(LS_FAV, favorites), [favorites]);
  useEffect(() => saveSet(LS_PIN, pinned), [pinned]);
  useEffect(() => localStorage.setItem(LS_RECENT, JSON.stringify(recent)), [recent]);

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

  const categories = useMemo(
    () => (integrations ? Array.from(new Set(integrations.map((i) => i.category))).sort() : []),
    [integrations],
  );

  const categoryCounts = useMemo(
    () => (integrations ?? []).reduce<Record<string, number>>((acc, i) => {
      acc[i.category] = (acc[i.category] ?? 0) + 1;
      return acc;
    }, {}),
    [integrations],
  );

  const filtered = useMemo(() => {
    let list = integrations ?? [];
    const q = search.toLowerCase().trim();
    if (q) {
      list = list.filter(i =>
        i.name.toLowerCase().includes(q) ||
        i.description?.toLowerCase().includes(q) ||
        i.category.toLowerCase().includes(q),
      );
    }
    if (selectedCategories.size > 0) {
      list = list.filter(i => selectedCategories.has(i.category));
    }
    if (onlyFavorites) {
      list = list.filter(i => favorites.has(i.id));
    }

    const sorters: Record<SortMode, (a: IntegrationTemplate, b: IntegrationTemplate) => number> = {
      category: (a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name),
      az: (a, b) => a.name.localeCompare(b.name),
      za: (a, b) => b.name.localeCompare(a.name),
      recent: (a, b) => {
        const ai = recent.indexOf(a.id); const bi = recent.indexOf(b.id);
        if (ai === -1 && bi === -1) return a.name.localeCompare(b.name);
        if (ai === -1) return 1; if (bi === -1) return -1;
        return ai - bi;
      },
      favorites: (a, b) => Number(favorites.has(b.id)) - Number(favorites.has(a.id)) || a.name.localeCompare(b.name),
    };
    list = [...list].sort(sorters[sort]);

    // Pinned always float to top
    list.sort((a, b) => Number(pinned.has(b.id)) - Number(pinned.has(a.id)));
    return list;
  }, [integrations, search, selectedCategories, onlyFavorites, sort, favorites, pinned, recent]);

  const toggleFavorite = (id: string) => {
    setFavorites(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };
  const togglePin = (id: string) => {
    setPinned(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };
  const toggleCategory = (c: string) => {
    setSelectedCategories(prev => {
      const next = new Set(prev);
      next.has(c) ? next.delete(c) : next.add(c);
      return next;
    });
  };

  const handleAddIntegration = (integration: IntegrationTemplate) => {
    const nodeType = integration.category === "ai" ? "ai" : integration.category === "logic" ? "condition" : "action";
    const defaultConfig = Object.keys(integration.config_schema || {}).reduce((acc, key) => {
      acc[key] = ""; return acc;
    }, {} as any);
    setRecent(prev => [integration.id, ...prev.filter(x => x !== integration.id)].slice(0, 20));
    onAddNode(nodeType, integration.name, defaultConfig);
    setOpen(false);
  };

  const IconComponent = (iconName?: string) => {
    const Icon = iconName ? iconMap[iconName] : Library;
    return Icon ? <Icon className="w-5 h-5" /> : <Library className="w-5 h-5" />;
  };

  const clearFilters = () => {
    setSearch("");
    setSelectedCategories(new Set());
    setOnlyFavorites(false);
    setSort("category");
  };

  const activeFilterCount =
    (search ? 1 : 0) + selectedCategories.size + (onlyFavorites ? 1 : 0) + (sort !== "category" ? 1 : 0);

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
          <DialogTitle className="flex items-center gap-2">
            <Library className="w-5 h-5" /> Integration Library
            <Badge variant="secondary" className="ml-2">{integrations?.length ?? 0}</Badge>
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-4">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search integrations, descriptions, categories..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>

            <Button
              variant={onlyFavorites ? "default" : "outline"}
              size="sm"
              onClick={() => setOnlyFavorites(v => !v)}
              title="Show only favorites"
            >
              <Star className={`w-4 h-4 ${onlyFavorites ? "fill-current" : ""}`} />
              <span className="ml-1 hidden sm:inline">Favorites</span>
              <Badge variant="secondary" className="ml-2">{favorites.size}</Badge>
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <Sparkles className="w-4 h-4" />
                  <span className="ml-1 hidden sm:inline">Sort</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuLabel>Sort by</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuCheckboxItem checked={sort === "category"} onCheckedChange={() => setSort("category")}>
                  <Library className="w-4 h-4 mr-2" /> Category
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem checked={sort === "az"} onCheckedChange={() => setSort("az")}>
                  <ArrowDownAZ className="w-4 h-4 mr-2" /> Name A–Z
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem checked={sort === "za"} onCheckedChange={() => setSort("za")}>
                  <ArrowUpAZ className="w-4 h-4 mr-2" /> Name Z–A
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem checked={sort === "recent"} onCheckedChange={() => setSort("recent")}>
                  <History className="w-4 h-4 mr-2" /> Recently used
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem checked={sort === "favorites"} onCheckedChange={() => setSort("favorites")}>
                  <Star className="w-4 h-4 mr-2" /> Favorites first
                </DropdownMenuCheckboxItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {activeFilterCount > 0 && (
              <Button variant="ghost" size="sm" onClick={clearFilters} title="Clear filters">
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>

          <div className="flex gap-2 flex-wrap">
            <Button
              variant={selectedCategories.size === 0 ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedCategories(new Set())}
            >
              All <Badge variant="secondary" className="ml-2">{integrations?.length ?? 0}</Badge>
            </Button>
            {categories.map((category) => (
              <Button
                key={category}
                variant={selectedCategories.has(category) ? "default" : "outline"}
                size="sm"
                onClick={() => toggleCategory(category)}
                className="capitalize"
              >
                {category} <Badge variant="secondary" className="ml-2">{categoryCounts[category]}</Badge>
              </Button>
            ))}
          </div>

          <ScrollArea className="h-[500px]">
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">Loading integrations...</div>
            ) : filtered && filtered.length > 0 ? (
              <div className="grid grid-cols-2 gap-3">
                {filtered.map((integration) => {
                  const isFav = favorites.has(integration.id);
                  const isPin = pinned.has(integration.id);
                  return (
                    <Card
                      key={integration.id}
                      className={`relative cursor-pointer hover:border-primary transition-colors ${isPin ? "border-primary/60 bg-primary/5" : ""}`}
                      onClick={() => handleAddIntegration(integration)}
                    >
                      <div className="absolute top-2 right-2 flex gap-1 z-10">
                        <button
                          onClick={(e) => { e.stopPropagation(); togglePin(integration.id); }}
                          className="p-1 rounded hover:bg-accent"
                          title={isPin ? "Unpin" : "Pin to top"}
                        >
                          {isPin
                            ? <PinOff className="w-3.5 h-3.5 text-primary" />
                            : <Pin className="w-3.5 h-3.5 text-muted-foreground" />}
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); toggleFavorite(integration.id); }}
                          className="p-1 rounded hover:bg-accent"
                          title={isFav ? "Unfavorite" : "Favorite"}
                        >
                          <Star className={`w-3.5 h-3.5 ${isFav ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground"}`} />
                        </button>
                      </div>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-base pr-16">
                          {IconComponent(integration.icon)}
                          {integration.name}
                        </CardTitle>
                        <CardDescription className="text-xs">
                          {integration.description}
                        </CardDescription>
                        <div className="flex gap-1 mt-2 flex-wrap">
                          <Badge variant="outline" className="w-fit">{integration.category}</Badge>
                          {isPin && <Badge variant="secondary" className="w-fit"><Pin className="w-3 h-3 mr-1" />Pinned</Badge>}
                          {recent.indexOf(integration.id) > -1 && recent.indexOf(integration.id) < 5 && (
                            <Badge variant="secondary" className="w-fit"><History className="w-3 h-3 mr-1" />Recent</Badge>
                          )}
                        </div>
                      </CardHeader>
                    </Card>
                  );
                })}
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
