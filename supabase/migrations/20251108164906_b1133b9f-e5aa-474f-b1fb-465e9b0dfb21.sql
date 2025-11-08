-- Phase 6: Real-time Collaboration Tables

-- User presence tracking for live collaboration
CREATE TABLE IF NOT EXISTS public.user_presence (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  workflow_id UUID REFERENCES public.workflows(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'online' CHECK (status IN ('online', 'away', 'offline')),
  cursor_x DECIMAL,
  cursor_y DECIMAL,
  selected_node_id TEXT,
  last_active_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, workspace_id, workflow_id)
);

-- Live cursor tracking
CREATE TABLE IF NOT EXISTS public.collaboration_cursors (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  workflow_id UUID NOT NULL REFERENCES public.workflows(id) ON DELETE CASCADE,
  x DECIMAL NOT NULL,
  y DECIMAL NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, workflow_id)
);

-- Team chat messages
CREATE TABLE IF NOT EXISTS public.collaboration_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workflow_id UUID NOT NULL REFERENCES public.workflows(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  message_type TEXT NOT NULL DEFAULT 'text' CHECK (message_type IN ('text', 'system', 'mention')),
  mentioned_users UUID[],
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Workflow edit locks for conflict resolution
CREATE TABLE IF NOT EXISTS public.workflow_edit_locks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workflow_id UUID NOT NULL REFERENCES public.workflows(id) ON DELETE CASCADE,
  node_id TEXT NOT NULL,
  locked_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  locked_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + INTERVAL '30 seconds'),
  UNIQUE(workflow_id, node_id)
);

-- Collaboration activity log
CREATE TABLE IF NOT EXISTS public.collaboration_activity (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  workflow_id UUID NOT NULL REFERENCES public.workflows(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  details JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_presence ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collaboration_cursors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collaboration_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_edit_locks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collaboration_activity ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_presence
CREATE POLICY "Users can view presence in their workspaces"
ON public.user_presence FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.workspace_members
    WHERE workspace_id = user_presence.workspace_id
    AND user_id = auth.uid()
  )
);

CREATE POLICY "Users can insert their own presence"
ON public.user_presence FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own presence"
ON public.user_presence FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own presence"
ON public.user_presence FOR DELETE
USING (auth.uid() = user_id);

-- RLS Policies for collaboration_cursors
CREATE POLICY "Users can view cursors in workflows they can access"
ON public.collaboration_cursors FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.workflows w
    JOIN public.workspace_members wm ON w.workspace_id = wm.workspace_id
    WHERE w.id = collaboration_cursors.workflow_id
    AND wm.user_id = auth.uid()
  )
);

CREATE POLICY "Users can insert their own cursor"
ON public.collaboration_cursors FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own cursor"
ON public.collaboration_cursors FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own cursor"
ON public.collaboration_cursors FOR DELETE
USING (auth.uid() = user_id);

-- RLS Policies for collaboration_messages
CREATE POLICY "Users can view messages in workflows they can access"
ON public.collaboration_messages FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.workflows w
    JOIN public.workspace_members wm ON w.workspace_id = wm.workspace_id
    WHERE w.id = collaboration_messages.workflow_id
    AND wm.user_id = auth.uid()
  )
);

CREATE POLICY "Users can insert their own messages"
ON public.collaboration_messages FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own messages"
ON public.collaboration_messages FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own messages"
ON public.collaboration_messages FOR DELETE
USING (auth.uid() = user_id);

-- RLS Policies for workflow_edit_locks
CREATE POLICY "Users can view locks in workflows they can access"
ON public.workflow_edit_locks FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.workflows w
    JOIN public.workspace_members wm ON w.workspace_id = wm.workspace_id
    WHERE w.id = workflow_edit_locks.workflow_id
    AND wm.user_id = auth.uid()
  )
);

CREATE POLICY "Users can create locks"
ON public.workflow_edit_locks FOR INSERT
WITH CHECK (
  auth.uid() = locked_by
  AND EXISTS (
    SELECT 1 FROM public.workflows w
    JOIN public.workspace_members wm ON w.workspace_id = wm.workspace_id
    WHERE w.id = workflow_edit_locks.workflow_id
    AND wm.user_id = auth.uid()
    AND wm.role IN ('owner', 'admin', 'editor')
  )
);

CREATE POLICY "Users can delete their own locks"
ON public.workflow_edit_locks FOR DELETE
USING (auth.uid() = locked_by);

-- RLS Policies for collaboration_activity
CREATE POLICY "Users can view activity in workflows they can access"
ON public.collaboration_activity FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.workflows w
    JOIN public.workspace_members wm ON w.workspace_id = wm.workspace_id
    WHERE w.id = collaboration_activity.workflow_id
    AND wm.user_id = auth.uid()
  )
);

CREATE POLICY "Users can insert their own activity"
ON public.collaboration_activity FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Indexes for performance
CREATE INDEX idx_user_presence_workspace ON public.user_presence(workspace_id);
CREATE INDEX idx_user_presence_workflow ON public.user_presence(workflow_id);
CREATE INDEX idx_user_presence_user ON public.user_presence(user_id);
CREATE INDEX idx_user_presence_last_active ON public.user_presence(last_active_at);

CREATE INDEX idx_collaboration_cursors_workflow ON public.collaboration_cursors(workflow_id);
CREATE INDEX idx_collaboration_cursors_user ON public.collaboration_cursors(user_id);

CREATE INDEX idx_collaboration_messages_workflow ON public.collaboration_messages(workflow_id);
CREATE INDEX idx_collaboration_messages_created ON public.collaboration_messages(created_at DESC);

CREATE INDEX idx_workflow_edit_locks_workflow ON public.workflow_edit_locks(workflow_id);
CREATE INDEX idx_workflow_edit_locks_node ON public.workflow_edit_locks(node_id);
CREATE INDEX idx_workflow_edit_locks_expires ON public.workflow_edit_locks(expires_at);

CREATE INDEX idx_collaboration_activity_workflow ON public.collaboration_activity(workflow_id);
CREATE INDEX idx_collaboration_activity_created ON public.collaboration_activity(created_at DESC);

-- Function to cleanup stale presence
CREATE OR REPLACE FUNCTION public.cleanup_stale_presence()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  UPDATE public.user_presence
  SET status = 'offline'
  WHERE last_active_at < now() - INTERVAL '5 minutes'
  AND status != 'offline';
  
  DELETE FROM public.collaboration_cursors
  WHERE updated_at < now() - INTERVAL '5 minutes';
  
  DELETE FROM public.workflow_edit_locks
  WHERE expires_at < now();
END;
$function$;

-- Function to update presence timestamp
CREATE OR REPLACE FUNCTION public.update_presence_timestamp()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
  NEW.last_active_at = now();
  RETURN NEW;
END;
$function$;

CREATE TRIGGER update_user_presence_timestamp
BEFORE UPDATE ON public.user_presence
FOR EACH ROW
EXECUTE FUNCTION public.update_presence_timestamp();

-- Enable realtime for collaboration tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_presence;
ALTER PUBLICATION supabase_realtime ADD TABLE public.collaboration_cursors;
ALTER PUBLICATION supabase_realtime ADD TABLE public.collaboration_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.workflow_edit_locks;
ALTER PUBLICATION supabase_realtime ADD TABLE public.collaboration_activity;