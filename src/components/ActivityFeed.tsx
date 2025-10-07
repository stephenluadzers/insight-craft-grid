import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Activity, Play, Save, Edit, Trash, UserPlus } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface ActivityLog {
  id: string;
  action: string;
  resource_type: string;
  user_id: string;
  created_at: string;
  metadata: any;
}

interface ActivityFeedProps {
  workspaceId: string;
}

export const ActivityFeed = ({ workspaceId }: ActivityFeedProps) => {
  const { data: activities, isLoading } = useQuery({
    queryKey: ["activity-feed", workspaceId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("audit_logs")
        .select("*")
        .eq("workspace_id", workspaceId)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      return data as ActivityLog[];
    },
    refetchInterval: 5000, // Poll every 5 seconds
  });

  const getActionIcon = (action: string) => {
    switch (action) {
      case "execute":
        return <Play className="w-4 h-4 text-blue-500" />;
      case "create":
        return <Save className="w-4 h-4 text-green-500" />;
      case "update":
        return <Edit className="w-4 h-4 text-yellow-500" />;
      case "delete":
        return <Trash className="w-4 h-4 text-red-500" />;
      case "invite":
        return <UserPlus className="w-4 h-4 text-purple-500" />;
      default:
        return <Activity className="w-4 h-4" />;
    }
  };

  const getActionText = (log: ActivityLog) => {
    const resourceMap: Record<string, string> = {
      workflow: "workflow",
      execution: "execution",
      member: "member",
      credential: "credential",
    };
    
    const resource = resourceMap[log.resource_type] || log.resource_type;
    return `${log.action} ${resource}`;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="w-5 h-5" />
          Activity Feed
        </CardTitle>
        <CardDescription>Real-time workspace activity and collaboration</CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[500px]">
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading activity...</div>
          ) : activities && activities.length > 0 ? (
            <div className="space-y-4">
              {activities.map((log) => (
                <div key={log.id} className="flex items-start gap-3">
                  <Avatar className="h-8 w-8 mt-1">
                    <AvatarFallback className="text-xs">
                      {log.user_id.substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      {getActionIcon(log.action)}
                      <span className="text-sm font-medium">{getActionText(log)}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No activity yet. Start building workflows!
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
};
