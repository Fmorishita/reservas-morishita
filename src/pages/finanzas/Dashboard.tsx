import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Plus, Minus, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  obtenerOCrearSemanaActual,
  obtenerDatosParaCorte,
} from "@/lib/finanzas/queries";
import { calcularCorteSemanal } from "@/lib/finanzas/calculo";
import { formatoMoneda, rangoSemana } from "@/lib/finanzas/formato";

export default function FinanzasDashboard() {
  const {
    data: semana,
    isLoading: semanaLoading,
    error: semanaError,
    refetch,
  } = useQuery({
    queryKey: ["finanzas-semana-actual"],
    queryFn: obtenerOCrearSemanaActual,
    staleTime: 30_000,
  });

  const {
    data: datos,
    isLoading: datosLoading,
  } = useQuery({
    queryKey: ["finanzas-datos-corte", semana?.id],
    queryFn: () => obtenerDatosParaCorte(semana!.id),
    enabled: !!semana?.id,
    staleTime: 15_000,
  });

  const corte = datos ? calcularCorteSemanal(datos) : null;
  const isLoading = semanaLoading || datosLoading;

  if (semanaError) {
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
    <div className="space-y-6 max-w-2xl mx-auto">
      {/* Header */}
      <div>
        <p className="text-xs uppercase tracking-widest text-muted-foreground">Semana actual</p>
        {isLoading ? (
          <Skeleton className="h-7 w-48 mt-1" />
        ) : semana ? (
          <h2 className="text-2xl font-semibold">
            {rangoSemana(semana.fecha_inicio, semana.fecha_fin)}
          </h2>
        ) : null}
        {semana?.arrastre_anterior !== 0 && semana && (
          <p className="text-sm text-amber-600 mt-0.5">
            Arrastre anterior: {formatoMoneda(semana.arrastre_anterior)}
          </p>
        )}
      </div>

      {/* Acciones rápidas */}
      <div className="grid grid-cols-2 gap-3">
        <Button asChild variant="outline" className="h-14 text-sm flex-col gap-1">
          <Link to="/finanzas/gastos/nuevo">
            <Minus className="w-5 h-5 text-destructive" />
            Nuevo gasto
          </Link>
        </Button>
        <Button asChild variant="outline" className="h-14 text-sm flex-col gap-1">
          <Link to="/finanzas/ingresos/nuevo">
            <Plus className="w-5 h-5 text-emerald-600" />
            Nuevo ingreso
          </Link>
        </Button>
      </div>

      {/* Big numbers */}
      {isLoading ? (
        <div className="grid grid-cols-2 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-2xl" />
          ))}
        </div>
      ) : corte ? (
        <div className="grid grid-cols-2 gap-3">
          <BigCard label="Ingresos" value={formatoMoneda(corte.ingresos_totales)} color="emerald" />
          <BigCard label="Gastos" value={formatoMoneda(corte.gastos_totales)} color="red" />
          <BigCard
            label="Utilidad bruta"
            value={formatoMoneda(corte.utilidad_bruta)}
            color={corte.utilidad_bruta >= 0 ? "emerald" : "red"}
          />
          <BigCard label="A repartir" value={formatoMoneda(corte.utilidad_distribuible)} color="neutral" />
        </div>
      ) : null}

      {/* Desglose ingresos */}
      {corte && (
        <>
          <Section title="Ingresos">
            <Row label="Depósitos de reservas" value={corte.ingresos_depositos} />
            <Row label="Pagos en sitio" value={corte.ingresos_sitio_total} />
            <Row label="Total" value={corte.ingresos_totales} bold />
          </Section>

          <Section title="Gastos por tipo">
            <Row label="Insumos" value={corte.gastos_por_tipo.insumos} />
            <Row label="Publicidad" value={corte.gastos_por_tipo.publicidad} />
            <Row label="Operación" value={corte.gastos_por_tipo.operacion} />
            <Row label="Total" value={corte.gastos_totales} bold />
          </Section>

          <Section title="Reembolsos pendientes">
            <Row label="Fran" value={corte.reembolso_fran} />
            <Row label="Verónica" value={corte.reembolso_veronica} />
            <Row label="Total" value={corte.reembolsos_totales} bold />
          </Section>

          <Section title="Distribución estimada">
            <Row label="Fran recibe" value={corte.fran_recibe} />
            <Row label="Verónica recibe" value={corte.veronica_recibe} />
          </Section>

          {corte.alertas.length > 0 && (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl text-sm space-y-1">
              {corte.alertas.map((a, i) => (
                <p key={i} className="text-amber-800">⚠ {a}</p>
              ))}
            </div>
          )}

          {!corte.cuadra && (
            <div className="p-4 bg-destructive/10 border border-destructive/30 rounded-2xl text-sm text-destructive">
              ⛔ El cuadre no coincide. Revisar manualmente antes de cerrar.
            </div>
          )}
        </>
      )}

      {/* Estado vacío */}
      {!isLoading && corte && corte.ingresos_totales === 0 && corte.gastos_totales === 0 && (
        <p className="text-center text-sm text-muted-foreground py-6">
          Sin movimientos esta semana. Usa los botones de arriba para capturar.
        </p>
      )}
    </div>
  );
}

/* --- Sub-componentes --- */

function BigCard({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color: "emerald" | "red" | "neutral";
}) {
  const colors = {
    emerald: "text-emerald-700",
    red: "text-red-600",
    neutral: "text-foreground",
  } as const;
  return (
    <div className="bg-card rounded-2xl p-4 border border-border shadow-sm">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={`text-xl font-semibold mt-1 tabular-nums ${colors[color]}`}>{value}</p>
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
