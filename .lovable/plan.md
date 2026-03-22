

# Reparar constraint que impide horarios extra personalizados

## Problema
La tabla `reservations` tiene un CHECK constraint que solo permite los valores 'COMIDA', 'TARDE', 'CENA', 'NOCHE' en la columna `horario`. Cuando se intenta crear una reservación en un horario extra como "20:30", la base de datos la rechaza con el error que se ve en la imagen.

## Solución

### Migración de base de datos
Eliminar el CHECK constraint de la columna `horario` en la tabla `reservations` para permitir valores en formato "HH:mm" además de los predefinidos:

```sql
ALTER TABLE public.reservations 
DROP CONSTRAINT IF EXISTS reservations_horario_check;
```

Esto es seguro porque la validación de horarios válidos ya se hace en el frontend con `getAvailableTimeSlots`, que solo muestra horarios base o extra slots configurados.

Un solo cambio en la base de datos, sin cambios de código.

