

# Horarios extra con hora personalizada

## Resumen
Cambiar el formulario de horarios extra para permitir escribir cualquier hora (ej. 4:20 pm, 10:30 pm) en lugar de elegir solo de los 4 horarios fijos.

## Cambios principales

### 1. ExtraSlotForm - Input de hora libre
Reemplazar el `Select` de horarios por un campo de entrada de hora (`input type="time"`), que permite elegir cualquier hora del dia. El valor se guardara en formato "HH:mm" (ej. "16:20", "22:30").

La interfaz del formulario cambiara de:
- Select con 4 opciones fijas --> Input de hora donde escribes o seleccionas cualquier hora

### 2. Actualizar tipo ExtraSlot y almacenamiento
El campo `horario` en la tabla `extra_slots` ya es tipo `text`, asi que puede almacenar cualquier valor. Se guardara en formato "HH:mm" (ej. "16:20") en lugar de "COMIDA" o "NOCHE".

Actualizar la interfaz `ExtraSlot` en `types/reservation.ts` para que `horario` sea `string` (ya no limitado a `TimeSlot`).

### 3. Actualizar getAvailableTimeSlots
Modificar la funcion para que cuando encuentre extra slots con formato "HH:mm", genere entradas con la hora/minuto correctos y una etiqueta legible (ej. "4:20 pm").

### 4. Actualizar visualizacion en Bloqueos.tsx
En la lista de horarios extra activos, mostrar la hora formateada (ej. "4:20 pm") en lugar de buscar en TIME_SLOTS (que no encontraria horas personalizadas).

### 5. Actualizar TimeSlotCard y DayAgenda
El `TimeSlotCard` ya tiene un fallback (`timeLabel = ... || horario`), asi que mostrara correctamente las horas personalizadas. Solo hay que asegurar que `getAvailableTimeSlots` retorne la etiqueta correcta.

---

## Detalles tecnicos

- El `ExtraSlotForm` usara `<Input type="time" />` nativo del navegador, que muestra un selector de hora en movil y escritorio
- Se creara una funcion auxiliar `formatTimeLabel(timeStr: string)` que convierte "16:20" a "4:20 pm"
- El tipo `TimeSlot` seguira siendo el enum para los horarios base; los extra slots usaran `string` para su horario
- En `Bloqueos.tsx`, la etiqueta del horario extra se calculara con `formatTimeLabel` en lugar de buscar en `TIME_SLOTS`

