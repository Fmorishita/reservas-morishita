import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import {
  Plus,
  Minus,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Download,
  CalendarDays,
  TrendingUp,
  TrendingDown,
  Wallet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { obtenerDatosPorRango } from "@/lib/finanzas/queries";
import { calcularCorteSemanal } from "@/lib/finanzas/calculo";
import {
  formatoMoneda,
  lunesDeLaSemana,
  labelPeriodo,
  rangoDePeriodo,
  navegarPeriodo,
  cursoreActual,
  type Periodo,
} from "@/lib/finanzas/formato";
import {
  exportarIngresosCSV,
  exportarGastosCSV,
  exportarReporteCompleto,
} from "@/lib/finanzas/exportar";
import {
  IngresosPorDia,
  BreakdownIngresos,
  MetodosDePago,
  GastosPorCategoria,
} from "@/components/finanzas/Charts";
import { HistorialIngresos } from "@/components/finanzas/HistorialIngresos";
import type { Semana } from "@/lib/finanzas/types";

const PERIODOS: { key: Periodo; label: string }[] = [
  { key: "semana", label: "Semana" },
  { key: "mes", label: "Mes" },
  { key: "trimestre", label: "Trimestre" },
  { key: "anio", label: "Año" },
];

export default function FinanzasDashboard() {
  const [periodo, setPeriodo] = useState<Periodo>("semana");
  const [cursor, setCursor] = useState<string>(() => lunesDeLaSemana());

  const { inicio, fin } = rangoDePeriodo(cursor, periodo);
  const esPeriodoActual = cursor === cursoreActual(periodo);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["finanzas-rango", inicio, fin],
    queryFn: () => obtenerDatosPorRango(inicio, fin),
    staleTime: 15_000,
  });

  const semanaParaCalculo: Semana = data?.semana ?? {
    id: "synthetic",
    fecha_inicio: inicio,
    fecha_fin: fin,
    estado: "abierta",
    arrastre_anterior: 0,
    notas: null,
    cerrada_en: null,
  };

  const corte = data
    ? calcularCorteSemanal({
        semana: semanaParaCalculo,
        ingresos_depositos: data.ingresos_depositos,
        ingresos_sitio: data.ingresos_sitio,
        gastos: data.gastos,
      })
    : null;

  const irAnterior = () => setCursor((c) => navegarPeriodo(c, periodo, -1));
  const irSiguiente = () => setCursor((c) => navegarPeriodo(c, periodo, 1));
  const irActual = () => setCursor(cursoreActual(periodo));

  const handleCambioPeriodo = (p: Periodo) => {
    setPeriodo(p);
    setCursor(cursoreActual(p));
  };

  if (error) {
    return (
      <div className="text-center py-12 space-y-3">
        <p className="text-destructive text-sm">Error al cargar datos de finanzas.</p>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          <RefreshCw className="w-4 h-4 mr-2" /> Reintentar
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-5 max-w-3xl mx-auto">

      {/* Selector de período */}
      <div className="flex rounded-xl border border-border overflow-hidden">
        {PERIODOS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => handleCambioPeriodo(key)}
            className={cn(
              "flex-1 text-xs font-medium py-2.5 transition-colors",
              periodo === key
                ? "bg-gold text-black"
                : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Navegación de período */}
      <div className="flex items-center justify-between gap-2">
        <Button variant="ghost" size="icon" onClick={irAnterior} className="rounded-full shrink-0" aria-label="Período anterior">
          <ChevronLeft className="w-4 h-4" />
        </Button>
        <div className="text-center min-w-0 flex-1">
          {isLoading ? (
            <Skeleton className="h-6 w-44 mx-auto" />
          ) : (
            <h2 className="text-lg md:text-xl font-semibold capitalize truncate">
              {labelPeriodo(cursor, periodo)}
            </h2>
          )}
          {!esPeriodoActual && (
            <button
              onClick={irActual}
              className="text-[11px] text-gold hover:underline mt-0.5 inline-flex items-center gap-1"
            >
              <CalendarDays className="w-3 h-3" /> Ir al período actual
            </button>
          )}
        </div>
        <Button variant="ghost" size="icon" onClick={irSiguiente} className="rounded-full shrink-0" aria-label="Período siguiente">
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>

      {/* Acciones rápidas + export */}
      <div className="grid grid-cols-3 gap-2">
        <Button asChild variant="outline" className="h-12 text-xs flex-col gap-0.5">
          <Link to="/finanzas/ingresos/nuevo">
            <Plus className="w-4 h-4 text-emerald-600" />
            Ingreso
          </Link>
        </Button>
        <Button asChild variant="outline" className="h-12 text-xs flex-col gap-0.5">
          <Link to="/finanzas/gastos/nuevo">
            <Minus className="w-4 h-4 text-destructive" />
            Gasto
          </Link>
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="h-12 text-xs flex-col gap-0.5" disabled={!data}>
              <Download className="w-4 h-4 text-gold" />
              Exportar
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            <DropdownMenuItem
              onClick={() =>
                data &&
                exportarReporteCompleto({
                  movimientos: data.movimientos,
                  gastos: data.gastos,
                  rango: { inicio, fin },
                  resumen: {
                    ingresos_totales: corte?.ingresos_totales ?? 0,
                    gastos_totales: corte?.gastos_totales ?? 0,
                    utilidad_bruta: corte?.utilidad_bruta ?? 0,
                    reembolso_fran: corte?.reembolso_fran ?? 0,
                    reembolso_veronica: corte?.reembolso_veronica ?? 0,
                  },
                })
              }
            >
              Reporte completo (CSV)
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => data && exportarIngresosCSV(data.movimientos, { inicio, fin })}
            >
              Solo ingresos (CSV)
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => data && exportarGastosCSV(data.gastos, { inicio, fin })}
            >
              Solo gastos (CSV)
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Big metrics */}
      {isLoading ? (
        <div className="grid grid-cols-2 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-2xl" />
          ))}
        </div>
      ) : corte ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <MetricCard
            icon={<TrendingUp className="w-4 h-4" />}
            label="Ingresos"
            value={formatoMoneda(corte.ingresos_totales)}
            tone="emerald"
            sub={`${data?.movimientos.length ?? 0} movs.`}
          />
          <MetricCard
            icon={<TrendingDown className="w-4 h-4" />}
            label="Gastos"
            value={formatoMoneda(corte.gastos_totales)}
            tone="red"
            sub={`${data?.gastos.length ?? 0} gastos`}
          />
          <MetricCard
            icon={<Wallet className="w-4 h-4" />}
            label="Utilidad"
            value={formatoMoneda(corte.utilidad_bruta)}
            tone={corte.utilidad_bruta >= 0 ? "emerald" : "red"}
          />
          <MetricCard
            icon={<Wallet className="w-4 h-4" />}
            label="A repartir"
            value={formatoMoneda(corte.utilidad_distribuible)}
            tone="neutral"
          />
        </div>
      ) : null}

      {/* Charts */}
      {!isLoading && data && data.movimientos.length + data.gastos.length > 0 && (
        <>
          <IngresosPorDia movimientos={data.movimientos} rango={{ inicio, fin }} />

          <div className="grid md:grid-cols-2 gap-3">
            <BreakdownIngresos movimientos={data.movimientos} />
            <MetodosDePago movimientos={data.movimientos} />
          </div>

          <GastosPorCategoria gastos={data.gastos} />
        </>
      )}

      {/* Historial de ventas */}
      {!isLoading && data && (
        <HistorialIngresos movimientos={data.movimientos} />
      )}

      {/* Reembolsos y distribución */}
      {corte && (corte.reembolsos_totales > 0 || corte.utilidad_distribuible > 0) && (
        <div className="grid md:grid-cols-2 gap-3">
          <Section title="Reembolsos pendientes">
            <Row label="Fran" value={corte.reembolso_fran} />
            <Row label="Verónica" value={corte.reembolso_veronica} />
            <Row label="Total" value={corte.reembolsos_totales} bold />
          </Section>
          <Section title="Distribución estimada">
            <Row label="Fran recibe" value={corte.fran_recibe} />
            <Row label="Verónica recibe" value={corte.veronica_recibe} />
          </Section>
        </div>
      )}

      {/* Alertas */}
      {corte?.alertas && corte.alertas.length > 0 && (
        <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-2xl text-sm space-y-1">
          {corte.alertas.map((a, i) => (
            <p key={i} className="text-amber-700 dark:text-amber-400">
              ⚠ {a}
            </p>
          ))}
        </div>
      )}

      {!isLoading && data && data.movimientos.length === 0 && data.gastos.length === 0 && (
        <p className="text-center text-sm text-muted-foreground py-6">
          Sin movimientos en este período. Confirma una reserva o registra un gasto.
        </p>
      )}
    </div>
  );
}

/* --- Sub-componentes --- */

function MetricCard({
  icon,
  label,
  value,
  sub,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
  tone: "emerald" | "red" | "neutral";
}) {
  const colors = {
    emerald: "text-emerald-700 dark:text-emerald-400",
    red: "text-red-600 dark:text-red-400",
    neutral: "text-foreground",
  } as const;
  return (
    <div className="bg-card rounded-2xl p-4 border border-border shadow-sm">
      <div className="flex items-center gap-1.5 text-muted-foreground">
        {icon}
        <p className="text-[10px] uppercase tracking-wide">{label}</p>
      </div>
      <p className={`text-lg md:text-xl font-semibold mt-1 tabular-nums ${colors[tone]}`}>{value}</p>
      {sub && <p className="text-[10px] text-muted-foreground mt-0.5">{sub}</p>}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-card rounded-2xl p-4 border border-border">
      <h3 className="text-sm font-semibold mb-3">{title}</h3>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function Row({ label, value, bold = false }: { label: string; value: number; bold?: boolean }) {
  return (
    <div
      className={`flex justify-between text-sm ${
        bold ? "font-semibold border-t border-border pt-2 mt-2" : ""
      }`}
    >
      <span className="text-muted-foreground">{label}</span>
      <span className="tabular-nums">{formatoMoneda(value)}</span>
    </div>
  );
}
