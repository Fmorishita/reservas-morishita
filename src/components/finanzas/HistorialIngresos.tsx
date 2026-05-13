import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronDown, Banknote, CreditCard, ArrowDownToLine, Users, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatoMoneda, formatoFecha } from "@/lib/finanzas/formato";
import type { MovimientoIngreso } from "@/lib/finanzas/types";

const TIPO_BADGE: Record<MovimientoIngreso["tipo"], { label: string; cls: string }> = {
  deposito_reserva:    { label: "Anticipo",     cls: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400" },
  pago_sitio_reserva:  { label: "Pago en sitio",cls: "bg-blue-500/10 text-blue-700 dark:text-blue-400" },
  ingreso_sitio:       { label: "Adicional",    cls: "bg-purple-500/10 text-purple-700 dark:text-purple-400" },
};

function iconoMetodo(metodo: string) {
  const m = metodo.toLowerCase();
  if (m.includes("efectivo")) return <Banknote className="w-3.5 h-3.5" />;
  if (m.includes("transfer") || m.includes("cohete")) return <ArrowDownToLine className="w-3.5 h-3.5" />;
  if (m.includes("terminal") || m.includes("tarjeta")) return <CreditCard className="w-3.5 h-3.5" />;
  return null;
}

export function HistorialIngresos({ movimientos }: { movimientos: MovimientoIngreso[] }) {
  const [abierto, setAbierto] = useState(true);
  const navigate = useNavigate();

  const handleClickMovimiento = (m: MovimientoIngreso) => {
    if (m.reserva_id) {
      // Anticipo o pago final de reserva → ir a editar la reserva
      navigate(`/editar/${m.reserva_id}`);
    }
    // Ingresos manuales (walk-ins) no tienen pantalla de edición propia todavía
  };

  if (movimientos.length === 0) {
    return (
      <div className="bg-card rounded-2xl p-4 border border-border">
        <h3 className="text-sm font-semibold mb-2">Historial de ventas</h3>
        <p className="text-xs text-muted-foreground py-4 text-center">
          Aún no hay movimientos en este rango. Confirma una reserva o registra un walk-in.
        </p>
      </div>
    );
  }

  // Agrupar por fecha desc
  const grupos = movimientos.reduce<Record<string, MovimientoIngreso[]>>((acc, m) => {
    (acc[m.fecha] ??= []).push(m);
    return acc;
  }, {});
  const fechasOrdenadas = Object.keys(grupos).sort((a, b) => (a < b ? 1 : -1));

  return (
    <div className="bg-card rounded-2xl border border-border overflow-hidden">
      <button
        onClick={() => setAbierto((s) => !s)}
        className="w-full flex items-center justify-between p-4 hover:bg-secondary/30 transition-colors"
      >
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold">Historial de ventas</h3>
          <span className="text-xs text-muted-foreground">({movimientos.length})</span>
        </div>
        <ChevronDown
          className={cn("w-4 h-4 text-muted-foreground transition-transform", abierto && "rotate-180")}
        />
      </button>

      {abierto && (
        <div className="border-t border-border divide-y divide-border">
          {fechasOrdenadas.map((fecha) => {
            const items = grupos[fecha];
            const total = items.reduce((s, m) => s + Number(m.monto), 0);
            return (
              <div key={fecha} className="bg-background/40">
                <div className="flex items-center justify-between px-4 py-2 bg-secondary/30">
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    {formatoFecha(fecha)}
                  </span>
                  <span className="text-xs font-semibold tabular-nums">{formatoMoneda(total)}</span>
                </div>
                <ul className="divide-y divide-border/50">
                  {items.map((m) => {
                    const badge = TIPO_BADGE[m.tipo];
                    return (
                      <li
                        key={m.id}
                        onClick={() => handleClickMovimiento(m)}
                        className={cn(
                          "px-4 py-3 flex items-start justify-between gap-3 transition-colors",
                          m.reserva_id && "cursor-pointer hover:bg-secondary/40 active:bg-secondary/60"
                        )}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={cn("text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded font-medium", badge.cls)}>
                              {badge.label}
                            </span>
                            {m.numero_personas != null && (
                              <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
                                <Users className="w-3 h-3" /> {m.numero_personas}
                              </span>
                            )}
                            <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
                              {iconoMetodo(m.metodo)} {m.metodo}
                            </span>
                          </div>
                          <p className="text-sm mt-1 truncate">{m.descripcion}</p>
                          {m.tipo_menu && (
                            <p className="text-xs text-muted-foreground truncate">{m.tipo_menu}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <span className="text-sm font-semibold tabular-nums whitespace-nowrap">
                            {formatoMoneda(Number(m.monto))}
                          </span>
                          {m.reserva_id && (
                            <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
