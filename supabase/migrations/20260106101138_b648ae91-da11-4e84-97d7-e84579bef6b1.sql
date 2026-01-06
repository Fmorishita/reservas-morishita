-- Actualizar constraint de la tabla reservations
ALTER TABLE public.reservations 
DROP CONSTRAINT IF EXISTS reservations_horario_check;

ALTER TABLE public.reservations 
ADD CONSTRAINT reservations_horario_check 
CHECK (horario IN ('COMIDA', 'TARDE', 'CENA', 'NOCHE'));

-- Actualizar constraint de la tabla time_blocks
ALTER TABLE public.time_blocks 
DROP CONSTRAINT IF EXISTS time_blocks_horario_check;

ALTER TABLE public.time_blocks 
ADD CONSTRAINT time_blocks_horario_check 
CHECK (horario IN ('COMIDA', 'TARDE', 'CENA', 'NOCHE', 'DIA_COMPLETO'));