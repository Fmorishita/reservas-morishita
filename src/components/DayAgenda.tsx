import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { TIME_SLOTS, TimeSlot, Reservation, TimeBlock } from "@/types/reservation";
import { TimeSlotCard } from "./TimeSlotCard";
import { Badge } from "@/components/ui/badge";
import { Lock } from "lucide-react";

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
    <div className="space-y-3 animate-slide-in">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-medium capitalize">{dayName}</h2>
          <p className="text-sm text-muted-foreground capitalize">{formattedDate}</p>
        </div>
        {dayBlocked && (
          <Badge variant="secondary" className="gap-1">
            <Lock className="w-3 h-3" />
            Día cerrado
          </Badge>
        )}
      </div>

      {dayBlocked ? (
        <div className="p-6 rounded-lg bg-muted text-center">
          <Lock className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
          <p className="text-muted-foreground">
            {dayBlock?.motivo_bloqueo || "Este día está cerrado"}
          </p>
        </div>
      ) : (
        <div className="grid gap-3">
          {TIME_SLOTS.map(({ value }) => {
            const slotReservations = reservations.filter(
              (r) => r.horario === value && r.estado !== "Cancelada"
            );
            const blocked = isSlotBlocked(fecha, value);
            const blockReason = blocks.find(
              (b) => b.horario === value
            )?.motivo_bloqueo;

            return (
              <TimeSlotCard
                key={value}
                horario={value}
                reservations={slotReservations}
                capacity={getCapacity(fecha, value)}
                isBlocked={blocked}
                blockReason={blockReason}
                onReservationClick={onReservationClick}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
