import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { MousePointer2, Edit3 } from "lucide-react";
import { cn } from "@/lib/utils";

interface Collaborator {
  userId: string;
  fullName: string;
  avatarUrl?: string;
  color: string;
  cursorX?: number;
  cursorY?: number;
  selectedNodeId?: string;
  isEditing: boolean;
  lastActiveAt: Date;
}

interface EnhancedCollaboratorPresenceProps {
  workflowId: string | null;
  panOffset: { x: number; y: number };
  nodes: { id: string; title: string }[];
}

const COLLABORATOR_COLORS = [
  { bg: "bg-red-500", text: "text-red-500", hex: "#ef4444" },
  { bg: "bg-blue-500", text: "text-blue-500", hex: "#3b82f6" },
  { bg: "bg-green-500", text: "text-green-500", hex: "#22c55e" },
  { bg: "bg-yellow-500", text: "text-yellow-500", hex: "#eab308" },
  { bg: "bg-purple-500", text: "text-purple-500", hex: "#a855f7" },
  { bg: "bg-pink-500", text: "text-pink-500", hex: "#ec4899" },
  { bg: "bg-cyan-500", text: "text-cyan-500", hex: "#06b6d4" },
  { bg: "bg-orange-500", text: "text-orange-500", hex: "#f97316" },
];

const getColorForUser = (userId: string) => {
  const hash = userId.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return COLLABORATOR_COLORS[hash % COLLABORATOR_COLORS.length];
};

const getInitials = (name: string) => {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
};

export const EnhancedCollaboratorPresence = ({
  workflowId,
  panOffset,
  nodes,
}: EnhancedCollaboratorPresenceProps) => {
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    const initUserId = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setCurrentUserId(user?.id || null);
    };
    initUserId();
  }, []);

  useEffect(() => {
    if (!workflowId) return;

    const loadCollaborators = async () => {
      const { data, error } = await supabase
        .from("workflow_collaboration_sessions")
        .select(
          `
          user_id,
          cursor_x,
          cursor_y,
          selected_node_id,
          is_editing,
          user_color,
          last_seen_at
        `
        )
        .eq("workflow_id", workflowId);

      if (!error && data) {
        // Get profile info for each collaborator
        const userIds = [...new Set(data.map((c) => c.user_id))];
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, full_name, avatar_url")
          .in("id", userIds);

        const profileMap = new Map(profiles?.map((p) => [p.id, p]) || []);

        const formatted = data
          .filter((c) => c.user_id !== currentUserId)
          .map((c) => {
            const profile = profileMap.get(c.user_id);
            const color = getColorForUser(c.user_id);
            return {
              userId: c.user_id,
              fullName: profile?.full_name || "Unknown",
              avatarUrl: profile?.avatar_url || undefined,
              color: color.hex,
              cursorX: c.cursor_x ?? undefined,
              cursorY: c.cursor_y ?? undefined,
              selectedNodeId: c.selected_node_id ?? undefined,
              isEditing: c.is_editing,
              lastActiveAt: new Date(c.last_seen_at),
            };
          });

        setCollaborators(formatted);
      }
    };

    loadCollaborators();

    // Real-time subscription
    const channel = supabase
      .channel(`collab:${workflowId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "workflow_collaboration_sessions",
          filter: `workflow_id=eq.${workflowId}`,
        },
        () => {
          loadCollaborators();
        }
      )
      .subscribe();

    // Refresh every 5 seconds for presence
    const interval = setInterval(loadCollaborators, 5000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, [workflowId, currentUserId]);

  if (!workflowId) return null;

  // Filter to only active collaborators (active in last 30 seconds)
  const activeCollaborators = collaborators.filter(
    (c) => Date.now() - c.lastActiveAt.getTime() < 30000
  );

  return (
    <>
      {/* Collaborator avatars bar */}
      <div className="absolute top-4 right-4 z-40 flex items-center gap-2">
        <TooltipProvider>
          {activeCollaborators.map((collaborator, idx) => {
            const node = nodes.find((n) => n.id === collaborator.selectedNodeId);
            return (
              <Tooltip key={collaborator.userId}>
                <TooltipTrigger>
                  <div className="relative">
                    <Avatar
                      className={cn(
                        "h-8 w-8 ring-2 transition-all",
                        collaborator.isEditing && "ring-offset-2 ring-offset-background"
                      )}
                      style={{ 
                        boxShadow: `0 0 0 2px ${collaborator.color}` 
                      }}
                    >
                      <AvatarImage src={collaborator.avatarUrl} />
                      <AvatarFallback
                        className="text-xs"
                        style={{ backgroundColor: collaborator.color, color: "white" }}
                      >
                        {getInitials(collaborator.fullName)}
                      </AvatarFallback>
                    </Avatar>
                    {collaborator.isEditing && (
                      <div
                        className="absolute -bottom-1 -right-1 rounded-full p-0.5 border-2 border-background"
                        style={{ backgroundColor: collaborator.color }}
                      >
                        <Edit3 className="w-2 h-2 text-white" />
                      </div>
                    )}
                  </div>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  <div className="text-sm">
                    <p className="font-medium">{collaborator.fullName}</p>
                    {node && (
                      <p className="text-xs text-muted-foreground">
                        {collaborator.isEditing ? "Editing" : "Viewing"}: {node.title}
                      </p>
                    )}
                  </div>
                </TooltipContent>
              </Tooltip>
            );
          })}
        </TooltipProvider>

        {activeCollaborators.length > 0 && (
          <Badge variant="secondary" className="text-xs">
            {activeCollaborators.length} online
          </Badge>
        )}
      </div>

      {/* Cursor overlays */}
      {activeCollaborators.map((collaborator) => {
        if (collaborator.cursorX === undefined || collaborator.cursorY === undefined) {
          return null;
        }

        return (
          <div
            key={`cursor-${collaborator.userId}`}
            className="absolute pointer-events-none transition-all duration-75 ease-out z-50"
            style={{
              left: `${collaborator.cursorX + panOffset.x}px`,
              top: `${collaborator.cursorY + panOffset.y}px`,
              transform: "translate(-2px, -2px)",
            }}
          >
            <div className="relative">
              <MousePointer2
                className="h-5 w-5 drop-shadow-lg"
                style={{ color: collaborator.color }}
                fill={collaborator.color}
              />
              <div
                className="absolute left-5 top-0 px-2 py-1 rounded-md text-xs font-medium whitespace-nowrap shadow-lg flex items-center gap-1"
                style={{
                  backgroundColor: collaborator.color,
                  color: "white",
                }}
              >
                {collaborator.isEditing && <Edit3 className="w-3 h-3" />}
                {collaborator.fullName.split(" ")[0]}
              </div>
            </div>
          </div>
        );
      })}
    </>
  );
};
