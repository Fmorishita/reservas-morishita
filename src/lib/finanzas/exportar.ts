/**
 * Helpers para exportar datos financieros a CSV.
 * El usuario puede descargar reportes desde el dashboard.
 */

import type { Gasto, MovimientoIngreso } from "./types";

function escaparCSV(valor: unknown): string {
  if (valor === null || valor === undefined) return "";
  const s = String(valor);
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function descargar(nombre: string, contenido: string) {
  const blob = new Blob(["﻿" + contenido], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nombre;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

const TIPO_LABEL: Record<MovimientoIngreso["tipo"], string> = {
  deposito_reserva: "Anticipo (reserva)",
  pago_sitio_reserva: "Pago en sitio (reserva)",
  ingreso_sitio: "Ingreso adicional",
};

export function exportarIngresosCSV(
  movimientos: MovimientoIngreso[],
  rango: { inicio: string; fin: string },
) {
  const headers = [
    "Fecha",
    "Tipo",
    "Descripción",
    "Cliente",
    "Personas",
    "Menú",
    "Método",
    "Monto",
  ];
  const filas = movimientos.map((m) => [
    m.fecha,
    TIPO_LABEL[m.tipo],
    m.descripcion,
    m.nombre_cliente ?? "",
    m.numero_personas ?? "",
    m.tipo_menu ?? "",
    m.metodo,
    m.monto.toFixed(2),
  ]);
  const total = movimientos.reduce((s, m) => s + Number(m.monto), 0);
  filas.push(["", "", "", "", "", "", "TOTAL", total.toFixed(2)]);

  const csv = [headers, ...filas]
    .map((row) => row.map(escaparCSV).join(","))
    .join("\n");

  descargar(`ingresos-${rango.inicio}_${rango.fin}.csv`, csv);
}

export function exportarGastosCSV(
  gastos: Gasto[],
  rango: { inicio: string; fin: string },
) {
  const headers = [
    "Fecha",
    "Tipo",
    "Descripción",
    "Proveedor",
    "Monto",
    "Pagado por",
    "Origen",
  ];
  const filas = gastos.map((g) => [
    g.fecha,
    g.tipo,
    g.descripcion,
    g.proveedor ?? "",
    Number(g.monto).toFixed(2),
    g.pagado_por,
    g.origen_dinero,
  ]);
  const total = gastos.reduce((s, g) => s + Number(g.monto), 0);
  filas.push(["", "", "", "", total.toFixed(2), "TOTAL", ""]);

  const csv = [headers, ...filas]
    .map((row) => row.map(escaparCSV).join(","))
    .join("\n");

  descargar(`gastos-${rango.inicio}_${rango.fin}.csv`, csv);
}

export function exportarReporteCompleto(args: {
  movimientos: MovimientoIngreso[];
  gastos: Gasto[];
  rango: { inicio: string; fin: string };
  resumen: {
    ingresos_totales: number;
    gastos_totales: number;
    utilidad_bruta: number;
    reembolso_fran: number;
    reembolso_veronica: number;
  };
}) {
  const { movimientos, gastos, rango, resumen } = args;

  const lineas: string[] = [];
  lineas.push(`Reporte financiero,${rango.inicio} al ${rango.fin}`);
  lineas.push("");
  lineas.push("RESUMEN");
  lineas.push(`Ingresos totales,${resumen.ingresos_totales.toFixed(2)}`);
  lineas.push(`Gastos totales,${resumen.gastos_totales.toFixed(2)}`);
  lineas.push(`Utilidad bruta,${resumen.utilidad_bruta.toFixed(2)}`);
  lineas.push(`Reembolso Fran,${resumen.reembolso_fran.toFixed(2)}`);
  lineas.push(`Reembolso Verónica,${resumen.reembolso_veronica.toFixed(2)}`);
  lineas.push("");

  lineas.push("INGRESOS");
  lineas.push(["Fecha", "Tipo", "Descripción", "Cliente", "Personas", "Método", "Monto"].join(","));
  movimientos.forEach((m) => {
    lineas.push(
      [
        m.fecha,
        TIPO_LABEL[m.tipo],
        m.descripcion,
        m.nombre_cliente ?? "",
        m.numero_personas ?? "",
        m.metodo,
        Number(m.monto).toFixed(2),
      ]
        .map(escaparCSV)
        .join(","),
    );
  });

  lineas.push("");
  lineas.push("GASTOS");
  lineas.push(["Fecha", "Tipo", "Descripción", "Proveedor", "Pagado por", "Origen", "Monto"].join(","));
  gastos.forEach((g) => {
    lineas.push(
      [
        g.fecha,
        g.tipo,
        g.descripcion,
        g.proveedor ?? "",
        g.pagado_por,
        g.origen_dinero,
        Number(g.monto).toFixed(2),
      ]
        .map(escaparCSV)
        .join(","),
    );
  });

  descargar(`reporte-${rango.inicio}_${rango.fin}.csv`, lineas.join("\n"));
}
