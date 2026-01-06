-- Add payment tracking columns to reservations table
ALTER TABLE public.reservations 
ADD COLUMN metodo_pago TEXT DEFAULT NULL,
ADD COLUMN monto_pagado NUMERIC DEFAULT NULL,
ADD COLUMN fecha_pago TIMESTAMP WITH TIME ZONE DEFAULT NULL,
ADD COLUMN notas_pago TEXT DEFAULT NULL;

-- Add check constraint for valid payment methods
ALTER TABLE public.reservations 
ADD CONSTRAINT valid_metodo_pago CHECK (metodo_pago IS NULL OR metodo_pago IN ('Efectivo', 'Tarjeta', 'Transferencia'));