-- Drop existing overly permissive SELECT policy on profiles
DROP POLICY IF EXISTS "Profiles are viewable by authenticated users" ON public.profiles;

-- Create new restricted SELECT policy
-- Users can view their own profile, admins and staff can view all
CREATE POLICY "Users can view own profile or staff can view all" 
ON public.profiles 
FOR SELECT 
USING (
  auth.uid() = id OR
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'staff'::app_role)
);

-- Add explicit DELETE policy - only admins can delete profiles
CREATE POLICY "Only admins can delete profiles" 
ON public.profiles 
FOR DELETE 
USING (
  has_role(auth.uid(), 'admin'::app_role)
);