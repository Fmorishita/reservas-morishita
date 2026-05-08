import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
  CartesianGrid,
} from "recharts";
import type { Gasto, MovimientoIngreso } from "@/lib/finanzas/types";
import { formatoMoneda, formatoFechaCorta, sumarDias } from "@/lib/finanzas/formato";

const PALETA_INGRESOS = ["#10b981", "#3b82f6", "#a855f7"];
const PALETA_METODOS = ["#f59e0b", "#06b6d4", "#ec4899", "#84cc16"];
const PALETA_GASTOS = ["#ef4444", "#f97316", "#eab308"];

interface RangoFechas {
  inicio: string;
  fin: string;
}

/* ============================================================
 * INGRESOS POR DÍA — line chart con anticipos vs sitio
 * ============================================================ */
export function IngresosPorDia({
  movimientos,
  rango,
}: {
  movimientos: MovimientoIngreso[];
  rango: RangoFechas;
}) {
  const dias: { fecha: string; label: string; anticipos: number; sitio: number; manual: number; total: number }[] = [];
  let cursor = rango.inicio;
  while (cursor <= rango.fin) {
    dias.push({
      fecha: cursor,
      label: formatoFechaCorta(cursor),
      anticipos: 0,
      sitio: 0,
      manual: 0,
      total: 0,
    });
    cursor = sumarDias(cursor, 1);
  }

  movimientos.forEach((m) => {
    const dia = dias.find((d) => d.fecha === m.fecha);
    if (!dia) return;
    const monto = Number(m.monto);
    if (m.tipo === "deposito_reserva") dia.anticipos += monto;
    else if (m.tipo === "pago_sitio_reserva") dia.sitio += monto;
    else dia.manual += monto;
    dia.total += monto;
  });

  return (
    <div className="bg-card rounded-2xl p-4 border border-border">
      <h3 className="text-sm font-semibold mb-3">Ingresos por día</h3>
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={dias} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
          <XAxis dataKey="label" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
          <YAxis
            tick={{ fontSize: 11 }}
            stroke="hsl(var(--muted-foreground))"
            tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
          />
          <Tooltip
            contentStyle={{
              background: "hsl(var(--card))",
              border: "1px solid hsl(var(--border))",
              borderRadius: 8,
              fontSize: 12,
            }}
            formatter={(v: number) => formatoMoneda(v)}
          />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          <Line type="monotone" dataKey="anticipos" name="Anticipos" stroke={PALETA_INGRESOS[0]} strokeWidth={2} dot={{ r: 3 }} />
          <Line type="monotone" dataKey="sitio" name="Pago en sitio" stroke={PALETA_INGRESOS[1]} strokeWidth={2} dot={{ r: 3 }} />
          <Line type="monotone" dataKey="manual" name="Walk-ins" stroke={PALETA_INGRESOS[2]} strokeWidth={2} dot={{ r: 3 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

/* ============================================================
 * BREAKDOWN DE INGRESOS POR TIPO (pie)
 * ============================================================ */
export function BreakdownIngresos({ movimientos }: { movimientos: MovimientoIngreso[] }) {
  const totales = { Anticipos: 0, "Pago en sitio": 0, "Walk-ins": 0 };
  movimientos.forEach((m) => {
    const monto = Number(m.monto);
    if (m.tipo === "deposito_reserva") totales.Anticipos += monto;
    else if (m.tipo === "pago_sitio_reserva") totales["Pago en sitio"] += monto;
    else totales["Walk-ins"] += monto;
  });
  const data = Object.entries(totales)
    .filter(([, v]) => v > 0)
    .map(([name, value]) => ({ name, value }));

  if (data.length === 0) {
    return (
      <div className="bg-card rounded-2xl p-4 border border-border">
        <h3 className="text-sm font-semibold mb-3">Composición de ingresos</h3>
        <p className="text-xs text-muted-foreground py-8 text-center">Sin ingresos esta semana.</p>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-2xl p-4 border border-border">
      <h3 className="text-sm font-semibold mb-3">Composición de ingresos</h3>
      <ResponsiveContainer width="100%" height={200}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            outerRadius={70}
            innerRadius={40}
            paddingAngle={2}
            dataKey="value"
            label={({ percent }) => (percent ? `${(percent * 100).toFixed(0)}%` : "")}
            labelLine={false}
          >
            {data.map((_, i) => (
              <Cell key={i} fill={PALETA_INGRESOS[i % PALETA_INGRESOS.length]} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              background: "hsl(var(--card))",
              border: "1px solid hsl(var(--border))",
              borderRadius: 8,
              fontSize: 12,
            }}
            formatter={(v: number) => formatoMoneda(v)}
          />
          <Legend wrapperStyle={{ fontSize: 11 }} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

/* ============================================================
 * MÉTODOS DE PAGO (pie)
 * ============================================================ */
export function MetodosDePago({ movimientos }: { movimientos: MovimientoIngreso[] }) {
  const acc: Record<string, number> = {};
  movimientos.forEach((m) => {
    const k = (m.metodo || "—").toLowerCase();
    acc[k] = (acc[k] ?? 0) + Number(m.monto);
  });
  const data = Object.entries(acc)
    .filter(([, v]) => v > 0)
    .map(([name, value]) => ({ name: capitalizar(name), value }));

  if (data.length === 0) return null;

  return (
    <div className="bg-card rounded-2xl p-4 border border-border">
      <h3 className="text-sm font-semibold mb-3">Métodos de pago</h3>
      <ResponsiveContainer width="100%" height={200}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            outerRadius={70}
            innerRadius={40}
            paddingAngle={2}
            dataKey="value"
            label={({ percent }) => (percent ? `${(percent * 100).toFixed(0)}%` : "")}
            labelLine={false}
          >
            {data.map((_, i) => (
              <Cell key={i} fill={PALETA_METODOS[i % PALETA_METODOS.length]} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              background: "hsl(var(--card))",
              border: "1px solid hsl(var(--border))",
              borderRadius: 8,
              fontSize: 12,
            }}
            formatter={(v: number) => formatoMoneda(v)}
          />
          <Legend wrapperStyle={{ fontSize: 11 }} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

/* ============================================================
 * GASTOS POR CATEGORÍA (bar)
 * ============================================================ */
export function GastosPorCategoria({ gastos }: { gastos: Gasto[] }) {
  const totales: Record<string, number> = { insumos: 0, publicidad: 0, operacion: 0 };
  gastos.forEach((g) => {
    totales[g.tipo] = (totales[g.tipo] ?? 0) + Number(g.monto);
  });
  const data = [
    { categoria: "Insumos", monto: totales.insumos },
    { categoria: "Publicidad", monto: totales.publicidad },
    { categoria: "Operación", monto: totales.operacion },
  ];

  return (
    <div className="bg-card rounded-2xl p-4 border border-border">
      <h3 className="text-sm font-semibold mb-3">Gastos por categoría</h3>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
          <XAxis dataKey="categoria" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
          <YAxis
            tick={{ fontSize: 11 }}
            stroke="hsl(var(--muted-foreground))"
            tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
          />
          <Tooltip
            contentStyle={{
              background: "hsl(var(--card))",
              border: "1px solid hsl(var(--border))",
              borderRadius: 8,
              fontSize: 12,
            }}
            formatter={(v: number) => formatoMoneda(v)}
          />
          <Bar dataKey="monto" radius={[8, 8, 0, 0]}>
            {data.map((_, i) => (
              <Cell key={i} fill={PALETA_GASTOS[i % PALETA_GASTOS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function capitalizar(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
