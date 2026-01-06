-- Drop existing overly permissive policies on reservations
DROP POLICY IF EXISTS "Authenticated users can delete reservations" ON public.reservations;
DROP POLICY IF EXISTS "Authenticated users can insert reservations" ON public.reservations;
DROP POLICY IF EXISTS "Authenticated users can update reservations" ON public.reservations;
DROP POLICY IF EXISTS "Authenticated users can view reservations" ON public.reservations;

-- Create new policies that restrict access to admin or staff roles only
CREATE POLICY "Staff and admins can view reservations" 
ON public.reservations 
FOR SELECT 
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'staff'::app_role)
);

CREATE POLICY "Staff and admins can insert reservations" 
ON public.reservations 
FOR INSERT 
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'staff'::app_role)
);

CREATE POLICY "Staff and admins can update reservations" 
ON public.reservations 
FOR UPDATE 
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'staff'::app_role)
)
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'staff'::app_role)
);

CREATE POLICY "Staff and admins can delete reservations" 
ON public.reservations 
FOR DELETE 
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'staff'::app_role)
);

-- Also update time_blocks table with the same restrictions
DROP POLICY IF EXISTS "Authenticated users can delete time_blocks" ON public.time_blocks;
DROP POLICY IF EXISTS "Authenticated users can insert time_blocks" ON public.time_blocks;
DROP POLICY IF EXISTS "Authenticated users can update time_blocks" ON public.time_blocks;
DROP POLICY IF EXISTS "Authenticated users can view time_blocks" ON public.time_blocks;

CREATE POLICY "Staff and admins can view time_blocks" 
ON public.time_blocks 
FOR SELECT 
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'staff'::app_role)
);

CREATE POLICY "Staff and admins can insert time_blocks" 
ON public.time_blocks 
FOR INSERT 
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'staff'::app_role)
);

CREATE POLICY "Staff and admins can update time_blocks" 
ON public.time_blocks 
FOR UPDATE 
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'staff'::app_role)
)
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'staff'::app_role)
);

CREATE POLICY "Staff and admins can delete time_blocks" 
ON public.time_blocks 
FOR DELETE 
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'staff'::app_role)
);