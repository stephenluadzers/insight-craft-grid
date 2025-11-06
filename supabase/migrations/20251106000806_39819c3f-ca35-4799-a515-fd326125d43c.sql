-- Fix function search path for security  
ALTER FUNCTION trigger_set_updated_at() SET search_path = pg_catalog, public;