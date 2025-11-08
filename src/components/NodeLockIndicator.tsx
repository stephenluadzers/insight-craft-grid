import { Lock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { EditLock } from '@/hooks/useCollaboration';

interface NodeLockIndicatorProps {
  nodeId: string;
  editLocks: EditLock[];
  currentUserId: string | null;
}

export const NodeLockIndicator = ({ nodeId, editLocks, currentUserId }: NodeLockIndicatorProps) => {
  const lock = editLocks.find(l => l.node_id === nodeId);

  if (!lock || lock.locked_by === currentUserId) return null;

  return (
    <Badge
      variant="secondary"
      className="absolute -top-2 -right-2 gap-1 bg-yellow-500/10 text-yellow-600 border-yellow-500/20 z-10"
    >
      <Lock className="h-3 w-3" />
      {lock.profile?.full_name || 'User'}
    </Badge>
  );
};
