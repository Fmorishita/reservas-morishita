/**
 * OCR de tickets usando Tesseract.js (corre 100% en el browser, sin API key).
 * Extrae monto total, proveedor, descripción y fecha del ticket.
 */

import { createWorker } from "tesseract.js";

export interface DatosTicket {
  monto: number | null;
  proveedor: string | null;
  descripcion: string | null;
  fecha: string | null;
}

/* ─── Patrones para el MONTO TOTAL ─── */
const PATRONES_TOTAL = [
  /total\s*a?\s*pagar[\s:$]*([0-9,]+\.?[0-9]{0,2})/i,
  /total[\s:$]+([0-9,]+\.[0-9]{2})/i,
  /importe\s*total[\s:$]*([0-9,]+\.?[0-9]{0,2})/i,
  /gran\s*total[\s:$]*([0-9,]+\.?[0-9]{0,2})/i,
  /\btotal\b[^\n]*\$?\s*([0-9,]+\.[0-9]{2})/i,
  /\$\s*([0-9,]+\.[0-9]{2})\s*$/im,
];

/* ─── Palabras que indican que una línea NO es el nombre del negocio ─── */
const RUIDO = [
  /folio/i, /venta/i, /ticket/i, /fecha/i, /hora/i, /RFC/i,
  /calle/i, /col\./i, /colonia/i, /tel[eé]fono/i, /tel\./i,
  /subtotal/i, /total/i, /iva/i, /descuento/i, /cambio/i, /pago/i,
  /efectivo/i, /tarjeta/i, /gracias/i, /bienvenid/i, /recibo/i,
  /comprobante/i, /descripci[oó]n/i, /precio/i, /cantidad/i,
  /cajero/i, /caja/i, /sucursal/i, /atendi/i, /vendedor/i,
  /^\[/, /^CTD/i, /^#/, /^\d+[-–]\d+/, /www\./i, /\.com/i,
];

/* ─── Patrones de fecha ─── */
const PATRONES_FECHA: Array<{ re: RegExp; fmt: (m: RegExpMatchArray) => string }> = [
  {
    re: /(\d{2})[\/\-](\d{2})[\/\-](\d{4})/,
    fmt: (m) => `${m[3]}-${m[2]}-${m[1]}`,        // DD/MM/YYYY
  },
  {
    re: /(\d{4})[\/\-](\d{2})[\/\-](\d{2})/,
    fmt: (m) => `${m[1]}-${m[2]}-${m[3]}`,        // YYYY-MM-DD
  },
  {
    re: /(\d{2})[\/\-](\d{2})[\/\-](\d{2})/,
    fmt: (m) => `20${m[3]}-${m[2]}-${m[1]}`,      // DD/MM/YY
  },
];

/* ─── Helpers ─── */

function parsearMonto(raw: string): number | null {
  const n = parseFloat(raw.replace(/,/g, "").trim());
  return isNaN(n) || n <= 0 || n > 999_999 ? null : n;
}

function esRuido(linea: string): boolean {
  return RUIDO.some((r) => r.test(linea));
}

/**
 * Busca el nombre del negocio en el encabezado del ticket.
 *
 * Estrategia:
 * 1. Toma las primeras ~10 líneas (encabezado del ticket).
 * 2. Descarta líneas que sean ruido (folio, fecha, RFC, etc.).
 * 3. Prioriza líneas con solo letras/espacios (nombre limpio).
 * 4. Si no, toma la primera línea no-ruidosa restante.
 */
function extraerProveedor(texto: string): string | null {
  const lineas = texto
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  // Solo miramos el encabezado (primeras 10 líneas)
  const encabezado = lineas.slice(0, 10);

  // Candidatos: líneas sin ruido, longitud razonable, que no empiecen con dígito
  const candidatos = encabezado.filter(
    (l) =>
      l.length >= 3 &&
      l.length <= 50 &&
      !esRuido(l) &&
      !/^\d/.test(l),
  );

  if (candidatos.length === 0) return null;

  // Preferir líneas que sean solo texto (sin $, sin números solos)
  const soloTexto = candidatos.find((l) => /^[A-Za-záéíóúÁÉÍÓÚüÜñÑ\s&\-'.]+$/.test(l));
  if (soloTexto) return soloTexto;

  // Preferir líneas que parezcan nombre de tienda (mayúsculas, > 4 chars)
  const nombreTienda = candidatos.find((l) => /[A-ZÁÉÍÓÚ]{3,}/.test(l) && !esRuido(l));
  if (nombreTienda) return nombreTienda;

  return candidatos[0];
}

/**
 * Extrae la descripción del ticket: primer ítem comprable que aparezca.
 * Busca líneas que contengan un precio ($XX.XX) seguido de un texto producto.
 */
function extraerDescripcion(texto: string): string | null {
  const lineas = texto.split("\n").map((l) => l.trim()).filter(Boolean);

  for (const linea of lineas) {
    // Línea de ítem: texto + precio, ej "GALLETAS BISCOFF LOTUS 250 $128.95"
    const matchItem = linea.match(/^([A-Z][A-Z\s0-9\-]+?)\s+\$?[0-9,]+\.[0-9]{2}/);
    if (matchItem && matchItem[1].trim().length > 3 && !esRuido(matchItem[1])) {
      // Capitalizar
      return matchItem[1]
        .trim()
        .toLowerCase()
        .replace(/\b\w/g, (c) => c.toUpperCase());
    }
  }
  return null;
}

function extraerFecha(texto: string): string | null {
  for (const { re, fmt } of PATRONES_FECHA) {
    const m = texto.match(re);
    if (m) {
      const fecha = fmt(m);
      // Validar que sea una fecha coherente (año entre 2020-2030)
      const anio = parseInt(fecha.slice(0, 4));
      if (anio >= 2020 && anio <= 2030) return fecha;
    }
  }
  return null;
}

/* ─── API pública ─── */

/**
 * Corre OCR sobre una imagen de ticket y extrae los datos relevantes.
 * @param imagen  File o Blob con la foto del ticket
 * @param onProgress  Callback de progreso 0–100
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

    /* Monto */
    let monto: number | null = null;
    for (const pat of PATRONES_TOTAL) {
      const match = text.match(pat);
      if (match) {
        monto = parsearMonto(match[1]);
        if (monto) break;
      }
    }

    /* Proveedor */
    const proveedor = extraerProveedor(text);

    /* Descripción (primer ítem del ticket) */
    const descripcion = extraerDescripcion(text);

    /* Fecha */
    const fecha = extraerFecha(text);

    return { monto, proveedor, descripcion, fecha };
  } finally {
    await worker.terminate();
  }
}
