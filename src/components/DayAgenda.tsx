import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { TimeSlot, Reservation, TimeBlock, getAvailableTimeSlots } from "@/types/reservation";
import { TimeSlotCard } from "./TimeSlotCard";
import { Badge } from "@/components/ui/badge";
import { Lock, CalendarX } from "lucide-react";

interface DayAgendaProps {
  fecha: string;
  reservations: Reservation[];
  blocks: TimeBlock[];
  getCapacity: (fecha: string, horario: TimeSlot) => number;
  isSlotBlocked: (fecha: string, horario: TimeSlot) => boolean;
  isDayBlocked: (fecha: string) => boolean;
  onReservationClick?: (reservation: Reservation) => void;
}

export function DayAgenda({
  fecha,
  reservations,
  blocks,
  getCapacity,
  isSlotBlocked,
  isDayBlocked,
  onReservationClick,
}: DayAgendaProps) {
  const date = parseISO(fecha);
  const dayName = format(date, "EEEE", { locale: es });
  const formattedDate = format(date, "d 'de' MMMM", { locale: es });
  const dayBlocked = isDayBlocked(fecha);
  const dayBlock = blocks.find((b) => b.horario === "DIA_COMPLETO");

  return (
    <div className="space-y-4">
      {/* Day header */}
      <div className="flex items-center justify-between bg-card rounded-xl p-4 border border-border/50 shadow-soft">
        <div>
          <h2 className="text-xl md:text-2xl font-medium capitalize text-foreground">{dayName}</h2>
          <p className="text-sm text-muted-foreground capitalize mt-0.5">{formattedDate}</p>
        </div>
        {dayBlocked && (
          <Badge variant="secondary" className="gap-1.5 bg-muted/80 text-muted-foreground px-3 py-1.5">
            <Lock className="w-3.5 h-3.5" />
            Día cerrado
          </Badge>
        )}
      </div>

      {dayBlocked ? (
        <div className="p-8 rounded-xl bg-muted/50 border border-border/50 text-center animate-fade-in">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-muted mb-4">
            <CalendarX className="w-7 h-7 text-muted-foreground" />
          </div>
          <p className="text-muted-foreground font-medium">
            {dayBlock?.motivo || "Este día está cerrado"}
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {getAvailableTimeSlots(date).map(({ value }, index) => {
            const slotReservations = reservations.filter(
              (r) => r.horario === value && r.estado !== "Cancelada"
            );
            const blocked = isSlotBlocked(fecha, value);
            const blockReason = blocks.find(
              (b) => b.horario === value
            )?.motivo;

            return (
              <div 
                key={value} 
                className="animate-fade-in"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <TimeSlotCard
                  horario={value}
                  fecha={fecha}
                  reservations={slotReservations}
                  capacity={getCapacity(fecha, value)}
                  isBlocked={blocked}
                  blockReason={blockReason || undefined}
                  onReservationClick={onReservationClick}
                />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
