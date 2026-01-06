import { TimeSlot, TIME_SLOTS, MAX_CAPACITY, Reservation, PaymentMethod } from "@/types/reservation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Lock, Users, Clock, CreditCard, Banknote, Building2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useReminders } from "@/hooks/useReminders";

interface TimeSlotCardProps {
  horario: TimeSlot;
  reservations: Reservation[];
  capacity: number;
  isBlocked: boolean;
  blockReason?: string;
  onReservationClick?: (reservation: Reservation) => void;
}

const paymentIcons: Record<PaymentMethod, React.ReactNode> = {
  Efectivo: <Banknote className="w-3 h-3" />,
  Tarjeta: <CreditCard className="w-3 h-3" />,
  Transferencia: <Building2 className="w-3 h-3" />,
};

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
  const { isWithin24Hours, isWithin2Hours } = useReminders([]);

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
            {reservations.map((r) => {
              const within2h = isWithin2Hours(r);
              const within24h = isWithin24Hours(r);
              const isPaid = !!r.metodo_pago;

              return (
                <li
                  key={r.id}
                  onClick={() => onReservationClick?.(r)}
                  className={cn(
                    "flex items-center justify-between p-2 rounded-md cursor-pointer transition-colors",
                    within2h
                      ? "bg-destructive/10 border border-destructive/30 hover:bg-destructive/15"
                      : within24h
                      ? "bg-warning/10 border border-warning/30 hover:bg-warning/15"
                      : "bg-secondary hover:bg-secondary/80"
                  )}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-sm truncate">{r.nombre_cliente}</p>
                      {isPaid && (
                        <span className="text-success shrink-0" title={`Pagado: ${r.metodo_pago}`}>
                          {paymentIcons[r.metodo_pago as PaymentMethod]}
                        </span>
                      )}
                      {within2h && (
                        <Clock className="w-3 h-3 text-destructive shrink-0" />
                      )}
                      {within24h && !within2h && (
                        <Clock className="w-3 h-3 text-warning shrink-0" />
                      )}
                    </div>
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
                      r.estado === "Completada" && "border-muted text-muted-foreground"
                    )}
                  >
                    {r.estado}
                  </Badge>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">Sin reservaciones</p>
        )}
      </CardContent>
    </Card>
  );
}
