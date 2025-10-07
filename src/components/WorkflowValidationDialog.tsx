import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CheckCircle, XCircle, AlertTriangle, ExternalLink } from "lucide-react";
import { ValidationResult } from "@/lib/workflowValidation";

interface WorkflowValidationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  validation: ValidationResult | null;
  onRunAnyway: () => void;
  onFixIssues: () => void;
}

export const WorkflowValidationDialog = ({
  open,
  onOpenChange,
  validation,
  onRunAnyway,
  onFixIssues,
}: WorkflowValidationDialogProps) => {
  if (!validation) return null;

  const errorCount = validation.validations.filter(v => v.status === 'error').length;
  const warningCount = validation.validations.filter(v => v.status === 'warning').length;
  const validCount = validation.validations.filter(v => v.status === 'valid').length;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-2xl">
        <AlertDialogHeader>
          <AlertDialogTitle>Workflow Pre-Flight Check</AlertDialogTitle>
          <AlertDialogDescription>
            Checking workflow configuration and requirements...
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="flex gap-4 mb-4">
          <Badge variant={errorCount > 0 ? "destructive" : "secondary"} className="gap-1">
            <XCircle className="w-3 h-3" />
            {errorCount} Errors
          </Badge>
          <Badge variant="secondary" className="gap-1">
            <AlertTriangle className="w-3 h-3" />
            {warningCount} Warnings
          </Badge>
          <Badge variant="secondary" className="gap-1">
            <CheckCircle className="w-3 h-3" />
            {validCount} Valid
          </Badge>
        </div>

        <ScrollArea className="max-h-[400px] pr-4">
          <div className="space-y-3">
            {validation.validations.map((v) => (
              <div
                key={v.nodeId}
                className="p-4 rounded-lg border bg-card"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {v.status === 'valid' && (
                      <CheckCircle className="w-4 h-4 text-green-500" />
                    )}
                    {v.status === 'warning' && (
                      <AlertTriangle className="w-4 h-4 text-yellow-500" />
                    )}
                    {v.status === 'error' && (
                      <XCircle className="w-4 h-4 text-red-500" />
                    )}
                    <div>
                      <div className="font-medium">{v.nodeTitle}</div>
                      <div className="text-xs text-muted-foreground">
                        {v.nodeType}
                      </div>
                    </div>
                  </div>
                  <Badge
                    variant={
                      v.status === 'error'
                        ? 'destructive'
                        : v.status === 'warning'
                        ? 'secondary'
                        : 'default'
                    }
                  >
                    {v.status}
                  </Badge>
                </div>

                {v.message && (
                  <div className="text-sm text-muted-foreground mb-2">
                    {v.message}
                  </div>
                )}

                {v.requirements && v.requirements.length > 0 && (
                  <div className="space-y-2 mt-3">
                    {v.requirements.map((req, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-2 rounded bg-muted/50"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-sm">{req.name}</span>
                          <Badge
                            variant={
                              req.status === 'missing'
                                ? 'destructive'
                                : 'default'
                            }
                            className="text-xs"
                          >
                            {req.status}
                          </Badge>
                        </div>
                        {req.actionLabel && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="gap-1"
                            onClick={onFixIssues}
                          >
                            {req.actionLabel}
                            <ExternalLink className="w-3 h-3" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </ScrollArea>

        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          {validation.canRunAnyway && (
            <Button variant="outline" onClick={onRunAnyway}>
              Run Anyway
            </Button>
          )}
          {errorCount > 0 && (
            <AlertDialogAction onClick={onFixIssues}>
              Fix Issues
            </AlertDialogAction>
          )}
          {errorCount === 0 && (
            <AlertDialogAction onClick={onRunAnyway}>
              Run Workflow
            </AlertDialogAction>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
