/**
 * OCR de tickets usando Tesseract.js (corre 100% en el browser, sin API key).
 * Extrae monto total y proveedor del ticket.
 */

import { createWorker } from "tesseract.js";

export interface DatosTicket {
  monto: number | null;
  proveedor: string | null;
  descripcion: string | null;
  fecha: string | null;
}

/** Patrones para detectar el monto total en tickets mexicanos */
const PATRONES_TOTAL = [
  /total\s*a?\s*pagar[\s:$]*([0-9,]+\.?[0-9]{0,2})/i,
  /total[\s:$]*([0-9,]+\.?[0-9]{0,2})/i,
  /importe\s*total[\s:$]*([0-9,]+\.?[0-9]{0,2})/i,
  /gran\s*total[\s:$]*([0-9,]+\.?[0-9]{0,2})/i,
  /\btotal\b.*?([0-9]+[,.]?[0-9]{0,3}[.,][0-9]{2})/i,
  /\$\s*([0-9,]+\.[0-9]{2})\s*$/im,
];

/** Patrones de fecha */
const PATRONES_FECHA = [
  /(\d{2})[\/-](\d{2})[\/-](\d{4})/,   // DD/MM/YYYY
  /(\d{4})[\/-](\d{2})[\/-](\d{2})/,   // YYYY-MM-DD
  /(\d{2})[\/-](\d{2})[\/-](\d{2})/,   // DD/MM/YY
];

/** Limpia y convierte un string de monto a número */
function parsearMonto(raw: string): number | null {
  const limpio = raw.replace(/,/g, "").trim();
  const n = parseFloat(limpio);
  return isNaN(n) || n <= 0 || n > 999_999 ? null : n;
}

/** Extrae la primera línea no vacía del texto como posible proveedor */
function extraerProveedor(texto: string): string | null {
  const lineas = texto
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 2 && l.length < 60 && !/^\d/.test(l));
  return lineas[0] ?? null;
}

/** Extrae fecha en formato YYYY-MM-DD */
function extraerFecha(texto: string): string | null {
  for (const pat of PATRONES_FECHA) {
    const m = texto.match(pat);
    if (!m) continue;
    // Intentar normalizar a YYYY-MM-DD
    if (pat.source.startsWith("(\\d{4})")) {
      return `${m[1]}-${m[2]}-${m[3]}`;
    } else if (pat.source.startsWith("(\\d{2})[\\/-](\\d{2})[\\/-](\\d{4})")) {
      return `${m[3]}-${m[2]}-${m[1]}`;
    } else {
      // DD/MM/YY → asume 20YY
      const anio = parseInt(m[3]) + 2000;
      return `${anio}-${m[2]}-${m[1]}`;
    }
  }
  return null;
}

/**
 * Corre OCR en una imagen (File o Blob) y devuelve los datos extraídos del ticket.
 * @param imagen Archivo de imagen del ticket
 * @param onProgress Callback de progreso 0-100
 */
export async function leerTicket(
  imagen: File | Blob,
  onProgress?: (pct: number) => void,
): Promise<DatosTicket> {
  const worker = await createWorker("spa", 1, {
    logger: (m) => {
      if (m.status === "recognizing text" && onProgress) {
        onProgress(Math.round(m.progress * 100));
      }
    },
  });

  try {
    const {
      data: { text },
    } = await worker.recognize(imagen);

    // Buscar monto
    let monto: number | null = null;
    for (const pat of PATRONES_TOTAL) {
      const match = text.match(pat);
      if (match) {
        monto = parsearMonto(match[1]);
        if (monto) break;
      }
    }

    const proveedor = extraerProveedor(text);
    const fecha = extraerFecha(text);

    // Descripción: primera línea larga que parezca un ítem
    const descripcion: string | null = null;

    return { monto, proveedor, descripcion, fecha };
  } finally {
    await worker.terminate();
  }
}
