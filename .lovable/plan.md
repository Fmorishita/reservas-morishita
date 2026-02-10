

# Mostrar horarios extra en formato PM en la agenda

## Problema
En `TimeSlotCard.tsx`, cuando el horario es un extra slot con formato "HH:mm" (ej. "20:30"), el fallback muestra el valor crudo "20:30" en lugar de usar `formatTimeLabel` para convertirlo a "8:30 pm".

## Cambio

### `src/components/TimeSlotCard.tsx`
Reemplazar la linea que calcula `timeLabel`:

**Antes:**
```ts
const timeLabel = TIME_SLOTS.find((t) => t.value === horario)?.label || horario;
```

**Despues:**
```ts
const timeLabel = formatTimeLabel(horario);
```

La funcion `formatTimeLabel` ya existe en `src/types/reservation.ts` y maneja ambos casos: horarios predefinidos (COMIDA, TARDE, etc.) y formato "HH:mm" personalizado. Solo falta importarla y usarla.

Un cambio de una linea + un import.

