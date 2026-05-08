/**
 * Tipos compartidos del módulo de finanzas.
 * Espejo del esquema SQL en supabase/migrations/20260505_finanzas_morishita_init.sql
 */

export type EstadoSemana = 'abierta' | 'cerrada';
export type MetodoPago = 'efectivo' | 'transferencia' | 'cohete' | 'terminal';
export type TipoGasto = 'insumos' | 'publicidad' | 'operacion';
export type Pagador = 'fran' | 'veronica' | 'empresa';
export type OrigenDinero = 'personal' | 'caja_negocio' | 'fondo_acumulado';
export type EstadoReembolso = 'pendiente' | 'pagado_parcial' | 'pagado';
export type TipoDispersion = 'reembolso' | 'utilidad' | 'efectivo_caja';

export interface Socio {
  id: string;
  user_id: string | null;
  alias: Pagador;
  nombre: string;
  rol: 'socio' | 'admin' | 'staff';
  activo: boolean;
}

export interface Semana {
  id: string;
  fecha_inicio: string; // ISO date YYYY-MM-DD
  fecha_fin: string;
  estado: EstadoSemana;
  arrastre_anterior: number;
  notas: string | null;
  cerrada_en: string | null;
}

export interface IngresoSitio {
  id: string;
  semana_id: string;
  fecha: string;
  monto: number;
  metodo: MetodoPago;
  reserva_id: string | null;
  descripcion: string | null;
  capturado_por: string | null;
}

export interface Gasto {
  id: string;
  semana_id: string;
  fecha: string;
  monto: number;
  tipo: TipoGasto;
  pagado_por: Pagador;
  origen_dinero: OrigenDinero;
  descripcion: string;
  proveedor: string | null;
  foto_ticket_url: string | null;
  capturado_por: string | null;
}

export interface Reembolso {
  id: string;
  semana_id: string;
  socio: 'fran' | 'veronica';
  monto_total: number;
  monto_pagado: number;
  estado: EstadoReembolso;
  cuenta_destino: string | null;
  fecha_pago: string | null;
}

export interface Corte {
  id: string;
  semana_id: string;
  ingresos_depositos: number;
  ingresos_sitio_total: number;
  ingresos_totales: number;
  gastos_totales: number;
  reembolsos_totales: number;
  utilidad_bruta: number;
  utilidad_distribuible: number;
  fran_recibe: number;
  veronica_recibe: number;
  arrastre_siguiente: number;
  pdf_url: string | null;
}

export interface Dispersion {
  id: string;
  corte_id: string;
  tipo: TipoDispersion;
  beneficiario: Pagador;
  monto: number;
  cuenta_destino: string | null;
  metodo: MetodoPago | null;
  fecha_ejecucion: string | null;
  conciliado: boolean;
}

/**
 * Datos crudos para alimentar el motor de cálculo.
 * El motor es PURO: no toca Supabase. Recibe esto, devuelve un ResultadoCorte.
 */
export interface DatosSemanaParaCalculo {
  semana: Semana;
  ingresos_depositos: number; // viene del sistema de reservas
  ingresos_sitio: IngresoSitio[];
  gastos: Gasto[];
}

/**
 * Resultado del motor de cálculo. Este objeto se persiste como `cortes` +
 * `reembolsos` + `dispersiones` al cerrar la semana.
 */
export interface ResultadoCorte {
  semana_id: string;

  // Ingresos
  ingresos_depositos: number;
  ingresos_sitio_total: number;
  ingresos_totales: number;

  // Gastos
  gastos_totales: number;
  gastos_por_tipo: Record<TipoGasto, number>;

  // Reembolsos calculados por socio
  reembolso_fran: number;
  reembolso_veronica: number;
  reembolsos_totales: number;

  // Utilidad
  utilidad_bruta: number; // ingresos - gastos
  utilidad_distribuible: number; // utilidad - reembolsos (si negativo se arrastra)
  arrastre_siguiente: number;

  // Distribución 50/50
  fran_recibe: number; // reembolso + 50% utilidad
  veronica_recibe: number; // reembolso + 50% utilidad

  // Dispersiones detalladas
  dispersiones: Array<{
    tipo: TipoDispersion;
    beneficiario: Pagador;
    monto: number;
    razon: string;
  }>;

  // Validación
  cuadra: boolean; // ingresos_totales - gastos_totales - utilidad_bruta == 0
  alertas: string[];
}
