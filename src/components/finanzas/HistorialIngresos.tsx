import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronDown, Banknote, CreditCard, ArrowDownToLine, Users, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatoMoneda, formatoFecha } from "@/lib/finanzas/formato";
import type { MovimientoIngreso } from "@/lib/finanzas/types";

const PAGO_LABEL: Record<MovimientoIngreso["tipo"], { label: string; cls: string }> = {
  deposito_reserva:   { label: "Pago 1 · Anticipo",     cls: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400" },
  pago_sitio_reserva: { label: "Pago 2 · Pago en sitio",cls: "bg-blue-500/10 text-blue-700 dark:text-blue-400" },
  ingreso_sitio:      { label: "Adicional",             cls: "bg-purple-500/10 text-purple-700 dark:text-purple-400" },
};

function iconoMetodo(metodo: string) {
  const m = metodo.toLowerCase();
  if (m.includes("efectivo")) return <Banknote className="w-3.5 h-3.5" />;
  if (m.includes("transfer") || m.includes("cohete")) return <ArrowDownToLine className="w-3.5 h-3.5" />;
  if (m.includes("terminal") || m.includes("tarjeta")) return <CreditCard className="w-3.5 h-3.5" />;
  return null;
}

interface GrupoCliente {
  key: string;
  reserva_id: string | null;
  nombre: string;
  numero_personas: number | null;
  tipo_menu: string | null;
  items: MovimientoIngreso[];
  total: number;
}

/**
 * Agrupa los movimientos de una fecha por reserva (cliente).
 * - Movimientos con reserva_id se agrupan juntos (anticipo + pago en sitio).
 * - Ingresos manuales (walk-ins) van cada uno en su propio grupo.
 */
function agruparPorCliente(items: MovimientoIngreso[]): GrupoCliente[] {
  const map = new Map<string, GrupoCliente>();

  for (const m of items) {
    const key = m.reserva_id ?? `walkin:${m.id}`;
    let g = map.get(key);
    if (!g) {
      g = {
        key,
        reserva_id: m.reserva_id,
        nombre: m.nombre_cliente ?? (m.reserva_id ? "Reserva" : "Ingreso manual"),
        numero_personas: m.numero_personas,
        tipo_menu: m.tipo_menu,
        items: [],
        total: 0,
      };
      map.set(key, g);
    }
    g.items.push(m);
    g.total += Number(m.monto);
  }

  // Dentro de cada grupo, ordenar: anticipo → pago en sitio → adicional
  const orden: Record<MovimientoIngreso["tipo"], number> = {
    deposito_reserva: 0,
    pago_sitio_reserva: 1,
    ingreso_sitio: 2,
  };
  for (const g of map.values()) {
    g.items.sort((a, b) => orden[a.tipo] - orden[b.tipo]);
  }

  // Grupos ordenados por total desc (clientes que más pagaron primero)
  return [...map.values()].sort((a, b) => b.total - a.total);
}

export function HistorialIngresos({ movimientos }: { movimientos: MovimientoIngreso[] }) {
  const [abierto, setAbierto] = useState(true);
  const navigate = useNavigate();

  const handleClickMovimiento = (m: MovimientoIngreso) => {
    if (m.reserva_id) navigate(`/editar/${m.reserva_id}`);
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

  // Agrupar por fecha desc, luego por cliente
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
            const clientes = agruparPorCliente(items);

            return (
              <div key={fecha} className="bg-background/40">
                <div className="flex items-center justify-between px-4 py-2 bg-secondary/30">
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    {formatoFecha(fecha)}
                  </span>
                  <span className="text-xs font-semibold tabular-nums">{formatoMoneda(total)}</span>
                </div>

                <div className="divide-y divide-border/40">
                  {clientes.map((g) => (
                    <div key={g.key} className="px-3 py-2">
                      {/* Header del cliente */}
                      <div className="flex items-center justify-between gap-2 px-1 mb-1.5">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold truncate">{g.nombre}</p>
                          <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                            {g.numero_personas != null && (
                              <span className="inline-flex items-center gap-1">
                                <Users className="w-3 h-3" /> {g.numero_personas} pax
                              </span>
                            )}
                            {g.tipo_menu && <span className="truncate">· {g.tipo_menu}</span>}
                          </div>
                        </div>
                        <span className="text-sm font-bold tabular-nums whitespace-nowrap text-emerald-600 dark:text-emerald-400">
                          {formatoMoneda(g.total)}
                        </span>
                      </div>

                      {/* Pagos del cliente */}
                      <ul className="space-y-1">
                        {g.items.map((m) => {
                          const pago = PAGO_LABEL[m.tipo];
                          return (
                            <li
                              key={m.id}
                              onClick={() => handleClickMovimiento(m)}
                              className={cn(
                                "flex items-center justify-between gap-2 rounded-md px-2 py-1.5 transition-colors",
                                m.reserva_id && "cursor-pointer hover:bg-secondary/50 active:bg-secondary/70"
                              )}
                            >
                              <div className="min-w-0 flex-1 flex items-center gap-2 flex-wrap">
                                <span
                                  className={cn(
                                    "text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded font-medium whitespace-nowrap",
                                    pago.cls
                                  )}
                                >
                                  {pago.label}
                                </span>
                                <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
                                  {iconoMetodo(m.metodo)} {m.metodo}
                                </span>
                              </div>
                              <div className="flex items-center gap-1 shrink-0">
                                <span className="text-sm font-medium tabular-nums whitespace-nowrap">
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
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
