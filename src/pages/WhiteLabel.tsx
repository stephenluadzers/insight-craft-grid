import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Copy, Palette, Globe, Key } from "lucide-react";
import type { WhiteLabelConfig } from "@/types/marketplace";

const WhiteLabel = () => {
  const { toast } = useToast();

  const { data: config } = useQuery<WhiteLabelConfig>({
    queryKey: ["white-label-config"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("white_label_configurations" as any)
        .select("*")
        .eq("workspace_id", user.id)
        .single();

      if (error) throw error;
      return data as unknown as WhiteLabelConfig;
    },
  });

  const copyApiKey = () => {
    if (config?.api_key) {
      navigator.clipboard.writeText(config.api_key);
      toast({ title: "API key copied to clipboard" });
    }
  };

  return (
    <div className="container mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">Embedded iPaaS</h1>
        <p className="text-muted-foreground">White-label FlowFuse for your customers</p>
      </div>

      <Tabs defaultValue="branding" className="space-y-6">
        <TabsList>
          <TabsTrigger value="branding"><Palette className="w-4 h-4 mr-2" />Branding</TabsTrigger>
          <TabsTrigger value="domain"><Globe className="w-4 h-4 mr-2" />Domain</TabsTrigger>
          <TabsTrigger value="api"><Key className="w-4 h-4 mr-2" />API</TabsTrigger>
        </TabsList>

        <TabsContent value="branding">
          <Card>
            <CardHeader>
              <CardTitle>Brand Configuration</CardTitle>
              <CardDescription>Customize the look and feel for your customers</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="brand-name">Brand Name</Label>
                <Input id="brand-name" placeholder="Your Company Name" defaultValue={config?.brand_name} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="primary-color">Primary Color</Label>
                  <Input id="primary-color" type="color" defaultValue={config?.primary_color} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="secondary-color">Secondary Color</Label>
                  <Input id="secondary-color" type="color" defaultValue={config?.secondary_color} />
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Switch id="active" defaultChecked={config?.is_active} />
                <Label htmlFor="active">Configuration Active</Label>
              </div>
              <Button>Save Branding</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="domain">
          <Card>
            <CardHeader>
              <CardTitle>Custom Domain</CardTitle>
              <CardDescription>Connect your own domain to the embedded platform</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="domain">Domain</Label>
                <Input id="domain" placeholder="workflows.yourcompany.com" defaultValue={config?.domain} />
              </div>
              <Button>Configure Domain</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="api">
          <Card>
            <CardHeader>
              <CardTitle>API Configuration</CardTitle>
              <CardDescription>Integrate FlowFuse into your application</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>API Key</Label>
                <div className="flex gap-2">
                  <Input value={config?.api_key || "Generate configuration first"} readOnly />
                  <Button variant="outline" size="icon" onClick={copyApiKey}>
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default WhiteLabel;
