import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Plus, Upload, Search, Loader2, Database, FileText } from "lucide-react";
import { toast } from "sonner";
import type { KnowledgeBase } from "@/types/workflow-authoring";

interface RAGKnowledgePanelProps {
  workspaceId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedKbId?: string | null;
  onSelect?: (kb: KnowledgeBase) => void;
}

/**
 * Wave 2 — RAG / Knowledge base manager.
 * List, create, ingest, and test-query knowledge bases used by the RAG node.
 */
export const RAGKnowledgePanel = ({
  workspaceId, open, onOpenChange, selectedKbId, onSelect,
}: RAGKnowledgePanelProps) => {
  const [kbs, setKbs] = useState<KnowledgeBase[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [activeKb, setActiveKb] = useState<KnowledgeBase | null>(null);
  const [ingestText, setIngestText] = useState("");
  const [ingestTitle, setIngestTitle] = useState("");
  const [ingesting, setIngesting] = useState(false);
  const [query, setQuery] = useState("");
  const [querying, setQuerying] = useState(false);
  const [matches, setMatches] = useState<Array<{ title?: string; content: string; similarity: number }>>([]);

  const fetchKbs = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("knowledge_bases")
      .select("*")
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: false });
    setLoading(false);
    if (error) { toast.error(error.message); return; }
    setKbs((data ?? []) as unknown as KnowledgeBase[]);
  };

  useEffect(() => { if (open) fetchKbs(); /* eslint-disable-next-line */ }, [open, workspaceId]);

  const createKb = async () => {
    if (!newName.trim()) return;
    setCreating(true);
    const { data, error } = await supabase
      .from("knowledge_bases")
      .insert({ workspace_id: workspaceId, name: newName.trim() })
      .select()
      .single();
    setCreating(false);
    if (error) { toast.error(error.message); return; }
    setNewName("");
    setKbs((arr) => [data as unknown as KnowledgeBase, ...arr]);
    toast.success("Knowledge base created");
  };

  const ingest = async () => {
    if (!activeKb || !ingestText.trim()) return;
    setIngesting(true);
    const { error, data } = await supabase.functions.invoke("rag-knowledge", {
      body: {
        action: "ingest",
        kbId: activeKb.id,
        documents: [{ title: ingestTitle || "Untitled", content: ingestText }],
      },
    });
    setIngesting(false);
    if (error) { toast.error(error.message); return; }
    toast.success(`Ingested ${data?.ingested ?? 0} chunks`);
    setIngestText(""); setIngestTitle("");
    fetchKbs();
  };

  const runQuery = async () => {
    if (!activeKb || !query.trim()) return;
    setQuerying(true);
    setMatches([]);
    const { error, data } = await supabase.functions.invoke("rag-knowledge", {
      body: { action: "query", kbId: activeKb.id, query, topK: 5 },
    });
    setQuerying(false);
    if (error) { toast.error(error.message); return; }
    setMatches(data?.matches ?? []);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl glass border-border/40">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Database className="w-5 h-5 text-primary" /> Knowledge bases
          </DialogTitle>
          <DialogDescription>
            Upload documents, then drop a RAG node onto any flow to query them.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-[260px_1fr] gap-4 h-[480px]">
          <div className="space-y-2 border-r border-border/40 pr-3 overflow-hidden flex flex-col">
            <div className="flex gap-2">
              <Input
                placeholder="New KB name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="h-8 text-sm"
              />
              <Button size="sm" onClick={createKb} disabled={creating || !newName.trim()}>
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            <ScrollArea className="flex-1">
              {loading && <p className="text-xs text-muted-foreground p-2">Loading…</p>}
              {!loading && kbs.length === 0 && <p className="text-xs text-muted-foreground p-2">No knowledge bases yet.</p>}
              <div className="space-y-1">
                {kbs.map((kb) => (
                  <button
                    key={kb.id}
                    onClick={() => { setActiveKb(kb); onSelect?.(kb); }}
                    className={`w-full text-left p-2 rounded-lg text-sm transition glass border ${
                      activeKb?.id === kb.id || selectedKbId === kb.id
                        ? "border-primary/50 bg-primary/10"
                        : "border-border/30 hover:border-border/60"
                    }`}
                  >
                    <div className="font-medium truncate">{kb.name}</div>
                    <div className="text-[10px] text-muted-foreground">
                      {kb.document_count} docs
                    </div>
                  </button>
                ))}
              </div>
            </ScrollArea>
          </div>

          <div className="overflow-hidden flex flex-col space-y-3">
            {!activeKb && (
              <div className="flex-1 grid place-items-center text-sm text-muted-foreground">
                Select or create a knowledge base.
              </div>
            )}
            {activeKb && (
              <>
                <Card className="p-3 glass border-border/40 space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-semibold">{activeKb.name}</h4>
                    <Badge variant="outline">{activeKb.document_count} docs</Badge>
                  </div>
                  <Label className="text-xs">Add document</Label>
                  <Input
                    value={ingestTitle}
                    onChange={(e) => setIngestTitle(e.target.value)}
                    placeholder="Title"
                    className="h-8 text-sm"
                  />
                  <Textarea
                    rows={4}
                    value={ingestText}
                    onChange={(e) => setIngestText(e.target.value)}
                    placeholder="Paste content here…"
                    className="text-xs"
                  />
                  <Button size="sm" onClick={ingest} disabled={ingesting || !ingestText.trim()}>
                    {ingesting ? <><Loader2 className="w-4 h-4 mr-1 animate-spin" /> Ingesting…</>
                               : <><Upload className="w-4 h-4 mr-1" /> Ingest</>}
                  </Button>
                </Card>

                <Card className="p-3 glass border-border/40 space-y-2 flex-1 overflow-hidden flex flex-col">
                  <Label className="text-xs">Test query</Label>
                  <div className="flex gap-2">
                    <Input
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder="Ask the knowledge base…"
                      className="h-8 text-sm"
                    />
                    <Button size="sm" onClick={runQuery} disabled={querying || !query.trim()}>
                      {querying ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                    </Button>
                  </div>
                  <ScrollArea className="flex-1">
                    <div className="space-y-2">
                      {matches.map((m, i) => (
                        <div key={i} className="p-2 rounded-lg glass border border-border/30 text-xs">
                          <div className="flex items-center gap-2 mb-1">
                            <FileText className="w-3 h-3" />
                            <span className="font-medium truncate">{m.title ?? "Untitled"}</span>
                            <Badge variant="outline" className="ml-auto text-[10px]">
                              {(m.similarity * 100).toFixed(0)}%
                            </Badge>
                          </div>
                          <p className="text-muted-foreground line-clamp-3">{m.content}</p>
                        </div>
                      ))}
                      {matches.length === 0 && !querying && (
                        <p className="text-xs text-muted-foreground p-2">No matches yet.</p>
                      )}
                    </div>
                  </ScrollArea>
                </Card>
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
