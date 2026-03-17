-- Enable realtime for execution logs and executions tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.workflow_execution_logs;
ALTER PUBLICATION supabase_realtime ADD TABLE public.workflow_executions;