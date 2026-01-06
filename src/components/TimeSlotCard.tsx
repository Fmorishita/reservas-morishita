import { TimeSlot, TIME_SLOTS, MAX_CAPACITY, Reservation, PaymentMethod } from "@/types/reservation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Lock, Users, Clock, CreditCard, Banknote, Building2, User } from "lucide-react";
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
  Efectivo: <Banknote className="w-3.5 h-3.5" />,
  Tarjeta: <CreditCard className="w-3.5 h-3.5" />,
  Transferencia: <Building2 className="w-3.5 h-3.5" />,
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

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <Card
      className={cn(
        "transition-all duration-300 hover-lift border-border/50 overflow-hidden",
        isBlocked && "opacity-60 bg-muted/50",
        isFull && !isBlocked && "ring-1 ring-gold/30 shadow-gold"
      )}
    >
      <CardHeader className="pb-3 bg-gradient-to-r from-secondary/50 to-transparent">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-medium flex items-center gap-2">
            <Clock className="w-4 h-4 text-muted-foreground" />
            {timeLabel}
          </CardTitle>
          {isBlocked ? (
            <Badge variant="secondary" className="gap-1.5 bg-muted text-muted-foreground">
              <Lock className="w-3 h-3" />
              Cerrado
            </Badge>
          ) : (
            <Badge
              variant={isFull ? "default" : "outline"}
              className={cn(
                "gap-1.5 font-medium",
                isFull && "gradient-gold text-primary-foreground border-0"
              )}
            >
              <Users className="w-3 h-3" />
              {capacity} / {MAX_CAPACITY}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {isBlocked ? (
          <p className="text-sm text-muted-foreground py-2">{blockReason || "Horario no disponible"}</p>
        ) : reservations.length > 0 ? (
          <ul className="space-y-2">
            {reservations.map((r, index) => {
              const within2h = isWithin2Hours(r);
              const within24h = isWithin24Hours(r);
              const isPaid = !!r.metodo_pago;

              return (
                <li
                  key={r.id}
                  onClick={() => onReservationClick?.(r)}
                  className={cn(
                    "flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all duration-300",
                    within2h
                      ? "bg-destructive/10 border border-destructive/30 hover:bg-destructive/15"
                      : within24h
                      ? "bg-warning/10 border border-warning/30 hover:bg-warning/15"
                      : "bg-secondary/50 border border-border/50 hover:bg-secondary/80 hover:border-border"
                  )}
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  {/* Avatar */}
                  <div className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center text-xs font-medium shrink-0",
                    within2h 
                      ? "bg-destructive/20 text-destructive" 
                      : within24h 
                      ? "bg-warning/20 text-warning" 
                      : "bg-muted text-muted-foreground"
                  )}>
                    {getInitials(r.nombre_cliente)}
                  </div>

                  {/* Content */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-sm truncate">{r.nombre_cliente}</p>
                      {isPaid && (
                        <span className="text-success shrink-0" title={`Pagado: ${r.metodo_pago}`}>
                          {paymentIcons[r.metodo_pago as PaymentMethod]}
                        </span>
                      )}
                      {within2h && (
                        <Clock className="w-3.5 h-3.5 text-destructive shrink-0 animate-pulse-soft" />
                      )}
                      {within24h && !within2h && (
                        <Clock className="w-3.5 h-3.5 text-warning shrink-0" />
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {r.numero_personas} persona{r.numero_personas > 1 ? "s" : ""} · {r.tipo_menu}
                    </p>
                  </div>

                  {/* Status badge */}
                  <Badge
                    variant="outline"
                    className={cn(
                      "shrink-0 text-xs font-medium px-2.5",
                      r.estado === "Confirmada" && "border-success/50 text-success bg-success/10",
                      r.estado === "Pendiente" && "border-warning/50 text-warning bg-warning/10",
                      r.estado === "Completada" && "border-muted text-muted-foreground bg-muted/50"
                    )}
                  >
                    {r.estado}
                  </Badge>
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="flex items-center gap-2 text-sm text-muted-foreground py-3">
            <User className="w-4 h-4" />
            Sin reservaciones
          </div>
        )}
      </CardContent>
    </Card>
  );
}
