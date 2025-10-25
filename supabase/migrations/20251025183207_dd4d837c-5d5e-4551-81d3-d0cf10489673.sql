-- Fix search_path for security functions to prevent SQL injection via search_path manipulation

-- Update validate_workflow_node_data function
CREATE OR REPLACE FUNCTION public.validate_workflow_node_data(node_data jsonb)
RETURNS boolean
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
BEGIN
  -- Check for SQL injection patterns in node data
  IF node_data::text ~* '(union|select|insert|update|delete|drop|create|alter|exec|execute|script|javascript:)' THEN
    RETURN false;
  END IF;
  
  -- Validate node data structure
  IF NOT (node_data ? 'type' AND node_data ? 'id') THEN
    RETURN false;
  END IF;
  
  RETURN true;
END;
$$;

-- Update validate_workflows_trigger function
CREATE OR REPLACE FUNCTION public.validate_workflows_trigger()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  node jsonb;
BEGIN
  IF NEW.nodes IS NOT NULL THEN
    FOR node IN SELECT * FROM jsonb_array_elements(NEW.nodes)
    LOOP
      IF NOT validate_workflow_node_data(node) THEN
        RAISE EXCEPTION 'Invalid workflow node data detected';
      END IF;
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$;

-- Update increment_error_count function
CREATE OR REPLACE FUNCTION public.increment_error_count()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.occurrence_count = NEW.occurrence_count + 1;
  NEW.last_seen_at = now();
  RETURN NEW;
END;
$$;

-- Update update_circuit_breaker_state function
CREATE OR REPLACE FUNCTION public.update_circuit_breaker_state()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  
  -- Auto-transition from open to half-open after timeout
  IF NEW.state = 'open' AND 
     NEW.opened_at + (NEW.timeout_duration_seconds || ' seconds')::INTERVAL < now() THEN
    NEW.state = 'half_open';
    NEW.half_open_at = now();
  END IF;
  
  RETURN NEW;
END;
$$;

-- Update calculate_next_retry function
CREATE OR REPLACE FUNCTION public.calculate_next_retry(retry_count integer, base_delay_seconds integer DEFAULT 60)
RETURNS timestamp with time zone
LANGUAGE plpgsql
SET search_path = public
AS $function$
BEGIN
  -- Exponential backoff: base_delay * (2 ^ retry_count)
  -- Max delay capped at 1 hour
  RETURN now() + (LEAST(base_delay_seconds * POWER(2, retry_count), 3600) || ' seconds')::INTERVAL;
END;
$function$;

-- Update update_execution_limits_timestamp function
CREATE OR REPLACE FUNCTION public.update_execution_limits_timestamp()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;