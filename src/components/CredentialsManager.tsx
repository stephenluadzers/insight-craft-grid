import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Key, Trash2, Plus } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface Credential {
  id: string;
  name: string;
  type: string;
  created_at: string;
}

export const CredentialsManager = ({ workspaceId }: { workspaceId: string }) => {
  const [open, setOpen] = useState(false);
  const [newCred, setNewCred] = useState({
    name: "",
    type: "api_key",
    value: "",
  });
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: credentials, isLoading } = useQuery({
    queryKey: ["credentials", workspaceId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("workflow_credentials")
        .select("id, name, type, created_at")
        .eq("workspace_id", workspaceId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as Credential[];
    },
  });

  const createCredential = useMutation({
    mutationFn: async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error("Not authenticated");

      const { error } = await supabase.from("workflow_credentials").insert({
        workspace_id: workspaceId,
        name: newCred.name,
        type: newCred.type,
        encrypted_data: { value: newCred.value }, // In production, encrypt this
        created_by: userData.user.id,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["credentials", workspaceId] });
      toast({ title: "Credential saved securely" });
      setNewCred({ name: "", type: "api_key", value: "" });
      setOpen(false);
    },
    onError: (error: Error) => {
      toast({ title: "Error saving credential", description: error.message, variant: "destructive" });
    },
  });

  const deleteCredential = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("workflow_credentials").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["credentials", workspaceId] });
      toast({ title: "Credential deleted" });
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Key className="w-5 h-5" />
          Credentials Manager
        </CardTitle>
        <CardDescription>Securely store API keys and authentication credentials</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="w-full">
                <Plus className="w-4 h-4 mr-2" />
                Add Credential
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Credential</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div>
                  <Label htmlFor="cred-name">Name</Label>
                  <Input
                    id="cred-name"
                    placeholder="e.g., OpenAI API Key"
                    value={newCred.name}
                    onChange={(e) => setNewCred({ ...newCred, name: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="cred-type">Type</Label>
                  <Select value={newCred.type} onValueChange={(value) => setNewCred({ ...newCred, type: value })}>
                    <SelectTrigger id="cred-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="api_key">API Key</SelectItem>
                      <SelectItem value="oauth">OAuth Token</SelectItem>
                      <SelectItem value="basic_auth">Basic Auth</SelectItem>
                      <SelectItem value="bearer">Bearer Token</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="cred-value">Value</Label>
                  <Textarea
                    id="cred-value"
                    placeholder="Enter API key or token"
                    value={newCred.value}
                    onChange={(e) => setNewCred({ ...newCred, value: e.target.value })}
                  />
                </div>
                <Button onClick={() => createCredential.mutate()} disabled={!newCred.name || !newCred.value}>
                  Save Credential
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          {isLoading ? (
            <div className="text-sm text-muted-foreground">Loading credentials...</div>
          ) : credentials && credentials.length > 0 ? (
            <div className="space-y-2">
              {credentials.map((cred) => (
                <div key={cred.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <div className="font-medium">{cred.name}</div>
                    <div className="text-sm text-muted-foreground">{cred.type}</div>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => deleteCredential.mutate(cred.id)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-sm text-muted-foreground text-center py-8">No credentials saved yet</div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};