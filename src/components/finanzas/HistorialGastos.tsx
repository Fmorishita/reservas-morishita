import { ChevronDown, Receipt, User, Image as ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatoMoneda, formatoFecha } from "@/lib/finanzas/formato";
import type { Gasto } from "@/lib/finanzas/types";

const TIPO_BADGE: Record<Gasto["tipo"], { label: string; cls: string }> = {
  insumos:    { label: "Insumos",    cls: "bg-orange-500/10 text-orange-700 dark:text-orange-400" },
  publicidad: { label: "Publicidad", cls: "bg-pink-500/10 text-pink-700 dark:text-pink-400" },
  operacion:  { label: "Operación",  cls: "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400" },
};

const PAGADO_LABEL: Record<Gasto["pagado_por"], string> = {
  fran: "Fran",
  veronica: "Verónica",
  empresa: "Empresa",
};

interface HistorialGastosProps {
  gastos: Gasto[];
  abierto: boolean;
  onToggle: () => void;
}

export function HistorialGastos({ gastos, abierto, onToggle }: HistorialGastosProps) {
  if (gastos.length === 0) {
    return (
      <div id="historial-gastos" className="bg-card rounded-2xl p-4 border border-border">
        <h3 className="text-sm font-semibold mb-2">Detalle de gastos</h3>
        <p className="text-xs text-muted-foreground py-4 text-center">
          Sin gastos en este período.
        </p>
      </div>
    );
  }

  // Agrupar por fecha desc
  const grupos = gastos.reduce<Record<string, Gasto[]>>((acc, g) => {
    (acc[g.fecha] ??= []).push(g);
    return acc;
  }, {});
  const fechasOrdenadas = Object.keys(grupos).sort((a, b) => (a < b ? 1 : -1));

  const total = gastos.reduce((s, g) => s + Number(g.monto), 0);

  return (
    <div
      id="historial-gastos"
      className="bg-card rounded-2xl border border-border overflow-hidden scroll-mt-24"
    >
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-4 hover:bg-secondary/30 transition-colors"
      >
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold">Detalle de gastos</h3>
          <span className="text-xs text-muted-foreground">({gastos.length})</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold tabular-nums text-red-600 dark:text-red-400">
            -{formatoMoneda(total)}
          </span>
          <ChevronDown
            className={cn(
              "w-4 h-4 text-muted-foreground transition-transform",
              abierto && "rotate-180",
            )}
          />
        </div>
      </button>

      {abierto && (
        <div className="border-t border-border divide-y divide-border">
          {fechasOrdenadas.map((fecha) => {
            const items = grupos[fecha];
            const totalDia = items.reduce((s, g) => s + Number(g.monto), 0);
            return (
              <div key={fecha} className="bg-background/40">
                <div className="flex items-center justify-between px-4 py-2 bg-secondary/30">
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    {formatoFecha(fecha)}
                  </span>
                  <span className="text-xs font-semibold tabular-nums">
                    {formatoMoneda(totalDia)}
                  </span>
                </div>
                <ul className="divide-y divide-border/50">
                  {items.map((g) => {
                    const badge = TIPO_BADGE[g.tipo];
                    return (
                      <li
                        key={g.id}
                        className="px-4 py-3 flex items-start justify-between gap-3"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span
                              className={cn(
                                "text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded font-medium",
                                badge.cls,
                              )}
                            >
                              {badge.label}
                            </span>
                            {g.proveedor && (
                              <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
                                <Receipt className="w-3 h-3" /> {g.proveedor}
                              </span>
                            )}
                            <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
                              <User className="w-3 h-3" /> {PAGADO_LABEL[g.pagado_por]}
                            </span>
                            {g.foto_ticket_url && (
                              <a
                                href={g.foto_ticket_url}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 text-[10px] text-gold hover:underline"
                              >
                                <ImageIcon className="w-3 h-3" /> ticket
                              </a>
                            )}
                          </div>
                          <p className="text-sm mt-1 truncate">{g.descripcion}</p>
                        </div>
                        <span className="text-sm font-semibold tabular-nums whitespace-nowrap text-red-600 dark:text-red-400">
                          -{formatoMoneda(Number(g.monto))}
                        </span>
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
