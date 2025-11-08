import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { MousePointer2 } from 'lucide-react';

interface Cursor {
  userId: string;
  x: number;
  y: number;
  userName: string;
  color: string;
}

interface CollaboratorCursorsProps {
  workflowId: string | null;
  panOffset: { x: number; y: number };
}

const CURSOR_COLORS = [
  'rgb(239, 68, 68)',   // red
  'rgb(59, 130, 246)',  // blue
  'rgb(34, 197, 94)',   // green
  'rgb(234, 179, 8)',   // yellow
  'rgb(168, 85, 247)',  // purple
  'rgb(236, 72, 153)',  // pink
  'rgb(14, 165, 233)',  // cyan
  'rgb(249, 115, 22)',  // orange
];

const getUserColor = (userId: string): string => {
  const hash = userId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return CURSOR_COLORS[hash % CURSOR_COLORS.length];
};

export const CollaboratorCursors = ({ workflowId, panOffset }: CollaboratorCursorsProps) => {
  const [cursors, setCursors] = useState<Cursor[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    const initUserId = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUserId(user?.id || null);
    };
    initUserId();
  }, []);

  useEffect(() => {
    if (!workflowId) return;

    const loadCursors = async () => {
      const { data, error } = await (supabase as any)
        .from('user_presence')
        .select(`
          user_id,
          cursor_x,
          cursor_y,
          profiles:user_id (
            full_name
          )
        `)
        .eq('workflow_id', workflowId)
        .eq('status', 'online')
        .not('cursor_x', 'is', null)
        .not('cursor_y', 'is', null);

      if (!error && data) {
        const formattedCursors = data
          .filter((c: any) => c.user_id !== currentUserId)
          .map((c: any) => ({
            userId: c.user_id,
            x: parseFloat(c.cursor_x),
            y: parseFloat(c.cursor_y),
            userName: c.profiles?.full_name || 'Unknown',
            color: getUserColor(c.user_id),
          }));
        setCursors(formattedCursors);
      }
    };

    loadCursors();

    // Subscribe to cursor updates
    const channel = supabase
      .channel(`cursors:${workflowId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_presence',
          filter: `workflow_id=eq.${workflowId}`,
        },
        () => {
          loadCursors();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [workflowId, currentUserId]);

  if (!workflowId) return null;

  return (
    <>
      {cursors.map((cursor) => (
        <div
          key={cursor.userId}
          className="absolute pointer-events-none transition-all duration-100 ease-out z-50"
          style={{
            left: `${cursor.x + panOffset.x}px`,
            top: `${cursor.y + panOffset.y}px`,
            transform: 'translate(-50%, -50%)',
          }}
        >
          <div className="relative">
            <MousePointer2
              className="h-5 w-5 drop-shadow-lg"
              style={{ color: cursor.color }}
              fill={cursor.color}
            />
            <div
              className="absolute left-6 top-0 px-2 py-1 rounded text-xs font-medium whitespace-nowrap drop-shadow-lg"
              style={{
                backgroundColor: cursor.color,
                color: 'white',
              }}
            >
              {cursor.userName}
            </div>
          </div>
        </div>
      ))}
    </>
  );
};
