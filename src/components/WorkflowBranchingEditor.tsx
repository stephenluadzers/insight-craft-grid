import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { GitBranch, Plus, X, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Branch {
  id: string;
  name: string;
  condition: {
    field: string;
    operator: string;
    value: string;
  };
  nodes: any[];
}

interface WorkflowBranchingEditorProps {
  node: any;
  onUpdate: (nodeId: string, branches: Branch[]) => void;
}

export function WorkflowBranchingEditor({ node, onUpdate }: WorkflowBranchingEditorProps) {
  const [branches, setBranches] = useState<Branch[]>(node.data?.branches || []);
  const [editingBranch, setEditingBranch] = useState<Branch | null>(null);
  const { toast } = useToast();

  const operators = [
    { value: 'equals', label: 'Equals' },
    { value: 'not_equals', label: 'Not Equals' },
    { value: 'contains', label: 'Contains' },
    { value: 'greater_than', label: 'Greater Than' },
    { value: 'less_than', label: 'Less Than' },
    { value: 'exists', label: 'Exists' },
    { value: 'is_empty', label: 'Is Empty' },
  ];

  const createNewBranch = () => {
    setEditingBranch({
      id: crypto.randomUUID(),
      name: `Branch ${branches.length + 1}`,
      condition: {
        field: '',
        operator: 'equals',
        value: '',
      },
      nodes: [],
    });
  };

  const saveBranch = () => {
    if (!editingBranch) return;

    const existing = branches.find(b => b.id === editingBranch.id);
    let updatedBranches;

    if (existing) {
      updatedBranches = branches.map(b => b.id === editingBranch.id ? editingBranch : b);
    } else {
      updatedBranches = [...branches, editingBranch];
    }

    setBranches(updatedBranches);
    onUpdate(node.id, updatedBranches);
    setEditingBranch(null);

    toast({
      title: "Branch Saved",
      description: "Conditional branch has been configured",
    });
  };

  const deleteBranch = (branchId: string) => {
    const updatedBranches = branches.filter(b => b.id !== branchId);
    setBranches(updatedBranches);
    onUpdate(node.id, updatedBranches);
    
    toast({
      title: "Branch Deleted",
      description: "Conditional branch has been removed",
    });
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <GitBranch className="h-5 w-5" />
              Conditional Branching
            </CardTitle>
            <CardDescription>
              Create parallel execution paths based on conditions
            </CardDescription>
          </div>
          <Button onClick={createNewBranch} size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Add Branch
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {editingBranch ? (
          <div className="space-y-4 p-4 border rounded-lg bg-muted/50">
            <div className="space-y-2">
              <Label htmlFor="branch-name">Branch Name</Label>
              <Input
                id="branch-name"
                value={editingBranch.name}
                onChange={(e) => setEditingBranch({ ...editingBranch, name: e.target.value })}
                placeholder="e.g., High Priority Path"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="condition-field">Condition Field</Label>
              <Input
                id="condition-field"
                value={editingBranch.condition.field}
                onChange={(e) => setEditingBranch({
                  ...editingBranch,
                  condition: { ...editingBranch.condition, field: e.target.value }
                })}
                placeholder="e.g., user.status"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="condition-operator">Operator</Label>
                <Select
                  value={editingBranch.condition.operator}
                  onValueChange={(value) => setEditingBranch({
                    ...editingBranch,
                    condition: { ...editingBranch.condition, operator: value }
                  })}
                >
                  <SelectTrigger id="condition-operator">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {operators.map((op) => (
                      <SelectItem key={op.value} value={op.value}>
                        {op.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="condition-value">Value</Label>
                <Input
                  id="condition-value"
                  value={editingBranch.condition.value}
                  onChange={(e) => setEditingBranch({
                    ...editingBranch,
                    condition: { ...editingBranch.condition, value: e.target.value }
                  })}
                  placeholder="Comparison value"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <Button onClick={saveBranch} size="sm">
                <Check className="h-4 w-4 mr-2" />
                Save Branch
              </Button>
              <Button onClick={() => setEditingBranch(null)} size="sm" variant="outline">
                Cancel
              </Button>
            </div>
          </div>
        ) : branches.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">
            <GitBranch className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No branches configured yet</p>
            <p className="text-xs">Add branches to create conditional execution paths</p>
          </div>
        ) : (
          <div className="space-y-2">
            {branches.map((branch) => (
              <div key={branch.id} className="flex items-center justify-between p-3 rounded-lg border">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-medium">{branch.name}</h4>
                    <Badge variant="outline" className="text-xs">
                      {branch.condition.field} {branch.condition.operator} {branch.condition.value}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {branch.nodes.length} node(s) in this path
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setEditingBranch(branch)}
                  >
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => deleteBranch(branch.id)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
