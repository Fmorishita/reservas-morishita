import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { Reservation, TIME_SLOTS, RESERVATION_STATUSES, ReservationStatus } from "@/types/reservation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Phone, Calendar, Users, UtensilsCrossed, MessageSquare, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface ReservationDetailProps {
  reservation: Reservation | null;
  open: boolean;
  onClose: () => void;
  onEdit: (reservation: Reservation) => void;
  onStatusChange: (id: string, status: ReservationStatus) => void;
  onCancel: (id: string) => void;
}

export function ReservationDetail({
  reservation,
  open,
  onClose,
  onEdit,
  onStatusChange,
  onCancel,
}: ReservationDetailProps) {
  if (!reservation) return null;

  const date = parseISO(reservation.fecha);
  const timeLabel = TIME_SLOTS.find((t) => t.value === reservation.horario)?.label;

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="text-left">{reservation.nombre_cliente}</SheetTitle>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Status */}
          <div className="space-y-2">
            <Label>Estado</Label>
            <Select
              value={reservation.estado}
              onValueChange={(v) => onStatusChange(reservation.id, v as ReservationStatus)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {RESERVATION_STATUSES.map((status) => (
                  <SelectItem key={status} value={status}>
                    {status}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Details */}
          <div className="space-y-4">
            <div className="flex items-center gap-3 text-sm">
              <Calendar className="w-4 h-4 text-muted-foreground" />
              <span className="capitalize">
                {format(date, "EEEE, d 'de' MMMM yyyy", { locale: es })}
              </span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <span className="w-4 h-4 flex items-center justify-center text-muted-foreground">⏰</span>
              <span>{timeLabel}</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <Users className="w-4 h-4 text-muted-foreground" />
              <span>{reservation.numero_personas} persona{reservation.numero_personas > 1 ? "s" : ""}</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <Phone className="w-4 h-4 text-muted-foreground" />
              <a href={`tel:${reservation.whatsapp}`} className="text-accent hover:underline">
                {reservation.whatsapp}
              </a>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <UtensilsCrossed className="w-4 h-4 text-muted-foreground" />
              <span>{reservation.tipo_menu}</span>
            </div>
          </div>

          {/* Visit reason */}
          {reservation.motivo_visita && (
            <div className="space-y-2">
              <Label className="text-muted-foreground">Motivo de la visita</Label>
              <p className="text-sm">{reservation.motivo_visita}</p>
            </div>
          )}

          {/* Allergies */}
          {reservation.alergias_restricciones && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-warning" />
                <Label className="text-warning">Alergias / Restricciones</Label>
              </div>
              <p className="text-sm bg-warning/10 p-3 rounded-md">
                {reservation.alergias_restricciones}
              </p>
            </div>
          )}

          {/* Internal notes */}
          {reservation.notas_internas && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-muted-foreground" />
                <Label className="text-muted-foreground">Notas internas</Label>
              </div>
              <p className="text-sm bg-muted p-3 rounded-md">{reservation.notas_internas}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t">
            <Button variant="outline" onClick={() => onEdit(reservation)} className="flex-1">
              Editar
            </Button>
            {reservation.estado !== "Cancelada" && (
              <Button
                variant="destructive"
                onClick={() => {
                  onCancel(reservation.id);
                  onClose();
                }}
                className="flex-1"
              >
                Cancelar reservación
              </Button>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
