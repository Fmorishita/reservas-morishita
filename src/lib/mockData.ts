import { Reservation, TimeBlock } from "@/types/reservation";

// Helper to get next weekend dates
function getNextWeekendDates(): string[] {
  const today = new Date();
  const dates: string[] = [];
  
  // Find next Saturday
  let saturday = new Date(today);
  const dayOfWeek = saturday.getDay();
  const daysUntilSaturday = (6 - dayOfWeek + 7) % 7 || 7;
  saturday.setDate(today.getDate() + daysUntilSaturday - 7); // Previous Saturday
  
  // Add two weekends
  for (let w = 0; w < 3; w++) {
    const sat = new Date(saturday);
    sat.setDate(saturday.getDate() + w * 7);
    const sun = new Date(sat);
    sun.setDate(sat.getDate() + 1);
    dates.push(sat.toISOString().split("T")[0]);
    dates.push(sun.toISOString().split("T")[0]);
  }
  
  return dates;
}

const weekendDates = getNextWeekendDates();

export const mockReservations: Reservation[] = [
  {
    id: "1",
    fecha: weekendDates[0],
    horario: "13:00",
    numero_personas: 2,
    nombre_cliente: "María García",
    whatsapp: "+52 55 1234 5678",
    tipo_menu: "Omakase 12 tiempos",
    motivo_visita: "Aniversario",
    alergias_restricciones: "Sin mariscos",
    estado: "Confirmada",
    notas_internas: "Mesa especial para aniversario",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "2",
    fecha: weekendDates[0],
    horario: "13:00",
    numero_personas: 2,
    nombre_cliente: "Carlos López",
    whatsapp: "+52 55 9876 5432",
    tipo_menu: "Omakase Libre",
    motivo_visita: "Cumpleaños",
    alergias_restricciones: "",
    estado: "Pendiente",
    notas_internas: "",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "3",
    fecha: weekendDates[0],
    horario: "15:30",
    numero_personas: 4,
    nombre_cliente: "Ana Martínez",
    whatsapp: "+52 55 5555 1234",
    tipo_menu: "Omakase 12 tiempos",
    motivo_visita: "Negocios",
    alergias_restricciones: "Vegetariano un comensal",
    estado: "Confirmada",
    notas_internas: "Reunión importante",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "4",
    fecha: weekendDates[1],
    horario: "18:00",
    numero_personas: 2,
    nombre_cliente: "Roberto Sánchez",
    whatsapp: "+52 55 4444 3333",
    tipo_menu: "Omakase Libre",
    motivo_visita: "Cena en pareja",
    alergias_restricciones: "",
    estado: "Confirmada",
    notas_internas: "",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "5",
    fecha: weekendDates[2],
    horario: "13:00",
    numero_personas: 3,
    nombre_cliente: "Laura Hernández",
    whatsapp: "+52 55 2222 1111",
    tipo_menu: "Omakase 12 tiempos",
    motivo_visita: "Amigos",
    alergias_restricciones: "Alergia a nueces",
    estado: "Pendiente",
    notas_internas: "",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

export const mockBlocks: TimeBlock[] = [
  {
    id: "b1",
    fecha: weekendDates[3],
    horario: "DIA_COMPLETO",
    motivo_bloqueo: "Evento privado",
  },
  {
    id: "b2",
    fecha: weekendDates[2],
    horario: "18:00",
    motivo_bloqueo: "Mantenimiento",
  },
];
