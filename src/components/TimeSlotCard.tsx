import { TimeSlot, TIME_SLOTS, MAX_CAPACITY, Reservation } from "@/types/reservation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Lock, Users } from "lucide-react";
import { cn } from "@/lib/utils";

interface TimeSlotCardProps {
  horario: TimeSlot;
  reservations: Reservation[];
  capacity: number;
  isBlocked: boolean;
  blockReason?: string;
  onReservationClick?: (reservation: Reservation) => void;
}

export function TimeSlotCard({
  horario,
  reservations,
  capacity,
  isBlocked,
  blockReason,
  onReservationClick,
}: TimeSlotCardProps) {
  const timeLabel = TIME_SLOTS.find((t) => t.value === horario)?.label || horario;
  const isFull = capacity >= MAX_CAPACITY;

  return (
    <Card
      className={cn(
        "transition-all duration-200 animate-fade-in",
        isBlocked && "opacity-60 bg-muted",
        isFull && !isBlocked && "border-accent"
      )}
    >
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-medium">{timeLabel}</CardTitle>
          {isBlocked ? (
            <Badge variant="secondary" className="gap-1">
              <Lock className="w-3 h-3" />
              Cerrado
            </Badge>
          ) : (
            <Badge
              variant={isFull ? "default" : "outline"}
              className={cn(
                "gap-1",
                isFull && "bg-accent text-accent-foreground"
              )}
            >
              <Users className="w-3 h-3" />
              {capacity} / {MAX_CAPACITY}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {isBlocked ? (
          <p className="text-sm text-muted-foreground">{blockReason || "Horario no disponible"}</p>
        ) : reservations.length > 0 ? (
          <ul className="space-y-2">
            {reservations.map((r) => (
              <li
                key={r.id}
                onClick={() => onReservationClick?.(r)}
                className="flex items-center justify-between p-2 rounded-md bg-secondary cursor-pointer hover:bg-secondary/80 transition-colors"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-sm truncate">{r.nombre_cliente}</p>
                  <p className="text-xs text-muted-foreground">
                    {r.numero_personas} persona{r.numero_personas > 1 ? "s" : ""} · {r.tipo_menu}
                  </p>
                </div>
                <Badge
                  variant="outline"
                  className={cn(
                    "ml-2 shrink-0 text-xs",
                    r.estado === "Confirmada" && "border-success text-success",
                    r.estado === "Pendiente" && "border-warning text-warning",
                    r.estado === "No show" && "border-destructive text-destructive"
                  )}
                >
                  {r.estado}
                </Badge>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">Sin reservaciones</p>
        )}
      </CardContent>
    </Card>
  );
}
