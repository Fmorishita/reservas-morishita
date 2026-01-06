-- Agregar columna para URL de imagen del ticket
ALTER TABLE public.reservations ADD COLUMN ticket_imagen_url TEXT NULL;

-- Crear bucket para almacenar fotos de tickets
INSERT INTO storage.buckets (id, name, public) 
VALUES ('payment-tickets', 'payment-tickets', true);

-- Política: usuarios autenticados pueden subir tickets
CREATE POLICY "Authenticated can upload tickets" ON storage.objects
  FOR INSERT TO authenticated 
  WITH CHECK (bucket_id = 'payment-tickets');

-- Política: usuarios autenticados pueden actualizar sus tickets
CREATE POLICY "Authenticated can update tickets" ON storage.objects
  FOR UPDATE TO authenticated 
  USING (bucket_id = 'payment-tickets');

-- Política: cualquiera puede ver los tickets (para reportes)
CREATE POLICY "Anyone can view tickets" ON storage.objects
  FOR SELECT USING (bucket_id = 'payment-tickets');

-- Política: usuarios autenticados pueden eliminar tickets
CREATE POLICY "Authenticated can delete tickets" ON storage.objects
  FOR DELETE TO authenticated 
  USING (bucket_id = 'payment-tickets');