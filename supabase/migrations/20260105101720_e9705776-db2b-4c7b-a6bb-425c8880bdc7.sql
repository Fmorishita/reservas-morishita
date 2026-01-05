-- Create reservations table
CREATE TABLE public.reservations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  fecha DATE NOT NULL,
  horario TEXT NOT NULL CHECK (horario IN ('COMIDA', 'TARDE', 'CENA')),
  numero_personas INTEGER NOT NULL CHECK (numero_personas >= 1 AND numero_personas <= 4),
  nombre_cliente TEXT NOT NULL,
  whatsapp TEXT,
  motivo_visita TEXT,
  tipo_menu TEXT NOT NULL DEFAULT 'Omakase 12 tiempos',
  alergias TEXT,
  notas_internas TEXT,
  estado TEXT NOT NULL DEFAULT 'Confirmada' CHECK (estado IN ('Confirmada', 'Pendiente', 'Cancelada', 'Completada')),
  reminder_24h_shown BOOLEAN NOT NULL DEFAULT false,
  reminder_2h_shown BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create time blocks table
CREATE TABLE public.time_blocks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  fecha DATE NOT NULL,
  horario TEXT NOT NULL CHECK (horario IN ('COMIDA', 'TARDE', 'CENA', 'DIA_COMPLETO')),
  motivo TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.time_blocks ENABLE ROW LEVEL SECURITY;

-- Create policies for public access (no auth required for this internal app)
CREATE POLICY "Allow all operations on reservations" 
ON public.reservations 
FOR ALL 
USING (true)
WITH CHECK (true);

CREATE POLICY "Allow all operations on time_blocks" 
ON public.time_blocks 
FOR ALL 
USING (true)
WITH CHECK (true);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_reservations_updated_at
BEFORE UPDATE ON public.reservations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for reservations
ALTER PUBLICATION supabase_realtime ADD TABLE public.reservations;