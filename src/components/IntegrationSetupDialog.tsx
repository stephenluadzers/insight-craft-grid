import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageSquare, Clock, Bell, ExternalLink } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface IntegrationSetupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  requiredIntegrations: {
    type: string;
    name: string;
    usedInNodes: string[];
    alternatives?: string[];
    configUrl?: string;
  }[];
  onSetupLater: () => void;
}

export const IntegrationSetupDialog = ({
  open,
  onOpenChange,
  requiredIntegrations,
  onSetupLater,
}: IntegrationSetupDialogProps) => {
  const navigate = useNavigate();

  const getIcon = (type: string) => {
    switch (type) {
      case 'sms':
        return <MessageSquare className="w-5 h-5" />;
      case 'monitoring':
        return <Clock className="w-5 h-5" />;
      case 'notifications':
        return <Bell className="w-5 h-5" />;
      default:
        return <ExternalLink className="w-5 h-5" />;
    }
  };

  const handleSetupIntegrations = () => {
    onOpenChange(false);
    navigate('/settings?tab=credentials');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>✨ Your workflow needs these connections</DialogTitle>
          <DialogDescription>
            Set up these integrations to enable full workflow functionality
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[400px]">
          <div className="space-y-4">
            {requiredIntegrations.map((integration, idx) => (
              <div
                key={idx}
                className="p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
              >
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    {getIcon(integration.type)}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium">{integration.name}</h4>
                      <Badge variant="secondary">
                        {integration.usedInNodes.length}{" "}
                        {integration.usedInNodes.length === 1 ? "node" : "nodes"}
                      </Badge>
                    </div>
                    
                    <div className="text-sm text-muted-foreground mb-2">
                      Used in: {integration.usedInNodes.join(", ")}
                    </div>

                    {integration.alternatives && integration.alternatives.length > 0 && (
                      <div className="text-xs text-muted-foreground">
                        Alternatives: {integration.alternatives.join(", ")}
                      </div>
                    )}

                    {integration.configUrl && (
                      <Button
                        variant="link"
                        size="sm"
                        className="p-0 h-auto mt-2"
                        onClick={() => window.open(integration.configUrl, '_blank')}
                      >
                        Configure {integration.name} →
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>

        <DialogFooter>
          <Button variant="outline" onClick={onSetupLater}>
            Skip for Now
          </Button>
          <Button onClick={handleSetupIntegrations}>
            Set Up Integrations
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
