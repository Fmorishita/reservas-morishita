
-- Create extra_slots table
CREATE TABLE public.extra_slots (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  fecha date NOT NULL,
  horario text NOT NULL,
  motivo text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.extra_slots ENABLE ROW LEVEL SECURITY;

-- RLS policies (same as time_blocks)
CREATE POLICY "Staff and admins can view extra_slots"
ON public.extra_slots FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'staff'::app_role));

CREATE POLICY "Staff and admins can insert extra_slots"
ON public.extra_slots FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'staff'::app_role));

CREATE POLICY "Staff and admins can update extra_slots"
ON public.extra_slots FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'staff'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'staff'::app_role));

CREATE POLICY "Staff and admins can delete extra_slots"
ON public.extra_slots FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'staff'::app_role));
