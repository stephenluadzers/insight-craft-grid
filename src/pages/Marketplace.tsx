import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Star, Download, Search } from "lucide-react";
import { useState } from "react";
import type { MarketplaceCategory, MarketplaceWorkflow } from "@/types/marketplace";

const Marketplace = () => {
  const [searchQuery, setSearchQuery] = useState("");

  const { data: categories } = useQuery<MarketplaceCategory[]>({
    queryKey: ["marketplace-categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("marketplace_categories" as any)
        .select("*")
        .order("sort_order");
      if (error) throw error;
      return data as unknown as MarketplaceCategory[];
    },
  });

  const { data: workflows } = useQuery<MarketplaceWorkflow[]>({
    queryKey: ["marketplace-workflows", searchQuery],
    queryFn: async () => {
      let query = supabase
        .from("marketplace_workflows" as any)
        .select("*, marketplace_categories(name)")
        .eq("is_approved", true);

      if (searchQuery) {
        query = query.or(`title.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%`);
      }

      const { data, error } = await query.order("install_count", { ascending: false }).limit(50);
      if (error) throw error;
      return data as unknown as MarketplaceWorkflow[];
    },
  });

  return (
    <div className="container mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">Workflow Marketplace</h1>
        <p className="text-muted-foreground">Discover and install pre-built automation workflows</p>
      </div>

      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search workflows..."
            className="pl-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <Tabs defaultValue="all" className="space-y-6">
        <TabsList className="overflow-x-auto flex-wrap h-auto">
          <TabsTrigger value="all">All</TabsTrigger>
          {categories?.map((cat) => (
            <TabsTrigger key={cat.id} value={cat.id}>{cat.name}</TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {workflows?.map((workflow) => (
              <Card key={workflow.id} className="flex flex-col">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-xl">{workflow.title}</CardTitle>
                    {workflow.is_featured && <Badge variant="secondary">Featured</Badge>}
                  </div>
                  <CardDescription className="line-clamp-2">{workflow.description}</CardDescription>
                </CardHeader>
                <CardContent className="flex-1">
                  <div className="flex flex-wrap gap-2">
                    {workflow.tags?.slice(0, 3).map((tag) => (
                      <Badge key={tag} variant="outline">{tag}</Badge>
                    ))}
                  </div>
                </CardContent>
                <CardFooter className="flex justify-between items-center">
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Star className="w-4 h-4 fill-current text-yellow-500" />
                      {workflow.average_rating?.toFixed(1) || "0.0"}
                    </span>
                    <span className="flex items-center gap-1">
                      <Download className="w-4 h-4" />
                      {workflow.install_count}
                    </span>
                  </div>
                  <Button size="sm">Install</Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Marketplace;
