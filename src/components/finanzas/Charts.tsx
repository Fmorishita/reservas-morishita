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

type Granularidad = 'dia' | 'semana' | 'mes';

function elegirGranularidad(inicio: string, fin: string): Granularidad {
  const dias = Math.round(
    (new Date(fin).getTime() - new Date(inicio).getTime()) / 86_400_000
  );
  if (dias <= 14) return 'dia';
  if (dias <= 92) return 'semana';
  return 'mes';
}

type Bucket = { key: string; label: string; anticipos: number; sitio: number; manual: number };

function construirBuckets(
  movimientos: MovimientoIngreso[],
  inicio: string,
  fin: string,
  gran: Granularidad,
): Bucket[] {
  const map = new Map<string, Bucket>();

  if (gran === 'dia') {
    let cur = inicio;
    while (cur <= fin) {
      map.set(cur, { key: cur, label: formatoFechaCorta(cur), anticipos: 0, sitio: 0, manual: 0 });
      cur = sumarDias(cur, 1);
    }
  } else if (gran === 'semana') {
    let cur = inicio;
    while (cur <= fin) {
      // agrupa lunes→domingo
      const k = cur;
      if (!map.has(k)) map.set(k, { key: k, label: formatoFechaCorta(k), anticipos: 0, sitio: 0, manual: 0 });
      cur = sumarDias(cur, 7);
    }
  } else {
    // mes: iterar por meses
    const dInicio = new Date(inicio + 'T12:00:00');
    const dFin = new Date(fin + 'T12:00:00');
    let anio = dInicio.getFullYear();
    let mes = dInicio.getMonth();
    while (anio < dFin.getFullYear() || (anio === dFin.getFullYear() && mes <= dFin.getMonth())) {
      const k = `${anio}-${String(mes + 1).padStart(2, '0')}-01`;
      const label = new Intl.DateTimeFormat('es-MX', { month: 'short', year: '2-digit' }).format(
        new Date(anio, mes, 1)
      );
      map.set(k, { key: k, label, anticipos: 0, sitio: 0, manual: 0 });
      mes++;
      if (mes > 11) { mes = 0; anio++; }
    }
  }

  // asignar movimientos a buckets
  movimientos.forEach((m) => {
    const monto = Number(m.monto);
    let bkey: string | undefined;

    if (gran === 'dia') {
      bkey = m.fecha;
    } else if (gran === 'semana') {
      // encontrar el lunes de esa semana
      const d = new Date(m.fecha + 'T12:00:00');
      const dia = d.getDay();
      const diff = dia === 0 ? -6 : 1 - dia;
      d.setDate(d.getDate() + diff);
      const lunes = d.toISOString().slice(0, 10);
      // usar el bucket más cercano al inicio si el lunes no está en el map
      bkey = [...map.keys()].reduce((prev, cur) => {
        return Math.abs(new Date(cur).getTime() - new Date(lunes).getTime()) <
               Math.abs(new Date(prev).getTime() - new Date(lunes).getTime()) ? cur : prev;
      }, [...map.keys()][0]);
    } else {
      bkey = m.fecha.slice(0, 7) + '-01';
    }

    const bucket = bkey ? map.get(bkey) : undefined;
    if (!bucket) return;
    if (m.tipo === 'deposito_reserva') bucket.anticipos += monto;
    else if (m.tipo === 'pago_sitio_reserva') bucket.sitio += monto;
    else bucket.manual += monto;
  });

  return [...map.values()];
}

const PALETA_INGRESOS = ["#10b981", "#3b82f6", "#a855f7"];
const PALETA_METODOS = ["#f59e0b", "#06b6d4", "#ec4899", "#84cc16"];
const PALETA_GASTOS = ["#ef4444", "#f97316", "#eab308"];

interface RangoFechas {
  inicio: string;
  fin: string;
}

/* ============================================================
 * INGRESOS POR PERÍODO — line chart adaptable (día/semana/mes)
 * ============================================================ */
export function IngresosPorDia({
  movimientos,
  rango,
}: {
  movimientos: MovimientoIngreso[];
  rango: RangoFechas;
}) {
  const gran = elegirGranularidad(rango.inicio, rango.fin);
  const data = construirBuckets(movimientos, rango.inicio, rango.fin, gran);

  const granLabel = gran === 'dia' ? 'Ingresos por día'
    : gran === 'semana' ? 'Ingresos por semana'
    : 'Ingresos por mes';

  const dotSize = gran === 'mes' ? 5 : 3;

  return (
    <div className="bg-card rounded-2xl p-4 border border-border">
      <h3 className="text-sm font-semibold mb-3">{granLabel}</h3>
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 11 }}
            stroke="hsl(var(--muted-foreground))"
            interval="preserveStartEnd"
          />
          <YAxis
            tick={{ fontSize: 11 }}
            stroke="hsl(var(--muted-foreground))"
            tickFormatter={(v: number) => v >= 1000 ? `$${(v / 1000).toFixed(0)}k` : `$${v}`}
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
          <Line type="monotone" dataKey="anticipos" name="Anticipos" stroke={PALETA_INGRESOS[0]} strokeWidth={2} dot={{ r: dotSize }} />
          <Line type="monotone" dataKey="sitio" name="Pago en sitio" stroke={PALETA_INGRESOS[1]} strokeWidth={2} dot={{ r: dotSize }} />
          <Line type="monotone" dataKey="manual" name="Walk-ins" stroke={PALETA_INGRESOS[2]} strokeWidth={2} dot={{ r: dotSize }} />
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
