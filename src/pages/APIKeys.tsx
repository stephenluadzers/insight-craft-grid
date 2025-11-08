import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Key, Copy, Trash2, Plus, Eye, EyeOff } from "lucide-react";
import { format } from "date-fns";

interface APIKey {
  id: string;
  name: string;
  key_prefix: string;
  scopes: string[];
  last_used_at: string | null;
  expires_at: string | null;
  created_at: string;
  is_active: boolean;
  workspace_id: string;
}

export default function APIKeys() {
  const [apiKeys, setApiKeys] = useState<APIKey[]>([]);
  const [workspaces, setWorkspaces] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newKeyData, setNewKeyData] = useState<{ api_key: string } | null>(null);
  const [showFullKey, setShowFullKey] = useState(false);
  const { toast } = useToast();

  // Form state
  const [keyName, setKeyName] = useState("");
  const [selectedWorkspace, setSelectedWorkspace] = useState("");
  const [expiresInDays, setExpiresInDays] = useState("");

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Load workspaces
      const { data: workspaceData } = await supabase
        .from('workspace_members')
        .select('workspace_id, workspaces(id, name)')
        .eq('user_id', user.id)
        .in('role', ['owner', 'admin']);

      if (workspaceData) {
        const ws = workspaceData.map(w => w.workspaces).filter(Boolean);
        setWorkspaces(ws);
        if (ws.length > 0 && !selectedWorkspace) {
          setSelectedWorkspace(ws[0].id);
        }
      }

      // Load API keys
      const { data, error } = await supabase.functions.invoke('api-keys', {
        method: 'GET'
      });

      if (error) throw error;
      setApiKeys(data.data || []);
    } catch (error: any) {
      toast({
        title: "Error loading data",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const createAPIKey = async () => {
    if (!keyName || !selectedWorkspace) {
      toast({
        title: "Missing fields",
        description: "Name and workspace are required",
        variant: "destructive"
      });
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke('api-keys', {
        method: 'POST',
        body: {
          name: keyName,
          workspace_id: selectedWorkspace,
          expires_in_days: expiresInDays ? parseInt(expiresInDays) : undefined
        }
      });

      if (error) throw error;

      setNewKeyData(data);
      setKeyName("");
      setExpiresInDays("");
      loadData();

      toast({
        title: "API Key Created",
        description: "Save this key - it will not be shown again!"
      });
    } catch (error: any) {
      toast({
        title: "Error creating key",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const revokeKey = async (keyId: string) => {
    try {
      const { error } = await supabase.functions.invoke(`api-keys/${keyId}`, {
        method: 'DELETE'
      });

      if (error) throw error;

      toast({
        title: "Key Revoked",
        description: "API key has been revoked"
      });

      loadData();
    } catch (error: any) {
      toast({
        title: "Error revoking key",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied",
      description: "API key copied to clipboard"
    });
  };

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">API Keys</h1>
        <p className="text-muted-foreground">
          Manage your API keys for programmatic access to workflows
        </p>
      </div>

      <div className="mb-6">
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Create API Key
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New API Key</DialogTitle>
              <DialogDescription>
                Generate a new API key for programmatic access
              </DialogDescription>
            </DialogHeader>

            {newKeyData ? (
              <div className="space-y-4">
                <div className="p-4 bg-muted rounded-lg">
                  <Label className="text-sm font-medium mb-2 block">Your API Key</Label>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 p-2 bg-background rounded text-sm font-mono break-all">
                      {showFullKey ? newKeyData.api_key : newKeyData.api_key.substring(0, 20) + '...'}
                    </code>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => setShowFullKey(!showFullKey)}
                    >
                      {showFullKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => copyToClipboard(newKeyData.api_key)}
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                  <p className="text-sm text-destructive mt-2">
                    ⚠️ Save this key now - it will not be shown again!
                  </p>
                </div>
                <DialogFooter>
                  <Button onClick={() => {
                    setNewKeyData(null);
                    setShowCreateDialog(false);
                  }}>
                    Done
                  </Button>
                </DialogFooter>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="name">Key Name</Label>
                  <Input
                    id="name"
                    placeholder="Production API Key"
                    value={keyName}
                    onChange={(e) => setKeyName(e.target.value)}
                  />
                </div>

                <div>
                  <Label htmlFor="workspace">Workspace</Label>
                  <Select value={selectedWorkspace} onValueChange={setSelectedWorkspace}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select workspace" />
                    </SelectTrigger>
                    <SelectContent>
                      {workspaces.map(ws => (
                        <SelectItem key={ws.id} value={ws.id}>
                          {ws.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="expires">Expires In (Days)</Label>
                  <Input
                    id="expires"
                    type="number"
                    placeholder="Never (leave empty)"
                    value={expiresInDays}
                    onChange={(e) => setExpiresInDays(e.target.value)}
                  />
                </div>

                <DialogFooter>
                  <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                    Cancel
                  </Button>
                  <Button onClick={createAPIKey}>Create Key</Button>
                </DialogFooter>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4">
        {loading ? (
          <Card>
            <CardContent className="p-6">
              <p className="text-center text-muted-foreground">Loading...</p>
            </CardContent>
          </Card>
        ) : apiKeys.length === 0 ? (
          <Card>
            <CardContent className="p-6">
              <p className="text-center text-muted-foreground">
                No API keys yet. Create one to get started.
              </p>
            </CardContent>
          </Card>
        ) : (
          apiKeys.map(key => (
            <Card key={key.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <Key className="w-5 h-5" />
                    <div>
                      <CardTitle className="text-lg">{key.name}</CardTitle>
                      <CardDescription className="font-mono text-xs mt-1">
                        {key.key_prefix}
                      </CardDescription>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={key.is_active ? "default" : "secondary"}>
                      {key.is_active ? "Active" : "Revoked"}
                    </Badge>
                    {key.is_active && (
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => revokeKey(key.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground mb-1">Created</p>
                    <p>{format(new Date(key.created_at), 'MMM d, yyyy')}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground mb-1">Last Used</p>
                    <p>{key.last_used_at ? format(new Date(key.last_used_at), 'MMM d, yyyy') : 'Never'}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground mb-1">Expires</p>
                    <p>{key.expires_at ? format(new Date(key.expires_at), 'MMM d, yyyy') : 'Never'}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
