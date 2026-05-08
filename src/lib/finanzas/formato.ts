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
