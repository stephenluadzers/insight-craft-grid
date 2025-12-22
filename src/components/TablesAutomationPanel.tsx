import { useState, useEffect } from "react";
import { Table, Play, Plus, Trash2, Zap, CheckCircle, Clock, ArrowRight } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { ScrollArea } from "./ui/scroll-area";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface TableRow {
  id: string;
  [key: string]: any;
}

interface TableColumn {
  id: string;
  name: string;
  type: "text" | "number" | "date" | "status" | "email";
}

interface AutomationRule {
  id: string;
  name: string;
  trigger: "row_added" | "row_updated" | "status_changed" | "value_changed";
  triggerColumn?: string;
  triggerValue?: string;
  action: "webhook" | "email" | "workflow";
  actionConfig: Record<string, any>;
  enabled: boolean;
  freeTask: boolean;
  executionCount: number;
}

interface TablesAutomationPanelProps {
  workflowId?: string;
  onTriggerWorkflow?: (data: Record<string, any>) => void;
}

export const TablesAutomationPanel = ({ workflowId, onTriggerWorkflow }: TablesAutomationPanelProps) => {
  const { toast } = useToast();
  const [columns] = useState<TableColumn[]>([
    { id: "name", name: "Name", type: "text" },
    { id: "email", name: "Email", type: "email" },
    { id: "status", name: "Status", type: "status" },
    { id: "created", name: "Created", type: "date" },
  ]);
  
  const [rows, setRows] = useState<TableRow[]>([
    { id: "1", name: "John Doe", email: "john@example.com", status: "Active", created: "2024-01-15" },
    { id: "2", name: "Jane Smith", email: "jane@example.com", status: "Pending", created: "2024-01-16" },
    { id: "3", name: "Bob Wilson", email: "bob@example.com", status: "Active", created: "2024-01-17" },
  ]);
  
  const [automations, setAutomations] = useState<AutomationRule[]>([
    {
      id: "auto-1",
      name: "New row notification",
      trigger: "row_added",
      action: "workflow",
      actionConfig: { workflowId: "default" },
      enabled: true,
      freeTask: true,
      executionCount: 12,
    },
    {
      id: "auto-2",
      name: "Status change webhook",
      trigger: "status_changed",
      triggerColumn: "status",
      action: "webhook",
      actionConfig: { url: "https://hooks.zapier.com/..." },
      enabled: true,
      freeTask: true,
      executionCount: 8,
    },
  ]);
  
  const [showAddAutomation, setShowAddAutomation] = useState(false);
  const [newAutomation, setNewAutomation] = useState<Partial<AutomationRule>>({
    trigger: "row_added",
    action: "workflow",
    freeTask: true,
  });
  const [editingCell, setEditingCell] = useState<{ rowId: string; columnId: string } | null>(null);

  const handleCellEdit = (rowId: string, columnId: string, value: string) => {
    const oldRow = rows.find(r => r.id === rowId);
    const oldValue = oldRow?.[columnId];
    
    setRows(rows.map(row => 
      row.id === rowId ? { ...row, [columnId]: value } : row
    ));
    setEditingCell(null);
    
    // Trigger automations
    const triggeredRules = automations.filter(a => 
      a.enabled && 
      (a.trigger === "row_updated" || 
       (a.trigger === "value_changed" && a.triggerColumn === columnId) ||
       (a.trigger === "status_changed" && columnId === "status" && oldValue !== value))
    );
    
    triggeredRules.forEach(rule => {
      executeAutomation(rule, { rowId, columnId, oldValue, newValue: value });
    });
  };

  const handleAddRow = () => {
    const newRow: TableRow = {
      id: `row-${Date.now()}`,
      name: "",
      email: "",
      status: "Pending",
      created: new Date().toISOString().split("T")[0],
    };
    setRows([...rows, newRow]);
    
    // Trigger row_added automations
    const triggeredRules = automations.filter(a => a.enabled && a.trigger === "row_added");
    triggeredRules.forEach(rule => {
      executeAutomation(rule, newRow);
    });
    
    toast({
      title: "Row added",
      description: `${triggeredRules.length} automation(s) triggered`,
    });
  };

  const executeAutomation = (rule: AutomationRule, data: Record<string, any>) => {
    console.log(`Executing automation: ${rule.name}`, data);
    
    // Update execution count
    setAutomations(automations.map(a => 
      a.id === rule.id ? { ...a, executionCount: a.executionCount + 1 } : a
    ));
    
    if (rule.action === "workflow" && onTriggerWorkflow) {
      onTriggerWorkflow(data);
    }
    
    toast({
      title: "Automation triggered",
      description: (
        <div className="flex items-center gap-2">
          <span>{rule.name}</span>
          {rule.freeTask && (
            <Badge variant="secondary" className="text-xs">Free task</Badge>
          )}
        </div>
      ),
    });
  };

  const handleAddAutomation = () => {
    if (!newAutomation.name) return;
    
    const automation: AutomationRule = {
      id: `auto-${Date.now()}`,
      name: newAutomation.name || "New automation",
      trigger: newAutomation.trigger || "row_added",
      triggerColumn: newAutomation.triggerColumn,
      action: newAutomation.action || "workflow",
      actionConfig: {},
      enabled: true,
      freeTask: true,
      executionCount: 0,
    };
    
    setAutomations([...automations, automation]);
    setShowAddAutomation(false);
    setNewAutomation({ trigger: "row_added", action: "workflow", freeTask: true });
    
    toast({
      title: "Automation created",
      description: "This automation runs on free tasks!",
    });
  };

  const toggleAutomation = (id: string) => {
    setAutomations(automations.map(a => 
      a.id === id ? { ...a, enabled: !a.enabled } : a
    ));
  };

  const deleteAutomation = (id: string) => {
    setAutomations(automations.filter(a => a.id !== id));
  };

  return (
    <div className="h-full flex flex-col gap-4 p-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Table className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">Tables</h2>
            <p className="text-sm text-muted-foreground">Automate with free tasks</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Badge variant="outline" className="gap-1.5">
            <CheckCircle className="w-3 h-3 text-green-500" />
            {automations.filter(a => a.freeTask).reduce((acc, a) => acc + a.executionCount, 0)} free executions
          </Badge>
        </div>
      </div>

      {/* Table */}
      <Card className="flex-1">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium">Data Table</CardTitle>
            <Button size="sm" onClick={handleAddRow}>
              <Plus className="w-4 h-4 mr-1.5" />
              Add Row
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[300px]">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  {columns.map(col => (
                    <th key={col.id} className="text-left py-2 px-3 font-medium text-muted-foreground">
                      {col.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map(row => (
                  <tr key={row.id} className="border-b border-border/50 hover:bg-muted/50">
                    {columns.map(col => (
                      <td key={col.id} className="py-2 px-3">
                        {editingCell?.rowId === row.id && editingCell?.columnId === col.id ? (
                          <Input
                            autoFocus
                            defaultValue={row[col.id]}
                            className="h-7 text-sm"
                            onBlur={(e) => handleCellEdit(row.id, col.id, e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                handleCellEdit(row.id, col.id, (e.target as HTMLInputElement).value);
                              }
                              if (e.key === "Escape") {
                                setEditingCell(null);
                              }
                            }}
                          />
                        ) : (
                          <span
                            className={cn(
                              "cursor-pointer hover:bg-muted px-1 py-0.5 rounded",
                              col.type === "status" && row[col.id] === "Active" && "text-green-600",
                              col.type === "status" && row[col.id] === "Pending" && "text-yellow-600"
                            )}
                            onClick={() => setEditingCell({ rowId: row.id, columnId: col.id })}
                          >
                            {row[col.id]}
                          </span>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Automations */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Zap className="w-4 h-4 text-yellow-500" />
                Table Automations
              </CardTitle>
              <CardDescription className="text-xs mt-1">
                Every update can trigger workflows across 8,000+ apps — for free!
              </CardDescription>
            </div>
            <Dialog open={showAddAutomation} onOpenChange={setShowAddAutomation}>
              <DialogTrigger asChild>
                <Button size="sm" variant="outline">
                  <Plus className="w-4 h-4 mr-1.5" />
                  Add
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create Automation</DialogTitle>
                  <DialogDescription>
                    Set up an automation that runs on free tasks
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div>
                    <label className="text-sm font-medium">Name</label>
                    <Input
                      placeholder="My automation"
                      value={newAutomation.name || ""}
                      onChange={(e) => setNewAutomation({ ...newAutomation, name: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Trigger</label>
                    <Select
                      value={newAutomation.trigger}
                      onValueChange={(v: any) => setNewAutomation({ ...newAutomation, trigger: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="row_added">Row added</SelectItem>
                        <SelectItem value="row_updated">Row updated</SelectItem>
                        <SelectItem value="status_changed">Status changed</SelectItem>
                        <SelectItem value="value_changed">Value changed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Action</label>
                    <Select
                      value={newAutomation.action}
                      onValueChange={(v: any) => setNewAutomation({ ...newAutomation, action: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="workflow">Run workflow</SelectItem>
                        <SelectItem value="webhook">Send webhook</SelectItem>
                        <SelectItem value="email">Send email</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center gap-2 p-3 bg-green-500/10 rounded-lg">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span className="text-sm text-green-700">This automation will run on free tasks!</span>
                  </div>
                  <Button className="w-full" onClick={handleAddAutomation}>
                    Create Automation
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {automations.map(automation => (
              <div
                key={automation.id}
                className={cn(
                  "flex items-center justify-between p-3 rounded-lg border transition-colors",
                  automation.enabled ? "bg-background" : "bg-muted/50 opacity-60"
                )}
              >
                <div className="flex items-center gap-3">
                  <button
                    className={cn(
                      "h-8 w-8 rounded-full flex items-center justify-center transition-colors",
                      automation.enabled ? "bg-primary text-primary-foreground" : "bg-muted"
                    )}
                    onClick={() => toggleAutomation(automation.id)}
                  >
                    {automation.enabled ? (
                      <Play className="w-3.5 h-3.5" />
                    ) : (
                      <Clock className="w-3.5 h-3.5" />
                    )}
                  </button>
                  <div>
                    <p className="text-sm font-medium">{automation.name}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span className="capitalize">{automation.trigger.replace("_", " ")}</span>
                      <ArrowRight className="w-3 h-3" />
                      <span className="capitalize">{automation.action}</span>
                      {automation.freeTask && (
                        <Badge variant="secondary" className="text-[10px] px-1.5">Free</Badge>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">
                    {automation.executionCount} runs
                  </Badge>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground hover:text-destructive"
                    onClick={() => deleteAutomation(automation.id)}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
