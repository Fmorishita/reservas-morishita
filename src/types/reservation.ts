export type TimeSlot = "13:00" | "15:30" | "18:00";
export type MenuType = "Omakase 12 tiempos" | "Omakase Libre";
export type ReservationStatus = "Pendiente" | "Confirmada" | "Cancelada" | "No show";

export interface Reservation {
  id: string;
  fecha: string; // YYYY-MM-DD
  horario: TimeSlot;
  numero_personas: number;
  nombre_cliente: string;
  whatsapp: string;
  tipo_menu: MenuType;
  motivo_visita: string;
  alergias_restricciones: string;
  estado: ReservationStatus;
  notas_internas: string;
  created_at: string;
  updated_at: string;
}

export interface TimeBlock {
  id: string;
  fecha: string; // YYYY-MM-DD
  horario: TimeSlot | "DIA_COMPLETO";
  motivo_bloqueo: string;
}

export const TIME_SLOTS: { value: TimeSlot; label: string }[] = [
  { value: "13:00", label: "1:00 pm" },
  { value: "15:30", label: "3:30 pm" },
  { value: "18:00", label: "6:00 pm" },
];

export const MENU_TYPES: MenuType[] = ["Omakase 12 tiempos", "Omakase Libre"];

export const RESERVATION_STATUSES: ReservationStatus[] = [
  "Pendiente",
  "Confirmada",
  "Cancelada",
  "No show",
];

export const MAX_CAPACITY = 4;
