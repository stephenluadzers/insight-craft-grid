import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Palette, Plus, Link2, Unlink, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { SharedStyleConfig, WorkflowNodeData } from "@/types/workflow";

interface SharedStylesPanelProps {
  nodes: WorkflowNodeData[];
  sharedStyles: SharedStyleConfig[];
  onStylesChange: (styles: SharedStyleConfig[]) => void;
  onApplyStyleToNode: (styleId: string, nodeId: string) => void;
  onRemoveStyleFromNode: (styleId: string, nodeId: string) => void;
}

export const SharedStylesPanel = ({
  nodes,
  sharedStyles,
  onStylesChange,
  onApplyStyleToNode,
  onRemoveStyleFromNode,
}: SharedStylesPanelProps) => {
  const [newStyleName, setNewStyleName] = useState("");
  const [selectedStyle, setSelectedStyle] = useState<string | null>(null);

  const handleCreateStyle = () => {
    if (!newStyleName.trim()) return;

    const newStyle: SharedStyleConfig = {
      id: `style-${Date.now()}`,
      name: newStyleName.trim(),
      values: {
        model: "default",
        temperature: 0.7,
        style_preset: "balanced",
        quality: "high",
      },
      appliedToNodes: [],
    };

    onStylesChange([...sharedStyles, newStyle]);
    setNewStyleName("");
  };

  const handleDeleteStyle = (styleId: string) => {
    onStylesChange(sharedStyles.filter((s) => s.id !== styleId));
    if (selectedStyle === styleId) setSelectedStyle(null);
  };

  const handleUpdateStyleValue = (styleId: string, key: string, value: any) => {
    onStylesChange(
      sharedStyles.map((s) =>
        s.id === styleId ? { ...s, values: { ...s.values, [key]: value } } : s
      )
    );
  };

  const currentStyle = sharedStyles.find((s) => s.id === selectedStyle);

  return (
    <Card className="h-full border-border/50 bg-card/50 backdrop-blur-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Palette className="w-5 h-5 text-primary" />
          <CardTitle className="text-lg">Shared Styles</CardTitle>
        </div>
        <CardDescription>
          Maintain consistent settings across nodes
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Create new style */}
        <div className="flex gap-2">
          <Input
            placeholder="New style name..."
            value={newStyleName}
            onChange={(e) => setNewStyleName(e.target.value)}
            className="flex-1"
            onKeyDown={(e) => e.key === "Enter" && handleCreateStyle()}
          />
          <Button size="sm" onClick={handleCreateStyle} disabled={!newStyleName.trim()}>
            <Plus className="w-4 h-4" />
          </Button>
        </div>

        {/* Style list */}
        <ScrollArea className="h-[200px]">
          <div className="space-y-2">
            {sharedStyles.map((style) => (
              <div
                key={style.id}
                onClick={() => setSelectedStyle(style.id)}
                className={cn(
                  "p-3 rounded-lg border cursor-pointer transition-all",
                  selectedStyle === style.id
                    ? "border-primary bg-primary/10"
                    : "border-border/50 hover:border-border"
                )}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium text-sm">{style.name}</span>
                  <div className="flex items-center gap-1">
                    <Badge variant="secondary" className="text-xs">
                      {style.appliedToNodes.length} nodes
                    </Badge>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-6 w-6"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteStyle(style.id);
                      }}
                    >
                      <Trash2 className="w-3 h-3 text-destructive" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}

            {sharedStyles.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                No shared styles yet. Create one to maintain consistency.
              </p>
            )}
          </div>
        </ScrollArea>

        {/* Style editor */}
        {currentStyle && (
          <div className="space-y-3 pt-3 border-t border-border/50">
            <h4 className="font-medium text-sm">Edit: {currentStyle.name}</h4>

            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs">Model</Label>
                  <Input
                    value={currentStyle.values.model || ""}
                    onChange={(e) =>
                      handleUpdateStyleValue(currentStyle.id, "model", e.target.value)
                    }
                    className="h-8 text-sm"
                  />
                </div>
                <div>
                  <Label className="text-xs">Temperature</Label>
                  <Input
                    type="number"
                    step="0.1"
                    min="0"
                    max="2"
                    value={currentStyle.values.temperature || 0.7}
                    onChange={(e) =>
                      handleUpdateStyleValue(
                        currentStyle.id,
                        "temperature",
                        parseFloat(e.target.value)
                      )
                    }
                    className="h-8 text-sm"
                  />
                </div>
              </div>

              <div>
                <Label className="text-xs">Style Preset</Label>
                <Input
                  value={currentStyle.values.style_preset || ""}
                  onChange={(e) =>
                    handleUpdateStyleValue(currentStyle.id, "style_preset", e.target.value)
                  }
                  className="h-8 text-sm"
                />
              </div>
            </div>

            {/* Apply to nodes */}
            <div className="pt-2">
              <Label className="text-xs mb-2 block">Apply to nodes:</Label>
              <div className="flex flex-wrap gap-1">
                {nodes.map((node) => {
                  const isApplied = currentStyle.appliedToNodes.includes(node.id);
                  return (
                    <Badge
                      key={node.id}
                      variant={isApplied ? "default" : "outline"}
                      className={cn(
                        "cursor-pointer text-xs transition-all",
                        isApplied && "bg-primary"
                      )}
                      onClick={() =>
                        isApplied
                          ? onRemoveStyleFromNode(currentStyle.id, node.id)
                          : onApplyStyleToNode(currentStyle.id, node.id)
                      }
                    >
                      {isApplied ? (
                        <Link2 className="w-3 h-3 mr-1" />
                      ) : (
                        <Unlink className="w-3 h-3 mr-1" />
                      )}
                      {node.title}
                    </Badge>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
