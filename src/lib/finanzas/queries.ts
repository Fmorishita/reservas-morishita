/**
 * Capa de acceso a Supabase para el módulo de finanzas.
 * Adaptada para Vite + React (cliente browser, no server-side).
 *
 * Usa el singleton `supabase` del proyecto existente.
 * Las tablas de finanzas (semanas, gastos, etc.) aún no están en los tipos
 * generados — se agregan después de regenerar con `supabase gen types`.
 */

import { supabase } from "@/integrations/supabase/client";
import type {
  DatosSemanaParaCalculo,
  Gasto,
  IngresoSitio,
  MovimientoIngreso,
  Semana,
  Socio,
  TipoGasto,
  Pagador,
  OrigenDinero,
  MetodoPago,
} from "./types";
import { lunesDeLaSemana, domingoDeLaSemana } from "./formato";

// Helper: cliente sin tipo para tablas de finanzas (hasta regenerar types)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

/* ----------------------------- SEMANAS ------------------------------ */

export async function obtenerOCrearSemanaActual(): Promise<Semana> {
  return obtenerOCrearSemanaParaFecha(new Date());
}

export async function obtenerOCrearSemanaParaFecha(fecha: Date): Promise<Semana> {
  const inicio = lunesDeLaSemana(fecha);
  const fin = domingoDeLaSemana(fecha);

  const { data: existente } = await db
    .from("semanas")
    .select("*")
    .eq("fecha_inicio", inicio)
    .eq("fecha_fin", fin)
    .maybeSingle();

  if (existente) return existente as Semana;

  const { data: arrastre } = await db
    .from("cortes")
    .select("arrastre_siguiente")
    .order("cerrado_en", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data: nueva, error } = await db
    .from("semanas")
    .insert({
      fecha_inicio: inicio,
      fecha_fin: fin,
      arrastre_anterior: arrastre?.arrastre_siguiente ?? 0,
    })
    .select()
    .single();

  if (error) throw error;
  return nueva as Semana;
}

export async function obtenerSemana(semanaId: string): Promise<Semana | null> {
  const { data } = await db
    .from("semanas")
    .select("*")
    .eq("id", semanaId)
    .maybeSingle();
  return data as Semana | null;
}

export async function listarSemanas(limit = 12): Promise<Semana[]> {
  const { data } = await db
    .from("semanas")
    .select("*")
    .order("fecha_inicio", { ascending: false })
    .limit(limit);
  return (data ?? []) as Semana[];
}

/* ------------------------------ GASTOS ------------------------------ */

export interface NuevoGasto {
  semana_id: string;
  fecha: string;
  monto: number;
  tipo: TipoGasto;
  pagado_por: Pagador;
  origen_dinero: OrigenDinero;
  descripcion: string;
  proveedor?: string | null;
  foto_ticket_url?: string | null;
}

export async function crearGasto(input: NuevoGasto): Promise<Gasto> {
  const { data: { user } } = await supabase.auth.getUser();

  let capturado_por: string | null = null;
  if (user) {
    const { data: socio } = await db
      .from("socios")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();
    capturado_por = socio?.id ?? null;
  }

  const { data, error } = await db
    .from("gastos")
    .insert({ ...input, capturado_por })
    .select()
    .single();

  if (error) throw error;
  return data as Gasto;
}

export async function actualizarGasto(
  id: string,
  updates: Partial<Omit<Gasto, "id" | "semana_id" | "creado_en">>
): Promise<Gasto> {
  // Filtrar solo los campos que están permitidos actualizar
  const camposActualizables: (keyof Omit<Gasto, "id" | "semana_id" | "creado_en">)[] = [
    "fecha",
    "monto",
    "tipo",
    "pagado_por",
    "origen_dinero",
    "descripcion",
    "proveedor",
    "foto_ticket_url",
  ];

  const datosLimpios = Object.fromEntries(
    Object.entries(updates).filter(([key]) => camposActualizables.includes(key as any))
  );

  const { data, error } = await db
    .from("gastos")
    .update(datosLimpios)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error("[actualizarGasto] error:", error);
    throw error;
  }
  return data as Gasto;
}

export async function listarGastosDeSemana(semanaId: string): Promise<Gasto[]> {
  const { data } = await db
    .from("gastos")
    .select("*")
    .eq("semana_id", semanaId)
    .order("fecha", { ascending: true });
  return (data ?? []) as Gasto[];
}

export async function listarGastosPorRango(inicio: string, fin: string): Promise<Gasto[]> {
  const { data } = await db
    .from("gastos")
    .select("*")
    .gte("fecha", inicio)
    .lte("fecha", fin)
    .order("fecha", { ascending: true });
  return (data ?? []) as Gasto[];
}

/* ------------------------- INGRESOS EN SITIO ------------------------ */

export interface NuevoIngresoSitio {
  semana_id: string;
  fecha: string;
  monto: number;
  metodo: MetodoPago;
  reserva_id?: string | null;
  descripcion?: string | null;
}

export async function crearIngresoSitio(input: NuevoIngresoSitio): Promise<IngresoSitio> {
  const { data: { user } } = await supabase.auth.getUser();

  let capturado_por: string | null = null;
  if (user) {
    const { data: socio } = await db
      .from("socios")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();
    capturado_por = socio?.id ?? null;
  }

  const { data, error } = await db
    .from("ingresos_sitio")
    .insert({ ...input, capturado_por })
    .select()
    .single();

  if (error) throw error;
  return data as IngresoSitio;
}

export async function listarIngresosSitioDeSemana(semanaId: string): Promise<IngresoSitio[]> {
  const { data } = await db
    .from("ingresos_sitio")
    .select("*")
    .eq("semana_id", semanaId)
    .order("fecha", { ascending: true });
  return (data ?? []) as IngresoSitio[];
}

export async function listarIngresosSitioPorRango(
  inicio: string,
  fin: string,
): Promise<IngresoSitio[]> {
  const { data } = await db
    .from("ingresos_sitio")
    .select("*")
    .gte("fecha", inicio)
    .lte("fecha", fin)
    .order("fecha", { ascending: true });
  return (data ?? []) as IngresoSitio[];
}

/* -------------------- DEPÓSITOS DE RESERVAS ------------------------- */

export async function obtenerDepositosDeSemana(semanaId: string): Promise<number> {
  const { data, error } = await db
    .from("v_depositos_por_semana")
    .select("total_depositos")
    .eq("semana_id", semanaId)
    .maybeSingle();

  if (error) {
    console.warn("[finanzas] v_depositos_por_semana no disponible:", error.message);
    return 0;
  }
  return Number(data?.total_depositos ?? 0);
}

/* -------------------- MOVIMIENTOS DE INGRESO (LINE ITEMS) ----------- */

/**
 * Lista todos los movimientos de ingreso (anticipos, pagos en sitio,
 * walk-ins) entre dos fechas. Útil para el historial y los exports.
 */
export async function listarMovimientosIngreso(
  fechaInicio: string,
  fechaFin: string,
): Promise<MovimientoIngreso[]> {
  const { data, error } = await db
    .from("v_ingresos_unificados")
    .select("*")
    .gte("fecha", fechaInicio)
    .lte("fecha", fechaFin)
    .order("fecha_ts", { ascending: false });

  if (error) {
    console.warn("[finanzas] v_ingresos_unificados no disponible:", error.message);
    return [];
  }
  return (data ?? []) as MovimientoIngreso[];
}

/* --------------------- DATOS COMPLETOS PARA CÁLCULO ----------------- */

export async function obtenerDatosParaCorte(
  semanaId: string,
): Promise<DatosSemanaParaCalculo> {
  const semana = await obtenerSemana(semanaId);
  if (!semana) throw new Error(`Semana ${semanaId} no encontrada`);

  const [ingresos_sitio, gastos, ingresos_depositos] = await Promise.all([
    listarIngresosSitioDeSemana(semanaId),
    listarGastosDeSemana(semanaId),
    obtenerDepositosDeSemana(semanaId),
  ]);

  return { semana, ingresos_depositos, ingresos_sitio, gastos };
}

/* --------------------- DATOS POR RANGO (DASHBOARD) ------------------ */

export interface DatosRangoFinanzas {
  fecha_inicio: string;
  fecha_fin: string;
  movimientos: MovimientoIngreso[];
  ingresos_sitio: IngresoSitio[];
  ingresos_depositos: number;
  gastos: Gasto[];
  semana: Semana | null;
}

/**
 * Obtiene todos los datos financieros para un rango arbitrario de fechas.
 * No requiere que exista una fila en `semanas` (útil para ver semanas pasadas
 * sin polucionar la tabla).
 */
export async function obtenerDatosPorRango(
  inicio: string,
  fin: string,
): Promise<DatosRangoFinanzas> {
  const [movimientos, gastos, ingresos_sitio, semanaResp] = await Promise.all([
    listarMovimientosIngreso(inicio, fin),
    listarGastosPorRango(inicio, fin),
    listarIngresosSitioPorRango(inicio, fin),
    db
      .from("semanas")
      .select("*")
      .eq("fecha_inicio", inicio)
      .eq("fecha_fin", fin)
      .maybeSingle(),
  ]);

  const ingresos_depositos = movimientos
    .filter((m) => m.tipo === "deposito_reserva" || m.tipo === "pago_sitio_reserva")
    .reduce((s, m) => s + Number(m.monto), 0);

  return {
    fecha_inicio: inicio,
    fecha_fin: fin,
    movimientos,
    ingresos_sitio,
    ingresos_depositos,
    gastos,
    semana: (semanaResp.data ?? null) as Semana | null,
  };
}

/* ------------------------------ SOCIOS ------------------------------ */

export async function obtenerSocioDelUsuarioActual(): Promise<Socio | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await db
    .from("socios")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();
  return data as Socio | null;
}

/* --------------------------- STORAGE TICKETS ------------------------ */

export async function subirTicket(
  archivo: File,
  semanaId: string,
): Promise<string> {
  const ext = archivo.name.split(".").pop() ?? "jpg";
  const filename = `${semanaId}/${Date.now()}-${crypto.randomUUID()}.${ext}`;

  const { data, error } = await supabase.storage
    .from("tickets")
    .upload(filename, archivo, { cacheControl: "3600", upsert: false });

  if (error) throw error;

  const { data: signed } = await supabase.storage
    .from("tickets")
    .createSignedUrl(data.path, 60 * 60 * 24 * 365);

  return signed?.signedUrl ?? data.path;
}
