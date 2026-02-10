-- Make payment-tickets bucket private
UPDATE storage.buckets SET public = false WHERE id = 'payment-tickets';

-- Drop the existing public SELECT policy if it exists
DROP POLICY IF EXISTS "Anyone can view payment tickets" ON storage.objects;
DROP POLICY IF EXISTS "Public can view payment tickets" ON storage.objects;

-- Create policy: only authenticated staff/admin can view payment tickets
CREATE POLICY "Staff and admins can view payment tickets"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'payment-tickets' 
  AND (
    public.has_role(auth.uid(), 'admin'::public.app_role) 
    OR public.has_role(auth.uid(), 'staff'::public.app_role)
  )
);