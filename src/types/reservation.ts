export type TimeSlot = "COMIDA" | "TARDE" | "CENA" | "NOCHE";
export type MenuType = "Omakase 14 tiempos";
export type ReservationStatus = "Pendiente" | "Confirmada" | "Cancelada" | "Completada";
export type PaymentMethod = "Efectivo" | "Tarjeta" | "Transferencia";

export interface Reservation {
  id: string;
  fecha: string; // YYYY-MM-DD
  horario: string;
  numero_personas: number;
  nombre_cliente: string;
  whatsapp: string | null;
  tipo_menu: string;
  motivo_visita: string | null;
  alergias: string | null;
  notas_internas: string | null;
  estado: ReservationStatus;
  reminder_24h_shown: boolean;
  reminder_2h_shown: boolean;
  created_at: string;
  updated_at: string;
  // Payment fields
  metodo_pago: PaymentMethod | null;
  monto_pagado: number | null;
  fecha_pago: string | null;
  notas_pago: string | null;
  ticket_imagen_url: string | null;
}

export interface TimeBlock {
  id: string;
  fecha: string; // YYYY-MM-DD
  horario: TimeSlot | "DIA_COMPLETO";
  motivo: string | null;
  created_at: string;
}

export const TIME_SLOTS: { value: TimeSlot; label: string; hour: number; minute: number }[] = [
  { value: "COMIDA", label: "1:00 pm", hour: 13, minute: 0 },
  { value: "TARDE", label: "3:30 pm", hour: 15, minute: 30 },
  { value: "CENA", label: "6:00 pm", hour: 18, minute: 0 },
  { value: "NOCHE", label: "8:30 pm", hour: 20, minute: 30 },
];

export type AvailableTimeSlot = { value: string; label: string; hour: number; minute: number };

export const getAvailableTimeSlots = (date: Date, extraSlots?: ExtraSlot[]) => {
  const isSunday = date.getDay() === 0;
  const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  const baseSlots: AvailableTimeSlot[] = TIME_SLOTS.filter(slot => !(isSunday && slot.value === "NOCHE"));
  
  if (!extraSlots) return baseSlots;
  
  // Add extra slots for this date
  const extraForDate = extraSlots.filter(es => es.fecha === dateStr);
  const extraTimeSlots = extraForDate
    .map(es => {
      // Check if it matches a predefined slot
      const predefined = TIME_SLOTS.find(ts => ts.value === es.horario);
      if (predefined) {
        if (baseSlots.some(bs => bs.value === predefined.value)) return null;
        return predefined;
      }
      // Custom HH:mm format
      const [hStr, mStr] = es.horario.split(":");
      if (!hStr || !mStr) return null;
      const hour = parseInt(hStr, 10);
      const minute = parseInt(mStr, 10);
      return {
        value: es.horario,
        label: formatTimeLabel(es.horario),
        hour,
        minute,
      };
    })
    .filter((ts): ts is AvailableTimeSlot => !!ts);
  
  return [...baseSlots, ...extraTimeSlots].sort((a, b) => a.hour * 60 + a.minute - (b.hour * 60 + b.minute));
};

export const MENU_TYPES: MenuType[] = ["Omakase 14 tiempos"];

export const RESERVATION_STATUSES: ReservationStatus[] = [
  "Pendiente",
  "Confirmada",
  "Cancelada",
  "Completada",
];

export const PAYMENT_METHODS: PaymentMethod[] = [
  "Efectivo",
  "Tarjeta",
  "Transferencia",
];

export const MAX_CAPACITY = 4;

export interface ExtraSlot {
  id: string;
  fecha: string; // YYYY-MM-DD
  horario: string; // "HH:mm" format for custom times, or TimeSlot value
  motivo: string | null;
  created_at: string;
}

/** Convert "HH:mm" (24h) to readable label like "4:20 pm" */
export function formatTimeLabel(timeStr: string): string {
  // Check if it's a predefined TimeSlot
  const predefined = TIME_SLOTS.find(t => t.value === timeStr);
  if (predefined) return predefined.label;
  
  // Parse HH:mm format
  const [hStr, mStr] = timeStr.split(":");
  if (!hStr || !mStr) return timeStr;
  const h = parseInt(hStr, 10);
  const m = parseInt(mStr, 10);
  const suffix = h >= 12 ? "pm" : "am";
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${h12}:${String(m).padStart(2, "0")} ${suffix}`;
}
