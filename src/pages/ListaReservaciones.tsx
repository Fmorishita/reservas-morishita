import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { format, parseISO, isAfter, startOfToday, isBefore } from "date-fns";
import { es } from "date-fns/locale";
import { Filter, Download, CreditCard, Banknote, Building2 } from "lucide-react";
import { useReservations } from "@/hooks/useReservations";
import { RESERVATION_STATUSES, TIME_SLOTS, ReservationStatus, PAYMENT_METHODS, PaymentMethod } from "@/types/reservation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

type PaymentFilter = "all" | "paid" | "unpaid";

const paymentIcons: Record<PaymentMethod, React.ReactNode> = {
  Efectivo: <Banknote className="w-3 h-3" />,
  Tarjeta: <CreditCard className="w-3 h-3" />,
  Transferencia: <Building2 className="w-3 h-3" />,
};

export default function ListaReservaciones() {
  const navigate = useNavigate();
  const { reservations, isLoading } = useReservations();
  const [statusFilter, setStatusFilter] = useState<ReservationStatus | "all">("all");
  const [paymentFilter, setPaymentFilter] = useState<PaymentFilter>("all");
  const [paymentMethodFilter, setPaymentMethodFilter] = useState<PaymentMethod | "all">("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  // Filter and sort reservations
  const filteredReservations = useMemo(() => {
    const today = startOfToday();
    return reservations
      .filter((r) => {
        // Date range filter (if set)
        if (dateFrom && isBefore(parseISO(r.fecha), parseISO(dateFrom))) {
          return false;
        }
        if (dateTo && isAfter(parseISO(r.fecha), parseISO(dateTo))) {
          return false;
        }
        // If no date filters, only show future reservations
        if (!dateFrom && !dateTo) {
          if (!isAfter(parseISO(r.fecha), today) && parseISO(r.fecha).toDateString() !== today.toDateString()) {
            return false;
          }
        }
        // Status filter
        if (statusFilter !== "all" && r.estado !== statusFilter) {
          return false;
        }
        // Payment status filter
        if (paymentFilter === "paid" && !r.metodo_pago) {
          return false;
        }
        if (paymentFilter === "unpaid" && r.metodo_pago) {
          return false;
        }
        // Payment method filter
        if (paymentMethodFilter !== "all" && r.metodo_pago !== paymentMethodFilter) {
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
  }, [reservations, statusFilter, paymentFilter, paymentMethodFilter, dateFrom, dateTo]);

  const handleExportCSV = () => {
    const headers = [
      "Fecha",
      "Horario",
      "Nombre",
      "WhatsApp",
      "Personas",
      "Menú",
      "Estado",
      "Alergias",
      "Motivo",
      "Método de Pago",
      "Monto Pagado",
      "Fecha de Pago",
      "URL Ticket",
      "Notas Internas",
      "Notas de Pago",
    ];

    const rows = filteredReservations.map((r) => {
      const timeLabel = TIME_SLOTS.find((t) => t.value === r.horario)?.label || r.horario;
      return [
        format(parseISO(r.fecha), "yyyy-MM-dd"),
        timeLabel,
        r.nombre_cliente,
        r.whatsapp || "",
        r.numero_personas.toString(),
        r.tipo_menu,
        r.estado,
        r.alergias || "",
        r.motivo_visita || "",
        r.metodo_pago || "Sin pagar",
        r.monto_pagado?.toString() || "",
        r.fecha_pago ? format(new Date(r.fecha_pago), "yyyy-MM-dd HH:mm") : "",
        r.ticket_imagen_url || "",
        r.notas_internas || "",
        r.notas_pago || "",
      ];
    });

    const csvContent = [
      headers.join(","),
      ...rows.map((row) =>
        row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(",")
      ),
    ].join("\n");

    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `reservaciones_${format(new Date(), "yyyy-MM-dd")}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">Cargando reservaciones...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 md:pt-14">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-2xl font-medium">Reservaciones</h1>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCSV}
            className="gap-2"
            disabled={filteredReservations.length === 0}
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">Exportar</span>
          </Button>
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
      </div>

      {/* Filters */}
      <Collapsible open={showFilters} onOpenChange={setShowFilters}>
        <CollapsibleContent className="space-y-4 pb-4">
          {/* Date range */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">Desde</Label>
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">Hasta</Label>
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
              />
            </div>
          </div>

          {/* Status filter */}
          <div className="space-y-2">
            <Label className="text-sm text-muted-foreground">Estado</Label>
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

          {/* Payment filters */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">Estado de pago</Label>
              <Select
                value={paymentFilter}
                onValueChange={(v) => setPaymentFilter(v as PaymentFilter)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="paid">Pagados</SelectItem>
                  <SelectItem value="unpaid">Sin pagar</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">Método de pago</Label>
              <Select
                value={paymentMethodFilter}
                onValueChange={(v) => setPaymentMethodFilter(v as PaymentMethod | "all")}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {PAYMENT_METHODS.map((method) => (
                    <SelectItem key={method} value={method}>
                      {method}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Clear filters */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setStatusFilter("all");
              setPaymentFilter("all");
              setPaymentMethodFilter("all");
              setDateFrom("");
              setDateTo("");
            }}
            className="w-full"
          >
            Limpiar filtros
          </Button>
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
            const isPaid = !!reservation.metodo_pago;

            return (
              <div
                key={reservation.id}
                onClick={() => navigate(`/editar/${reservation.id}`)}
                className="p-4 rounded-lg bg-card border border-border cursor-pointer hover:border-accent transition-colors animate-fade-in"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium truncate">{reservation.nombre_cliente}</p>
                      {isPaid && (
                        <Badge variant="outline" className="border-success text-success gap-1 shrink-0">
                          {paymentIcons[reservation.metodo_pago as PaymentMethod]}
                          <span className="text-xs">Pagado</span>
                        </Badge>
                      )}
                    </div>
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
                      {reservation.monto_pagado && (
                        <>
                          <span className="text-xs text-muted-foreground">·</span>
                          <span className="text-xs text-success font-medium">
                            ${reservation.monto_pagado.toLocaleString("es-MX")}
                          </span>
                        </>
                      )}
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
