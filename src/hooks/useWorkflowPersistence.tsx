import { useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { WorkflowNodeData } from '@/components/WorkflowNode';

interface UseWorkflowPersistenceProps {
  workflowId?: string;
  nodes: WorkflowNodeData[];
  workflowName: string;
  onWorkflowLoaded?: (nodes: WorkflowNodeData[], workflowId: string) => void;
}

export const useWorkflowPersistence = ({ 
  workflowId, 
  nodes, 
  workflowName,
  onWorkflowLoaded 
}: UseWorkflowPersistenceProps) => {
  const { toast } = useToast();
  const autoSaveTimeout = useRef<NodeJS.Timeout | null>(null);
  const lastSavedNodes = useRef<string>('');

  // Auto-save workflow every 3 seconds if there are changes
  useEffect(() => {
    const nodesJson = JSON.stringify(nodes);
    
    // Skip if no changes
    if (nodesJson === lastSavedNodes.current || nodes.length === 0) {
      return;
    }

    // Clear existing timeout
    if (autoSaveTimeout.current) {
      clearTimeout(autoSaveTimeout.current);
    }

    // Set new timeout for auto-save
    autoSaveTimeout.current = setTimeout(async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        if (workflowId) {
          // Update existing workflow
          const { error } = await supabase
            .from('workflows')
            .update({
              name: workflowName,
              nodes: nodes as any,
              updated_at: new Date().toISOString(),
            })
            .eq('id', workflowId);

          if (error) throw error;
          lastSavedNodes.current = nodesJson;
        } else {
          // Create new workflow
          const { data, error } = await supabase
            .from('workflows')
            .insert({
              name: workflowName,
              description: `Workflow with ${nodes.length} nodes`,
              nodes: nodes as any,
              user_id: user.id,
              status: 'draft',
            })
            .select()
            .maybeSingle();

          if (error) throw error;
          
          if (data && onWorkflowLoaded) {
            onWorkflowLoaded(nodes, data.id);
          }
          lastSavedNodes.current = nodesJson;
        }
      } catch (error: any) {
        console.error('Auto-save failed:', error);
      }
    }, 3000); // Auto-save after 3 seconds of no changes

    return () => {
      if (autoSaveTimeout.current) {
        clearTimeout(autoSaveTimeout.current);
      }
    };
  }, [nodes, workflowId, workflowName, onWorkflowLoaded]);

  // Load workflow on mount
  useEffect(() => {
    const loadWorkflow = async () => {
      if (!workflowId) return;

      try {
        const { data, error } = await supabase
          .from('workflows')
          .select('*')
          .eq('id', workflowId)
          .maybeSingle();

        if (error) throw error;

        if (data && onWorkflowLoaded) {
          const loadedNodes = (data.nodes as unknown as WorkflowNodeData[]) || [];
          onWorkflowLoaded(loadedNodes, data.id);
          lastSavedNodes.current = JSON.stringify(data.nodes);
        }
      } catch (error: any) {
        console.error('Failed to load workflow:', error);
        toast({
          title: 'Failed to load workflow',
          description: error.message,
          variant: 'destructive',
        });
      }
    };

    loadWorkflow();
  }, [workflowId]);

  const saveWorkflow = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      if (workflowId) {
        const { error } = await supabase
          .from('workflows')
          .update({
            name: workflowName,
            nodes: nodes as any,
            updated_at: new Date().toISOString(),
          })
          .eq('id', workflowId);

        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from('workflows')
          .insert({
            name: workflowName,
            description: `Workflow with ${nodes.length} nodes`,
            nodes: nodes as any,
            user_id: user.id,
            status: 'draft',
          })
          .select()
          .maybeSingle();

        if (error) throw error;
        
        if (data && onWorkflowLoaded) {
          onWorkflowLoaded(nodes, data.id);
        }
      }

      lastSavedNodes.current = JSON.stringify(nodes);
      
      toast({
        title: 'Workflow saved',
        description: 'Your workflow has been saved successfully',
      });
    } catch (error: any) {
      toast({
        title: 'Save failed',
        description: error.message,
        variant: 'destructive',
      });
    }
  }, [workflowId, nodes, workflowName, onWorkflowLoaded, toast]);

  return { saveWorkflow };
};
