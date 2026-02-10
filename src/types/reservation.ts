export type TimeSlot = "COMIDA" | "TARDE" | "CENA" | "NOCHE";
export type MenuType = "Omakase 12 tiempos";
export type ReservationStatus = "Pendiente" | "Confirmada" | "Cancelada" | "Completada";
export type PaymentMethod = "Efectivo" | "Tarjeta" | "Transferencia";

export interface Reservation {
  id: string;
  fecha: string; // YYYY-MM-DD
  horario: TimeSlot;
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

export const getAvailableTimeSlots = (date: Date, extraSlots?: ExtraSlot[]) => {
  const isSunday = date.getDay() === 0;
  const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  const baseSlots = TIME_SLOTS.filter(slot => !(isSunday && slot.value === "NOCHE"));
  
  if (!extraSlots) return baseSlots;
  
  // Add extra slots for this date that aren't already in baseSlots
  const extraForDate = extraSlots.filter(es => es.fecha === dateStr);
  const extraTimeSlots = extraForDate
    .map(es => TIME_SLOTS.find(ts => ts.value === es.horario))
    .filter((ts): ts is (typeof TIME_SLOTS)[number] => !!ts && !baseSlots.some(bs => bs.value === ts.value));
  
  return [...baseSlots, ...extraTimeSlots].sort((a, b) => a.hour * 60 + a.minute - (b.hour * 60 + b.minute));
};

export const MENU_TYPES: MenuType[] = ["Omakase 12 tiempos"];

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
  horario: TimeSlot;
  motivo: string | null;
  created_at: string;
}
