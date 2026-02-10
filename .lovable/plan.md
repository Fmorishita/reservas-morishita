

# Agregar horarios extra por fecha

## Resumen
Crear la funcionalidad para agregar sesiones extra en fechas especificas. Por ejemplo, habilitar la sesion de 8:30 pm un domingo especifico aunque normalmente no esta disponible. Esto se manejara desde la misma pagina de Bloqueos, que pasara a llamarse "Gestionar horarios".

---

## 1. Nueva tabla en la base de datos: `extra_slots`

Crear una tabla para registrar horarios extra habilitados en fechas especificas:

| Columna | Tipo | Descripcion |
|---------|------|-------------|
| id | uuid | Identificador unico |
| fecha | date | Fecha del horario extra |
| horario | text | Horario a habilitar (COMIDA, TARDE, CENA, NOCHE) |
| motivo | text (nullable) | Razon del horario extra |
| created_at | timestamptz | Fecha de creacion |

Incluye politicas RLS para staff y admin (mismas que `time_blocks`).

---

## 2. Actualizar tipos en `src/types/reservation.ts`

- Agregar interfaz `ExtraSlot` con los campos de la tabla
- Modificar `getAvailableTimeSlots` para aceptar un segundo parametro opcional `extraSlots: ExtraSlot[]` que agregue horarios extra para esa fecha

---

## 3. Nuevo componente: `ExtraSlotForm`

Formulario similar a `BlockForm` pero para agregar horarios extra:
- Selector de fecha (solo fines de semana)
- Selector de horario (mostrando solo los horarios que NO estan ya disponibles ese dia, es decir, en domingo solo mostrara "8:30 pm")
- Campo de motivo opcional
- Boton "Agregar horario extra"

---

## 4. Actualizar `src/hooks/useReservations.ts`

- Agregar estado `extraSlots` y cargarlo junto con reservaciones y bloques
- Agregar funciones `addExtraSlot` y `removeExtraSlot`
- Modificar `getAvailableTimeSlots` para considerar los extra slots de cada fecha
- Exportar `extraSlots`, `addExtraSlot`, `removeExtraSlot`

---

## 5. Actualizar `src/pages/Bloqueos.tsx`

Reorganizar la pagina en dos secciones con tabs:
- **Tab "Bloquear"**: Formulario y lista de bloqueos (funcionalidad actual)
- **Tab "Horarios extra"**: Nuevo formulario `ExtraSlotForm` y lista de horarios extra activos con opcion de eliminar

Cambiar el titulo a "Gestionar horarios".

---

## 6. Actualizar `DayAgenda.tsx` y `ReservationForm.tsx`

- Pasar los `extraSlots` a `getAvailableTimeSlots` para que los domingos con horario extra de 8:30 pm lo muestren
- En `ReservationForm`, las opciones de horario incluiran los extra slots de la fecha seleccionada

---

## Resultado esperado

- Desde la pagina de gestion de horarios, podras agregar un horario extra (ej. 8:30 pm el domingo 15 de febrero)
- Ese horario aparecera en la agenda y estara disponible para reservaciones solo en esa fecha
- Los horarios extra se pueden eliminar en cualquier momento

