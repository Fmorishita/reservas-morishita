/**
 * Helpers de formato para mostrar dinero, fechas y porcentajes.
 */

export function formatoMoneda(n: number): string {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
}

export function formatoFecha(iso: string): string {
  const d = new Date(iso + 'T12:00:00'); // mediodía evita problemas de TZ
  return new Intl.DateTimeFormat('es-MX', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(d);
}

export function formatoFechaCorta(iso: string): string {
  const d = new Date(iso + 'T12:00:00');
  return new Intl.DateTimeFormat('es-MX', {
    day: '2-digit',
    month: 'short',
  }).format(d);
}

export function rangoSemana(inicio: string, fin: string): string {
  return `${formatoFechaCorta(inicio)} – ${formatoFechaCorta(fin)}`;
}

/** Devuelve el lunes de la semana de la fecha dada en formato YYYY-MM-DD. */
export function lunesDeLaSemana(date: Date = new Date()): string {
  const d = new Date(date);
  const dia = d.getDay(); // 0=domingo, 1=lunes...
  const diff = dia === 0 ? -6 : 1 - dia; // si es domingo, retrocede 6
  d.setDate(d.getDate() + diff);
  return d.toISOString().slice(0, 10);
}

/** Devuelve el domingo de la semana de la fecha dada en formato YYYY-MM-DD. */
export function domingoDeLaSemana(date: Date = new Date()): string {
  const lunes = new Date(lunesDeLaSemana(date) + 'T12:00:00');
  lunes.setDate(lunes.getDate() + 6);
  return lunes.toISOString().slice(0, 10);
}

/** Suma `dias` días a una fecha YYYY-MM-DD y devuelve la nueva como YYYY-MM-DD. */
export function sumarDias(iso: string, dias: number): string {
  const d = new Date(iso + 'T12:00:00');
  d.setDate(d.getDate() + dias);
  return d.toISOString().slice(0, 10);
}

/** Convierte timestamp ISO a hora corta legible (HH:mm). */
export function formatoHora(iso: string): string {
  const d = new Date(iso);
  return new Intl.DateTimeFormat('es-MX', { hour: '2-digit', minute: '2-digit' }).format(d);
}

/* ================================================================
 * Helpers de rango por período
 * ================================================================ */

export type Periodo = 'semana' | 'mes' | 'trimestre' | 'anio';

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** YYYY-MM-DD del primer día del mes de `d`. */
export function primerDiaDeMes(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
}

/** YYYY-MM-DD del último día del mes de `d`. */
export function ultimoDiaDeMes(d: Date): string {
  const fin = new Date(d.getFullYear(), d.getMonth() + 1, 0);
  return isoDate(fin);
}

/** Devuelve el mes (0-based) en que empieza el trimestre de `d`. */
function mesInicioTrimestre(d: Date): number {
  return Math.floor(d.getMonth() / 3) * 3; // 0, 3, 6, 9
}

/** YYYY-MM-DD del primer día del trimestre de `d`. */
export function primerDiaDeTrimestre(d: Date): string {
  return isoDate(new Date(d.getFullYear(), mesInicioTrimestre(d), 1));
}

/** YYYY-MM-DD del último día del trimestre de `d`. */
export function ultimoDiaDeTrimestre(d: Date): string {
  return isoDate(new Date(d.getFullYear(), mesInicioTrimestre(d) + 3, 0));
}

/** YYYY-MM-DD del primer día del año de `d`. */
export function primerDiaDeAnio(d: Date): string {
  return `${d.getFullYear()}-01-01`;
}

/** YYYY-MM-DD del último día del año de `d`. */
export function ultimoDiaDeAnio(d: Date): string {
  return `${d.getFullYear()}-12-31`;
}

/** Avanza/retrocede un mes desde una fecha ISO, devuelve el 1ro del mes resultado. */
export function navegarMes(iso: string, delta: -1 | 1): string {
  const d = new Date(iso + 'T12:00:00');
  d.setMonth(d.getMonth() + delta);
  return primerDiaDeMes(d);
}

/** Avanza/retrocede un trimestre desde una fecha ISO, devuelve el 1ro del trimestre. */
export function navegarTrimestre(iso: string, delta: -1 | 1): string {
  const d = new Date(iso + 'T12:00:00');
  d.setMonth(d.getMonth() + delta * 3);
  return primerDiaDeTrimestre(d);
}

/** Avanza/retrocede un año desde una fecha ISO, devuelve el 1ro del año. */
export function navegarAnio(iso: string, delta: -1 | 1): string {
  const d = new Date(iso + 'T12:00:00');
  d.setFullYear(d.getFullYear() + delta);
  return primerDiaDeAnio(d);
}

/** Etiqueta legible del período para el header. */
export function labelPeriodo(cursor: string, periodo: Periodo): string {
  const d = new Date(cursor + 'T12:00:00');
  switch (periodo) {
    case 'semana':
      return rangoSemana(lunesDeLaSemana(d), domingoDeLaSemana(d));
    case 'mes':
      return new Intl.DateTimeFormat('es-MX', { month: 'long', year: 'numeric' }).format(d);
    case 'trimestre': {
      const tr = Math.floor(d.getMonth() / 3) + 1;
      return `Trim. ${tr} · ${d.getFullYear()}`;
    }
    case 'anio':
      return String(d.getFullYear());
  }
}

/** Inicio/fin (YYYY-MM-DD) del período. */
export function rangoDePeriodo(cursor: string, periodo: Periodo): { inicio: string; fin: string } {
  const d = new Date(cursor + 'T12:00:00');
  switch (periodo) {
    case 'semana':
      return { inicio: lunesDeLaSemana(d), fin: domingoDeLaSemana(d) };
    case 'mes':
      return { inicio: primerDiaDeMes(d), fin: ultimoDiaDeMes(d) };
    case 'trimestre':
      return { inicio: primerDiaDeTrimestre(d), fin: ultimoDiaDeTrimestre(d) };
    case 'anio':
      return { inicio: primerDiaDeAnio(d), fin: ultimoDiaDeAnio(d) };
  }
}

/** Mueve el cursor al período anterior/siguiente. */
export function navegarPeriodo(cursor: string, periodo: Periodo, delta: -1 | 1): string {
  switch (periodo) {
    case 'semana':   return sumarDias(cursor, 7 * delta);
    case 'mes':      return navegarMes(cursor, delta);
    case 'trimestre': return navegarTrimestre(cursor, delta);
    case 'anio':     return navegarAnio(cursor, delta);
  }
}

/** Cursor normalizado al inicio del período (para comparar "es el período actual"). */
export function cursoreActual(periodo: Periodo): string {
  const now = new Date();
  switch (periodo) {
    case 'semana':    return lunesDeLaSemana(now);
    case 'mes':       return primerDiaDeMes(now);
    case 'trimestre': return primerDiaDeTrimestre(now);
    case 'anio':      return primerDiaDeAnio(now);
  }
}
