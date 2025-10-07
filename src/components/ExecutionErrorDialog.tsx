import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { XCircle, Lightbulb, RefreshCw } from "lucide-react";
import { generateErrorFixes } from "@/lib/workflowValidation";

interface ExecutionErrorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  error: {
    nodeTitle: string;
    nodeType: string;
    errorMessage: string;
    fullLog?: string;
  } | null;
  onRetry: () => void;
  onReconfigure: () => void;
}

export const ExecutionErrorDialog = ({
  open,
  onOpenChange,
  error,
  onRetry,
  onReconfigure,
}: ExecutionErrorDialogProps) => {
  if (!error) return null;

  const suggestedFixes = generateErrorFixes(error.errorMessage, error.nodeType);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <XCircle className="w-5 h-5 text-destructive" />
            Workflow Execution Failed
          </DialogTitle>
          <DialogDescription>
            The workflow encountered an error during execution
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Error Summary */}
          <div className="p-4 rounded-lg border bg-card">
            <div className="flex items-center justify-between mb-2">
              <div>
                <div className="font-medium">{error.nodeTitle}</div>
                <div className="text-xs text-muted-foreground">
                  Node Type: {error.nodeType}
                </div>
              </div>
              <Badge variant="destructive">Failed</Badge>
            </div>
            <div className="text-sm text-muted-foreground">
              <span className="font-medium">Problem:</span> {error.errorMessage}
            </div>
          </div>

          {/* Suggested Fixes */}
          {suggestedFixes.length > 0 && (
            <div className="p-4 rounded-lg border bg-accent/10">
              <div className="flex items-center gap-2 mb-3">
                <Lightbulb className="w-4 h-4 text-yellow-500" />
                <span className="font-medium text-sm">Suggested Fixes</span>
              </div>
              <ol className="list-decimal list-inside space-y-2">
                {suggestedFixes.map((fix, idx) => (
                  <li key={idx} className="text-sm text-muted-foreground">
                    {fix}
                  </li>
                ))}
              </ol>
            </div>
          )}

          {/* Full Error Log */}
          {error.fullLog && (
            <details className="group">
              <summary className="cursor-pointer text-sm font-medium mb-2 hover:text-primary">
                See full error log ↓
              </summary>
              <ScrollArea className="h-[200px] rounded-md border p-3 bg-muted">
                <pre className="text-xs font-mono whitespace-pre-wrap">
                  {error.fullLog}
                </pre>
              </ScrollArea>
            </details>
          )}

          {/* Actions */}
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={onReconfigure}>
              Reconfigure Node
            </Button>
            <Button onClick={onRetry} className="gap-2">
              <RefreshCw className="w-4 h-4" />
              Retry Execution
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
