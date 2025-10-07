import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "./ui/dialog";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Alert, AlertDescription } from "./ui/alert";
import { ScrollArea } from "./ui/scroll-area";
import { Shield, AlertTriangle, XCircle, CheckCircle, Info } from "lucide-react";
import { SecurityScanResult } from "@/lib/securityScanner";

interface SecurityScanDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  scanResult: SecurityScanResult | null;
  onProceed?: () => void;
  onRequestApproval?: () => void;
  canProceed: boolean;
}

const getRiskColor = (level: string) => {
  switch (level) {
    case 'critical': return 'text-red-600 dark:text-red-400';
    case 'high': return 'text-orange-600 dark:text-orange-400';
    case 'medium': return 'text-yellow-600 dark:text-yellow-400';
    case 'low': return 'text-blue-600 dark:text-blue-400';
    default: return 'text-green-600 dark:text-green-400';
  }
};

const getRiskIcon = (level: string) => {
  switch (level) {
    case 'critical': return <XCircle className="h-5 w-5" />;
    case 'high': return <AlertTriangle className="h-5 w-5" />;
    case 'medium': return <Info className="h-5 w-5" />;
    case 'low': return <Info className="h-5 w-5" />;
    default: return <CheckCircle className="h-5 w-5" />;
  }
};

const getRiskBadgeVariant = (level: string): "default" | "destructive" | "outline" | "secondary" => {
  switch (level) {
    case 'critical': return 'destructive';
    case 'high': return 'destructive';
    case 'medium': return 'secondary';
    default: return 'outline';
  }
};

export const SecurityScanDialog = ({
  open,
  onOpenChange,
  scanResult,
  onProceed,
  onRequestApproval,
  canProceed
}: SecurityScanDialogProps) => {
  if (!scanResult) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <Shield className="h-6 w-6 text-primary" />
            <div>
              <DialogTitle>Security Scan Results</DialogTitle>
              <DialogDescription>
                Workflow security analysis complete
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          {/* Overall Risk Level */}
          <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/50">
            <div className="flex items-center gap-3">
              <span className={getRiskColor(scanResult.risk_level)}>
                {getRiskIcon(scanResult.risk_level)}
              </span>
              <div>
                <p className="font-medium">Overall Risk Level</p>
                <p className="text-sm text-muted-foreground">
                  {scanResult.issues.length} issue(s) detected
                </p>
              </div>
            </div>
            <Badge variant={getRiskBadgeVariant(scanResult.risk_level)} className="text-lg px-4 py-1">
              {scanResult.risk_level.toUpperCase()}
            </Badge>
          </div>

          {/* Security Status Alert */}
          {scanResult.risk_level === 'critical' && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                This workflow contains critical security risks and cannot be executed. Please fix the issues below before proceeding.
              </AlertDescription>
            </Alert>
          )}

          {scanResult.risk_level === 'high' && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                This workflow contains high security risks and requires admin approval before execution.
              </AlertDescription>
            </Alert>
          )}

          {scanResult.risk_level === 'safe' && (
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                No security issues detected. This workflow is safe to execute.
              </AlertDescription>
            </Alert>
          )}

          {/* Issues List */}
          {scanResult.issues.length > 0 && (
            <div className="space-y-3">
              <h3 className="font-semibold">Security Issues ({scanResult.issues.length})</h3>
              <ScrollArea className="h-[300px] border rounded-lg p-4">
                <div className="space-y-4">
                  {scanResult.issues.map((issue, idx) => (
                    <div key={idx} className="space-y-2 pb-4 border-b last:border-0">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-2">
                          <span className={getRiskColor(issue.risk_level)}>
                            {getRiskIcon(issue.risk_level)}
                          </span>
                          <div className="flex-1">
                            <p className="font-medium">{issue.description}</p>
                            <p className="text-sm text-muted-foreground mt-1">
                              Location: {issue.location}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              Type: {issue.rule_type}
                            </p>
                          </div>
                        </div>
                        <Badge variant={getRiskBadgeVariant(issue.risk_level)}>
                          {issue.risk_level}
                        </Badge>
                      </div>
                      <div className="ml-7 p-3 bg-muted rounded-md">
                        <p className="text-sm">
                          <span className="font-semibold">Remediation:</span> {issue.remediation}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="w-full sm:w-auto">
            Cancel
          </Button>
          
          {scanResult.risk_level === 'high' && onRequestApproval && (
            <Button onClick={onRequestApproval} variant="secondary" className="w-full sm:w-auto">
              Request Admin Approval
            </Button>
          )}
          
          {canProceed && onProceed && (
            <Button onClick={onProceed} className="w-full sm:w-auto">
              {scanResult.risk_level === 'medium' ? 'Proceed with Caution' : 'Proceed'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
