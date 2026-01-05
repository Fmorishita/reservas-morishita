import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { format, parseISO, isAfter, startOfToday } from "date-fns";
import { es } from "date-fns/locale";
import { Filter, ChevronDown } from "lucide-react";
import { useReservations } from "@/hooks/useReservations";
import { RESERVATION_STATUSES, TIME_SLOTS, ReservationStatus } from "@/types/reservation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";

export default function ListaReservaciones() {
  const navigate = useNavigate();
  const { reservations, isLoading } = useReservations();
  const [statusFilter, setStatusFilter] = useState<ReservationStatus | "all">("all");
  const [showFilters, setShowFilters] = useState(false);

  // Filter and sort reservations
  const filteredReservations = useMemo(() => {
    const today = startOfToday();
    return reservations
      .filter((r) => {
        // Only future reservations
        if (!isAfter(parseISO(r.fecha), today) && parseISO(r.fecha).toDateString() !== today.toDateString()) {
          return false;
        }
        // Status filter
        if (statusFilter !== "all" && r.estado !== statusFilter) {
          return false;
        }
        return true;
      })
      .sort((a, b) => {
        // Sort by date, then by time
        const dateCompare = new Date(a.fecha).getTime() - new Date(b.fecha).getTime();
        if (dateCompare !== 0) return dateCompare;
        return a.horario.localeCompare(b.horario);
      });
  }, [reservations, statusFilter]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">Cargando reservaciones...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 md:pt-14">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-medium">Reservaciones</h1>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowFilters(!showFilters)}
          className="gap-2"
        >
          <Filter className="w-4 h-4" />
          Filtros
        </Button>
      </div>

      {/* Filters */}
      <Collapsible open={showFilters} onOpenChange={setShowFilters}>
        <CollapsibleContent className="space-y-3 pb-4">
          <div className="space-y-2">
            <label className="text-sm text-muted-foreground">Estado</label>
            <Select
              value={statusFilter}
              onValueChange={(v) => setStatusFilter(v as ReservationStatus | "all")}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Todos los estados" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los estados</SelectItem>
                {RESERVATION_STATUSES.map((status) => (
                  <SelectItem key={status} value={status}>
                    {status}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* List */}
      {filteredReservations.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">No hay reservaciones que mostrar</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredReservations.map((reservation) => {
            const date = parseISO(reservation.fecha);
            const timeLabel = TIME_SLOTS.find(
              (t) => t.value === reservation.horario
            )?.label;

            return (
              <div
                key={reservation.id}
                onClick={() => navigate(`/editar/${reservation.id}`)}
                className="p-4 rounded-lg bg-card border border-border cursor-pointer hover:border-accent transition-colors animate-fade-in"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium truncate">{reservation.nombre_cliente}</p>
                    <p className="text-sm text-muted-foreground capitalize">
                      {format(date, "EEE d MMM", { locale: es })} · {timeLabel}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-muted-foreground">
                        {reservation.numero_personas} persona{reservation.numero_personas > 1 ? "s" : ""}
                      </span>
                      <span className="text-xs text-muted-foreground">·</span>
                      <span className="text-xs text-muted-foreground">
                        {reservation.tipo_menu}
                      </span>
                    </div>
                  </div>
                  <Badge
                    variant="outline"
                    className={cn(
                      "shrink-0 text-xs",
                      reservation.estado === "Confirmada" && "border-success text-success",
                      reservation.estado === "Pendiente" && "border-warning text-warning",
                      reservation.estado === "Cancelada" && "border-muted-foreground text-muted-foreground",
                      reservation.estado === "Completada" && "border-muted text-muted-foreground"
                    )}
                  >
                    {reservation.estado}
                  </Badge>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <p className="text-center text-sm text-muted-foreground">
        Mostrando {filteredReservations.length} reservación{filteredReservations.length !== 1 ? "es" : ""}
      </p>
    </div>
  );
}
