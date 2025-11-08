import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Plus, Minus, Edit3 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface WorkflowVersion {
  id: string;
  version_number: number;
  name: string;
  nodes: any;
}

interface DiffResult {
  added: any[];
  removed: any[];
  modified: any[];
}

interface WorkflowVersionDiffProps {
  fromVersionId: string;
  toVersionId: string;
}

export function WorkflowVersionDiff({ fromVersionId, toVersionId }: WorkflowVersionDiffProps) {
  const [fromVersion, setFromVersion] = useState<WorkflowVersion | null>(null);
  const [toVersion, setToVersion] = useState<WorkflowVersion | null>(null);
  const [diff, setDiff] = useState<DiffResult | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadVersionsAndCalculateDiff();
  }, [fromVersionId, toVersionId]);

  const loadVersionsAndCalculateDiff = async () => {
    try {
      // Load both versions
      const [fromResult, toResult] = await Promise.all([
        supabase.from('workflow_versions').select('id, version_number, name, nodes').eq('id', fromVersionId).single(),
        supabase.from('workflow_versions').select('id, version_number, name, nodes').eq('id', toVersionId).single(),
      ]);

      if (fromResult.error) throw fromResult.error;
      if (toResult.error) throw toResult.error;

      setFromVersion(fromResult.data as any);
      setToVersion(toResult.data as any);

      // Calculate diff
      const fromNodesArray = Array.isArray((fromResult.data as any)?.nodes) ? (fromResult.data as any).nodes : [];
      const toNodesArray = Array.isArray((toResult.data as any)?.nodes) ? (toResult.data as any).nodes : [];
      const diffResult = calculateDiff(fromNodesArray, toNodesArray);
      setDiff(diffResult);
    } catch (error: any) {
      toast({
        title: "Error loading versions",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const calculateDiff = (fromNodes: any[], toNodes: any[]): DiffResult => {
    const fromNodeMap = new Map(fromNodes.map(n => [n.id, n]));
    const toNodeMap = new Map(toNodes.map(n => [n.id, n]));

    const added: any[] = [];
    const removed: any[] = [];
    const modified: any[] = [];

    // Find added and modified nodes
    toNodes.forEach(toNode => {
      const fromNode = fromNodeMap.get(toNode.id);
      if (!fromNode) {
        added.push(toNode);
      } else if (JSON.stringify(fromNode) !== JSON.stringify(toNode)) {
        modified.push({ from: fromNode, to: toNode });
      }
    });

    // Find removed nodes
    fromNodes.forEach(fromNode => {
      if (!toNodeMap.has(fromNode.id)) {
        removed.push(fromNode);
      }
    });

    return { added, removed, modified };
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (!fromVersion || !toVersion || !diff) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          Unable to load version comparison
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Version Comparison</CardTitle>
        <CardDescription>
          Comparing v{fromVersion.version_number} ({fromVersion.name}) → v{toVersion.version_number} ({toVersion.name})
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Plus className="h-4 w-4 text-green-500" />
                <span className="text-sm font-medium">Added Nodes</span>
              </div>
              <p className="text-2xl font-bold text-green-500">{diff.added.length}</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Minus className="h-4 w-4 text-red-500" />
                <span className="text-sm font-medium">Removed Nodes</span>
              </div>
              <p className="text-2xl font-bold text-red-500">{diff.removed.length}</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Edit3 className="h-4 w-4 text-blue-500" />
                <span className="text-sm font-medium">Modified Nodes</span>
              </div>
              <p className="text-2xl font-bold text-blue-500">{diff.modified.length}</p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="added">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="added">
              Added ({diff.added.length})
            </TabsTrigger>
            <TabsTrigger value="removed">
              Removed ({diff.removed.length})
            </TabsTrigger>
            <TabsTrigger value="modified">
              Modified ({diff.modified.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="added" className="space-y-3">
            {diff.added.length === 0 ? (
              <p className="text-center py-8 text-muted-foreground">No nodes added</p>
            ) : (
              diff.added.map((node) => (
                <div key={node.id} className="p-3 border border-green-500/30 bg-green-500/5 rounded">
                  <div className="flex items-center gap-2 mb-2">
                    <Plus className="h-4 w-4 text-green-500" />
                    <Badge>{node.type}</Badge>
                    <span className="font-medium">{node.data?.label || node.id}</span>
                  </div>
                  <pre className="text-xs bg-muted p-2 rounded overflow-x-auto">
                    {JSON.stringify(node, null, 2)}
                  </pre>
                </div>
              ))
            )}
          </TabsContent>

          <TabsContent value="removed" className="space-y-3">
            {diff.removed.length === 0 ? (
              <p className="text-center py-8 text-muted-foreground">No nodes removed</p>
            ) : (
              diff.removed.map((node) => (
                <div key={node.id} className="p-3 border border-red-500/30 bg-red-500/5 rounded">
                  <div className="flex items-center gap-2 mb-2">
                    <Minus className="h-4 w-4 text-red-500" />
                    <Badge variant="destructive">{node.type}</Badge>
                    <span className="font-medium">{node.data?.label || node.id}</span>
                  </div>
                  <pre className="text-xs bg-muted p-2 rounded overflow-x-auto">
                    {JSON.stringify(node, null, 2)}
                  </pre>
                </div>
              ))
            )}
          </TabsContent>

          <TabsContent value="modified" className="space-y-3">
            {diff.modified.length === 0 ? (
              <p className="text-center py-8 text-muted-foreground">No nodes modified</p>
            ) : (
              diff.modified.map((change, idx) => (
                <div key={idx} className="p-3 border border-blue-500/30 bg-blue-500/5 rounded space-y-2">
                  <div className="flex items-center gap-2">
                    <Edit3 className="h-4 w-4 text-blue-500" />
                    <Badge variant="outline">{change.to.type}</Badge>
                    <span className="font-medium">{change.to.data?.label || change.to.id}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <p className="text-xs font-medium mb-1 text-red-500">Before:</p>
                      <pre className="text-xs bg-muted p-2 rounded overflow-x-auto">
                        {JSON.stringify(change.from, null, 2)}
                      </pre>
                    </div>
                    <div>
                      <p className="text-xs font-medium mb-1 text-green-500">After:</p>
                      <pre className="text-xs bg-muted p-2 rounded overflow-x-auto">
                        {JSON.stringify(change.to, null, 2)}
                      </pre>
                    </div>
                  </div>
                </div>
              ))
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
