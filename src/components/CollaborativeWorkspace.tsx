import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { 
  Users, 
  UserPlus, 
  Shield, 
  Crown,
  Eye,
  Edit,
  Trash2,
  Mail
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface WorkspaceMember {
  id: string;
  user_id: string;
  workspace_id: string;
  role: 'owner' | 'admin' | 'editor' | 'viewer';
  joined_at: string;
  invited_by: string;
}

const CollaborativeWorkspace = () => {
  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [inviteEmail, setInviteEmail] = useState('');
  const [isInviting, setIsInviting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadMembers();
  }, []);

  const loadMembers = async () => {
    try {
      // For now, show placeholder since we need proper user management
      setMembers([]);
    } catch (error) {
      console.error('Error loading members:', error);
    }
  };

  const handleInvite = async () => {
    if (!inviteEmail.trim()) return;

    setIsInviting(true);
    try {
      // Placeholder for invitation logic
      toast({
        title: "Feature Coming Soon",
        description: "Team invitations will be available in the next release",
      });

      setInviteEmail('');
    } catch (error: any) {
      toast({
        title: "Invitation Failed",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsInviting(false);
    }
  };

  const handleUpdateRole = async (memberId: string, newRole: 'owner' | 'admin' | 'editor' | 'viewer') => {
    try {
      toast({
        title: "Feature Coming Soon",
        description: "Role management will be available in the next release",
      });
    } catch (error: any) {
      toast({
        title: "Update Failed",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'owner': return Crown;
      case 'admin': return Shield;
      case 'editor': return Edit;
      case 'viewer': return Eye;
      default: return Users;
    }
  };

  const getRoleBadge = (role: string) => {
    const variants: Record<string, any> = {
      owner: 'default',
      admin: 'default',
      editor: 'secondary',
      viewer: 'outline'
    };
    return <Badge variant={variants[role]}>{role}</Badge>;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5 text-primary" />
          <CardTitle>Team Collaboration</CardTitle>
        </div>
        <CardDescription>
          Invite team members and manage workspace permissions
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Invite Section */}
        <div className="space-y-3">
          <label className="text-sm font-medium">Invite Team Member</label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="email"
                placeholder="colleague@company.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                className="pl-9"
              />
            </div>
            <Button
              onClick={handleInvite}
              disabled={isInviting || !inviteEmail.trim()}
            >
              <UserPlus className="h-4 w-4 mr-2" />
              Invite
            </Button>
          </div>
        </div>

        {/* Members List */}
        <div className="space-y-3">
          <label className="text-sm font-medium">Workspace Members ({members.length})</label>
          <div className="space-y-2">
            {members.map(member => {
              const RoleIcon = getRoleIcon(member.role);
              return (
                <div
                  key={member.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="text-xs">
                        {member.user_id.substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="font-medium text-sm">{member.user_id}</div>
                      <div className="text-xs text-muted-foreground">
                        Joined {new Date(member.joined_at).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <RoleIcon className="h-4 w-4 text-muted-foreground" />
                    {getRoleBadge(member.role)}
                    {member.role !== 'owner' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Permission Matrix */}
        <div className="border rounded-lg p-4 bg-muted/50">
          <div className="text-sm font-medium mb-3">Permission Levels</div>
          <div className="space-y-2 text-xs text-muted-foreground">
            <div className="flex justify-between">
              <span>Owner</span>
              <span>Full access + billing</span>
            </div>
            <div className="flex justify-between">
              <span>Admin</span>
              <span>Manage workflows + members</span>
            </div>
            <div className="flex justify-between">
              <span>Editor</span>
              <span>Create and edit workflows</span>
            </div>
            <div className="flex justify-between">
              <span>Viewer</span>
              <span>View workflows only</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default CollaborativeWorkspace;
