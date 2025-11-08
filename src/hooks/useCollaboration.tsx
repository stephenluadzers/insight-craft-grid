import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface CollaboratorPresence {
  id: string;
  user_id: string;
  status: 'online' | 'away' | 'offline';
  cursor_x?: number;
  cursor_y?: number;
  selected_node_id?: string;
  last_active_at: string;
  profile?: {
    full_name: string;
    avatar_url?: string;
  };
}

export interface CollaborationMessage {
  id: string;
  user_id: string;
  message: string;
  message_type: 'text' | 'system' | 'mention';
  created_at: string;
  profile?: {
    full_name: string;
    avatar_url?: string;
  };
}

export interface EditLock {
  id: string;
  node_id: string;
  locked_by: string;
  locked_at: string;
  expires_at: string;
  profile?: {
    full_name: string;
  };
}

export const useCollaboration = (workflowId: string | null, workspaceId: string | null) => {
  const [collaborators, setCollaborators] = useState<CollaboratorPresence[]>([]);
  const [messages, setMessages] = useState<CollaborationMessage[]>([]);
  const [editLocks, setEditLocks] = useState<EditLock[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const { toast } = useToast();

  // Initialize presence
  useEffect(() => {
    const initPresence = async () => {
      if (!workflowId || !workspaceId) return;

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      setCurrentUserId(user.id);

      // Upsert presence
      await (supabase as any)
        .from('user_presence')
        .upsert({
          user_id: user.id,
          workspace_id: workspaceId,
          workflow_id: workflowId,
          status: 'online',
          last_active_at: new Date().toISOString(),
        }, {
          onConflict: 'user_id,workspace_id,workflow_id'
        });

      // Load initial collaborators
      loadCollaborators();
    };

    initPresence();

    // Update presence every 30 seconds
    const presenceInterval = setInterval(async () => {
      if (!workflowId || !workspaceId) return;
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await (supabase as any)
        .from('user_presence')
        .update({
          last_active_at: new Date().toISOString(),
          status: 'online',
        })
        .eq('user_id', user.id)
        .eq('workflow_id', workflowId);
    }, 30000);

    // Cleanup on unmount
    return () => {
      clearInterval(presenceInterval);
      
      if (workflowId && workspaceId) {
        supabase.auth.getUser().then(({ data: { user } }) => {
          if (user) {
            (supabase as any)
              .from('user_presence')
              .update({ status: 'offline' })
              .eq('user_id', user.id)
              .eq('workflow_id', workflowId);
          }
        });
      }
    };
  }, [workflowId, workspaceId]);

  // Load collaborators
  const loadCollaborators = async () => {
    if (!workflowId) return;

    const { data, error } = await (supabase as any)
      .from('user_presence')
      .select(`
        *,
        profiles:user_id (
          full_name,
          avatar_url
        )
      `)
      .eq('workflow_id', workflowId)
      .neq('status', 'offline')
      .order('last_active_at', { ascending: false });

    if (error) {
      console.error('Error loading collaborators:', error);
      return;
    }

    setCollaborators(data.map((p: any) => ({
      ...p,
      profile: p.profiles
    })));
  };

  // Subscribe to realtime updates
  useEffect(() => {
    if (!workflowId) return;

    // Subscribe to presence changes
    const presenceChannel = supabase
      .channel(`presence:${workflowId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_presence',
          filter: `workflow_id=eq.${workflowId}`,
        },
        () => {
          loadCollaborators();
        }
      )
      .subscribe();

    // Subscribe to messages
    const messagesChannel = supabase
      .channel(`messages:${workflowId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'collaboration_messages',
          filter: `workflow_id=eq.${workflowId}`,
        },
        async (payload) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name, avatar_url')
            .eq('id', payload.new.user_id)
            .single();

          setMessages(prev => [...prev, { ...payload.new as any, profile }]);
        }
      )
      .subscribe();

    // Subscribe to edit locks
    const locksChannel = supabase
      .channel(`locks:${workflowId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'workflow_edit_locks',
          filter: `workflow_id=eq.${workflowId}`,
        },
        () => {
          loadEditLocks();
        }
      )
      .subscribe();

    // Load initial data
    loadMessages();
    loadEditLocks();

    return () => {
      supabase.removeChannel(presenceChannel);
      supabase.removeChannel(messagesChannel);
      supabase.removeChannel(locksChannel);
    };
  }, [workflowId]);

  const loadMessages = async () => {
    if (!workflowId) return;

    const { data, error } = await (supabase as any)
      .from('collaboration_messages')
      .select(`
        *,
        profiles:user_id (
          full_name,
          avatar_url
        )
      `)
      .eq('workflow_id', workflowId)
      .order('created_at', { ascending: true })
      .limit(100);

    if (!error && data) {
      setMessages(data.map((m: any) => ({
        ...m,
        profile: m.profiles
      })));
    }
  };

  const loadEditLocks = async () => {
    if (!workflowId) return;

    const { data, error } = await (supabase as any)
      .from('workflow_edit_locks')
      .select(`
        *,
        profiles:locked_by (
          full_name
        )
      `)
      .eq('workflow_id', workflowId)
      .gt('expires_at', new Date().toISOString());

    if (!error && data) {
      setEditLocks(data.map((l: any) => ({
        ...l,
        profile: l.profiles
      })));
    }
  };

  const sendMessage = async (message: string) => {
    if (!workflowId || !message.trim()) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await (supabase as any)
      .from('collaboration_messages')
      .insert({
        workflow_id: workflowId,
        user_id: user.id,
        message: message.trim(),
        message_type: 'text',
      });

    if (error) {
      toast({
        title: "Failed to send message",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const updateCursor = async (x: number, y: number) => {
    if (!workflowId || !workspaceId) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await (supabase as any)
      .from('user_presence')
      .update({
        cursor_x: x,
        cursor_y: y,
        last_active_at: new Date().toISOString(),
      })
      .eq('user_id', user.id)
      .eq('workflow_id', workflowId);
  };

  const updateSelectedNode = async (nodeId: string | null) => {
    if (!workflowId || !workspaceId) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await (supabase as any)
      .from('user_presence')
      .update({
        selected_node_id: nodeId,
        last_active_at: new Date().toISOString(),
      })
      .eq('user_id', user.id)
      .eq('workflow_id', workflowId);
  };

  const acquireNodeLock = async (nodeId: string): Promise<boolean> => {
    if (!workflowId) return false;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    // Check if already locked
    const { data: existingLock } = await (supabase as any)
      .from('workflow_edit_locks')
      .select('*')
      .eq('workflow_id', workflowId)
      .eq('node_id', nodeId)
      .gt('expires_at', new Date().toISOString())
      .single();

    if (existingLock && existingLock.locked_by !== user.id) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', existingLock.locked_by)
        .single();

      toast({
        title: "Node is locked",
        description: `${profile?.full_name || 'Another user'} is editing this node`,
        variant: "destructive",
      });
      return false;
    }

    // Acquire lock
    const { error } = await (supabase as any)
      .from('workflow_edit_locks')
      .upsert({
        workflow_id: workflowId,
        node_id: nodeId,
        locked_by: user.id,
        expires_at: new Date(Date.now() + 30000).toISOString(), // 30 seconds
      }, {
        onConflict: 'workflow_id,node_id'
      });

    return !error;
  };

  const releaseNodeLock = async (nodeId: string) => {
    if (!workflowId) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await (supabase as any)
      .from('workflow_edit_locks')
      .delete()
      .eq('workflow_id', workflowId)
      .eq('node_id', nodeId)
      .eq('locked_by', user.id);
  };

  const logActivity = async (action: string, details?: any) => {
    if (!workflowId) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await (supabase as any)
      .from('collaboration_activity')
      .insert({
        workflow_id: workflowId,
        user_id: user.id,
        action: action,
        details: details || {},
      });
  };

  return {
    collaborators,
    messages,
    editLocks,
    currentUserId,
    sendMessage,
    updateCursor,
    updateSelectedNode,
    acquireNodeLock,
    releaseNodeLock,
    logActivity,
  };
};
