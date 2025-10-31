-- Add lifetime_access field to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS lifetime_access boolean DEFAULT false;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_profiles_lifetime_access 
ON public.profiles(lifetime_access) 
WHERE lifetime_access = true;